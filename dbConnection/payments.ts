import { query, withTransaction } from "../dbConnection.ts"
import {
	EXONERACION,
	invoiceBalance,
	isFullyPaid,
	round2,
	totalizePayments,
} from "../functions/totalizePayments.ts"
import * as t from "../interfaces.ts"
import type { PoolConnection } from 'npm:mariadb'

/**
 * Error de negocio del cobro. `code` decide el status HTTP que responde la ruta:
 * `NOT_FOUND` es 404, el resto 400. Nunca se manda a la caja el error crudo de
 * MariaDB.
 */
export class PaymentError extends Error {
	constructor(public code: string, message: string) {
		super(message)
		this.name = 'PaymentError'
	}
}

export const getPaymentsByInvoice = async (invoiceId: string) => {
	const res = await query(`
        SELECT * FROM payments WHERE invoiceId = ?
    `, [invoiceId])
	return res
}

/**
 * Registrar un pago y actualizar el estado de la factura, en UNA sola transaccion
 * y con la fila de la factura bloqueada.
 *
 * El `FOR UPDATE` es lo que impide el sobrepago. Sin el, dos cajeros que cobran a
 * la vez sobre la misma factura leen el mismo saldo, los dos pasan el chequeo y
 * los dos escriben: la factura queda con un abono mayor que su total.
 *
 * La validacion del saldo vivia en la ruta (`main.ts`), FUERA de la transaccion.
 * Eso es un TOCTOU clasico: entre el SELECT de la ruta y el INSERT de aqui hay
 * una ventana en la que otro cobro entra.
 */
export const makePayment = async (data: t.IPayment) => {
	return await withTransaction(async (conn) => {
		const invoices = await conn.query(`
            SELECT id, status, chargedAmount, StudentIdentification, billableid
            FROM invoices
            WHERE id = ?
            FOR UPDATE
        `, [data.InvoiceId])

		if (invoices.length === 0) {
			throw new PaymentError('NOT_FOUND', 'No se encontro la factura')
		}
		const invoice = invoices[0]

		if (invoice.status === 'Anulada') {
			throw new PaymentError('CANCELLED', 'No se puede pagar una factura anulada')
		}
		// El status cierra el cobro, no el saldo. Con la exoneracion excluida del
		// saldo (una exonerada tiene saldo = total), el saldo por si solo dejaria
		// cobrarle de nuevo a un estudiante que ya fue exonerado.
		if (invoice.status === 'Pagado') {
			throw new PaymentError('ALREADY_PAID', 'La factura ya se encuentra pagada')
		}

		const previous = await conn.query(`
            SELECT paidAmount, returnedAmount, receivedPaymentMethod
            FROM payments WHERE invoiceId = ?
        `, [data.InvoiceId])

		const balance = invoiceBalance(invoice.chargedAmount, previous)
		const isExoneration = data.receivedPaymentMethod === EXONERACION

		// Una exoneracion no es dinero: se registra con paidAmount = 0 y salda la
		// factura igual. El monto lo pone el servidor (el saldo que faltaba), no el
		// cliente.
		const paidAmount = isExoneration
			? 0
			: round2(Number(data.paidAmount))

		if (!isExoneration) {
			if (paidAmount <= 0) {
				throw new PaymentError('INVALID_AMOUNT', 'El monto a pagar debe ser mayor a 0')
			}
			if (paidAmount > balance + 0.01) {
				throw new PaymentError(
					'EXCEEDS_BALANCE',
					'El monto a pagar no puede superar el saldo de la factura',
				)
			}
			const returned = round2(Number(data.returnedAmount) || 0)
			if (returned < 0 || returned > paidAmount) {
				throw new PaymentError(
					'INVALID_RETURN',
					'El monto de devolucion debe estar entre 0 y el monto pagado',
				)
			}
		}

		// D4: la exoneracion se justifica en el MISMO campo de observacion, con el
		// motivo y quien autorizo. No hay columnas separadas: separar "motivo" de
		// "autorizador" produce un campo vacio y el dato real en el otro.
		if (isExoneration && String(data.comments ?? '').trim().length < 10) {
			throw new PaymentError(
				'OBSERVATION_REQUIRED',
				'La exoneracion requiere una observacion con el motivo y quien la autorizo',
			)
		}

		const returnedAmount = isExoneration ? 0 : round2(Number(data.returnedAmount) || 0)

		await conn.execute(`
            INSERT INTO payments(
                invoiceId,
                paidAmount,
                receivedPaymentMethod,
                returnedAmount,
                returnedPaymentMethod,
                exchangeRate,
                reference,
                returnReference,
                comments
            ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
			data.InvoiceId,
			paidAmount,
			data.receivedPaymentMethod,
			returnedAmount,
			isExoneration ? null : (data.returnedPaymentMethod ?? null),
			data.exchangeRate,
			data.reference ? data.reference : null,
			data.returnReference ? data.returnReference : null,
			data.comments ? data.comments : null,
		])

		// Releer con el pago nuevo ya dentro: la decision de estado se toma sobre el
		// saldo actualizado, nunca sobre el previo.
		const after = await conn.query(`
            SELECT paidAmount, returnedAmount, receivedPaymentMethod
            FROM payments WHERE invoiceId = ?
        `, [data.InvoiceId])

		const fullyPaid = isExoneration || isFullyPaid(invoice.chargedAmount, after)

		if (fullyPaid) {
			await conn.execute(`UPDATE invoices SET status = 'Pagado' WHERE id = ?`, [data.InvoiceId])
			// Antes se llamaba FUERA de la transaccion y sin await: el error se
			// perdia y las inscripciones no se actualizaban nunca a tiempo.
			await settleEnrollmentsForInvoice(conn, invoice)
		}

		// `totalPaid` es el dinero REALMENTE cobrado, y `balance` el saldo por esa
		// misma regla. Cuando la factura se cerro por exoneracion el saldo sigue
		// en pie a proposito: la exoneracion no es plata que entrou. Por eso la
		// respuesta trae `exonerated`, y el front tiene que decir "cerrada por
		// exoneracion", no "pagada". Confundir las dos cosas es como una caja
		// reporta un ingreso que no existe.
		return {
			invoiceId: data.InvoiceId,
			fullyPaid,
			exonerated: isExoneration,
			balance: invoiceBalance(invoice.chargedAmount, after),
			totalPaid: totalizePayments(after),
		}
	})
}

/**
 * Regla provisional del P0: al saldar una factura de tipo `Inscripcion`, se saldan
 * las inscripciones que el alumno tenga EN DEUDA.
 *
 * El esquema no tiene relacion factura<->inscripcion, asi que no se puede saber
 * cualesInscripciones pagaba esta factura. El filtro `status = 'Deuda'` evita el
 * bug OPEN de marcar como pagadas las que ya estaban saldadas, pero sigue
 * settling todas las pendientes del alumno. Se resuelve de raiz con
 * `invoices.enrollmentId` / `invoice_lines` (P1).
 */
async function settleEnrollmentsForInvoice(
	conn: PoolConnection,
	invoice: { billableid: string; StudentIdentification: number },
) {
	const billables = await conn.query(`SELECT name FROM billables WHERE id = ?`, [invoice.billableid])
	if (billables.length === 0 || billables[0].name !== 'Inscripcion') return

	// enrollments.studentId es el uuid de students, NO la cedula. La factura guarda
	// la cedula, asi que hay que resolverla.
	const students = await conn.query(`
        SELECT id FROM students WHERE studentsIdentification = ?
    `, [invoice.StudentIdentification])
	if (students.length === 0) return

	await conn.execute(`
        UPDATE enrollments SET status = 'Pagada'
        WHERE studentId = ? AND status = 'Deuda'
    `, [students[0].id])
}
