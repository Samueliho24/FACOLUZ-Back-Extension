import { query, execute, transaction, withTransaction } from "../dbConnection.ts"
import { totalizePayments, invoiceBalance, appliedAmount, round2 } from "../functions/totalizePayments.ts";
import * as t from "../interfaces.ts"
import { getPaymentsByInvoice } from "./payments.ts";
import { studentExist } from "./students.ts";

//Obtener el ID de la siguiente factura a emitir (probar si este enfoque funciona correctamente)
export async function getIdInvoice(){
    const res = await query('SELECT AUTO_INCREMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [Deno.env.get("BDD_DATABASE"), 'invoices'])
    return res
}

//Obtener facturas por ID de paciente
export async function getInvoicesById(studentId: string, page: number){	
    const res = await query(`
        SELECT 
            i.id,
            i.chargedAmount,
            i.exchangeRate,
            i.date,
            i.status,
            i.comments,
            s.name,
            s.lastname,
            s.studentsIdentification
        FROM invoices i JOIN students s
        ON i.StudentIdentification = s.studentsIdentification
        WHERE i.StudentIdentification = ?
        ORDER BY date DESC
        LIMIT 10 OFFSET ?
    `, [ studentId, (page-1)*10])
    return res	
}

export async function getAllinvoices(page: number){	
    const res = await query(`
        SELECT 
            i.id,
            i.chargedAmount,
            i.exchangeRate,
            i.date,
            i.status,
            i.comments,
            s.name,
            s.lastname,
            s.studentsIdentification
        FROM invoices i JOIN students s
        ON i.StudentIdentification = s.studentsIdentification
        ORDER BY i.date DESC
        LIMIT 10 OFFSET ?
    `, [(page-1)*10])
    return res	
}

export async function getinvoicesVerification(page: number){	
    const res = await query(`
        SELECT * FROM invoices WHERE status = 'Pendiente'
        ORDER BY date DESC
        LIMIT 10 OFFSET ?
    `, [(page-1)*10])
    return res	
}
//Obtener facturas por verificar y por ID de paciente
export async function getinvoicesVerificationById(patientId: string, page: number){	
    const res = await query(`
        SELECT * FROM invoices
        WHERE patientId = ? AND status = 'Pendiente'
        ORDER BY date DESC
        LIMIT 10 OFFSET ?
    `, [ patientId, (page-1)*10])
    return res	
}
//Verificar estado de la factura
export async function verifyInvoice(idParam: number, status: string,){
    const res = await execute(`
        UPDATE invoices 
        SET status = ?
        WHERE id = ?	
    `, [status, idParam])
    return res
}

export async function issueInvoice(data: t.invoiceData){
    const {studentIdentification, billableid, quantity, chargedAmount, comment, exchangeRate, issuedBy } = data
    if (await studentExist(studentIdentification)){
        const _res = await execute(`
            INSERT INTO invoices(
                StudentIdentification,
                billableid,
                quantity,
                chargedAmount,
                comments,
                exchangeRate,
                issuedBy
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            studentIdentification,
            billableid,
            quantity,
            chargedAmount,
            comment,
            exchangeRate,
            issuedBy ?? null
        ])
        return true
    }else{
        return false
    }
}

/**
 * Estado y saldo de una factura.
 *
 * `makePayment` y `cancelInvoice` la necesitan para no operar sobre una factura
 * anulada ni sobre un saldo ya saldado.
 */
export async function getInvoiceById(invoiceId: string) {
    const res = await query(`
        SELECT id, status, chargedAmount, quantity, exchangeRate, StudentIdentification, billableid, comments, date
        FROM invoices
        WHERE id = ?
    `, [invoiceId])
    return res[0] || null
}

/**
 * Detalle de una factura para la pantalla de cobro: la factura, el estudiante, el
 * concepto, los pagos y el saldo.
 *
 * El saldo sale de `totalizePayments`, que es la unica fuente autorizada. El
 * cliente NO lo recalcula: antes lo hacia sumando `paidAmount` y se comia dos
 * errores (ignoraba `returnedAmount` y contaba la exoneracion como dinero), asi
 * que la caja veia un saldo y el servidor aceptaba otro.
 */
export async function getInvoiceDetail(invoiceId: string) {
    const invoices = await query(`
        SELECT
            i.id,
            i.chargedAmount,
            i.exchangeRate,
            i.date,
            i.status,
            i.comments,
            i.quantity,
            i.StudentIdentification,
            b.name  AS billableName,
            b.price AS unitPrice,
            s.name,
            s.lastname
        FROM invoices i
        JOIN billables b ON b.id = i.billableid
        JOIN students  s ON s.studentsIdentification = i.StudentIdentification
        WHERE i.id = ?
    `, [invoiceId])

    if (invoices.length === 0) return null
    const invoice = invoices[0]

    const payments = await query(`
        SELECT
            id,
            date,
            paidAmount,
            returnedAmount,
            receivedPaymentMethod,
            returnedPaymentMethod,
            exchangeRate,
            reference,
            returnReference,
            comments
        FROM payments
        WHERE invoiceId = ?
        ORDER BY date ASC, id ASC
    `, [invoiceId])

    // Lo mismo que ve la caja, calculado con la misma regla que aplica el cobro.
    const totalPaid = totalizePayments(payments)
    let balance = invoiceBalance(invoice.chargedAmount, payments)

    // Una factura ANULADA no tiene saldo pendiente, aunque el calculo diga que si.
    //
    // Al anular se escriben los reversos, asi que `totalPaid` queda en 0 y el
    // saldo sale como `chargedAmount - 0` = el total de la factura. Eso que
    // arriba parece "debe 15" es la respuesta a otra pregunta: lo que se DEBIO
    // y se devolvio. La pregunta que hace la pantalla es "¿cuanto falta
    // cobrar?", y ahi la respuesta es cero: la factura esta anulada y
    // `makePayment` la rechaza por estado.
    //
    // Sin esto, la caja veia "saldo pendiente $15" en una factura anulada,
    // intentaba cobrar, y el servidor le contestaba "una factura anulada no
    // admite pagos". No era un error de calculo sino de pregunta.
    if (invoice.status === 'Anulada') balance = 0

    return {
        ...invoice,
        payments,
        totalPaid,
        balance,
    }
}

export async function getCurrentDayInvoices(page: number){
    const res = await query(`
        SELECT 
            i.id,
            i.billableItem,
            i.currency,
            i.reference,
            i.payerId,
            i.date,
            p.name,
        FROM invoices i JOIN payer p ON	i.payerId = p.id
        ORDER BY i.date DESC
        LIMIT 10 OFFSET ?
    `, [(page - 1) * 10])
    return res
}

export async function getInvoicesByPayer(page: number, identification: number){
	const res = await query(`
		SELECT 
			i.id,
			i.billableItem,
			i.currency,
			i.reference,
			i.payerId,
			i.date,
			p.name,
		FROM invoices i JOIN payer p ON	i.payerId = p.id
		WHERE i.payerId = ?
		ORDER BY i.date DESC
		LIMIT 10 OFFSET ?	
	`, [identification, ((page-1)*10)])
	return res
}

/**
 * Anula una factura y devuelve lo que se le cobro.
 *
 * T7. ANTES, esta funcion:
 *
 *  1. Leia la factura FUERA de la transaccion y despues abria una. Dos personas
 *     anulando a la vez leian las dos `Pendiente` y las dos insertaban devolucion
 *     sobre la misma factura: la caja entregaba el dinero dos veces. Es el mismo
 *     TOCTOU que se corrigio en el cobro (T4), aqui sin corregir.
 *
 *  2. Usaba `transaction(queries, params)`, que solo encadena escrituras. No
 *     habia ni un `FOR UPDATE`, asi que la lectura que decidia si anular no
 *     estaba protegida.
 *
 *  3. Pedia la tasa del dia a `ve.dolarapi.com` para la devolucion. Ademas de
 *     depender de un tercero en una operacion irreversible, fijaba la tasa de
 *     la devolucion al valor de HOY y no al de cuando se cobro. La devolucion
 *     ahora replica la tasa del pago que se devuelve: se devuelve lo que se
 *     recibio, al valor en que se recibio.
 *
 *  4. Metia `returnedPaymentMethod = 'Dolares'` fijo. Se puede pagar en
 *     bolivares y eso hacia que el reporte de pagos siempre BOOKARA la
 *     devolucion como dolares, sin importar como ento el dinero.
 *
 *  5. No guardaba quien anulo, ni cuando, ni por que. Con dos personas en caja
 *     no habia forma de reconstruir una anulacion.
 *
 * Ahora la devolucion es una fila por pago, replicando su metodo y su tasa, y
 * todo ocurre dentro de la transaccion con la factura en `FOR UPDATE`.
 *
 * El `status = 'Anulada'` sigue siendo lo que hace la anulacion irreversible:
 * el `SELECT ... FOR UPDATE` serializa a los que intenten anular a la vez, y el
 * segundo ve `Anulada` y sale.
 */
export async function cancelInvoice(invoiceId: string, userId: number | null, reason: string){
    return await withTransaction(async (conn) => {
        // OJO: `conn.query()` devuelve el arreglo de filas DIRECTO, no
        // `[rows, fields]`. Desestructurar `const [rows] = await conn.query(...)`
        // saca la PRIMERA FILA, y despues `rows[0]` es `undefined`: la factura
        // pareceria no existir siempre. Mismo contrato que `query()`.
        const invoices: any = await conn.query(
            `SELECT id, status, chargedAmount FROM invoices WHERE id = ? FOR UPDATE`,
            [invoiceId]
        )
        const invoice: any = invoices[0]
        if (!invoice) throw new Error('La factura no existe')

        // Con FOR UPDATE este chequeo ya es correcto: nadie mas puede estar
        // anulando esta factura mientras lo sostenemos.
        if (invoice.status === 'Anulada') throw new Error('La factura ya se encuentra anulada')

        const payments: any[] = await conn.query(
            `SELECT id, paidAmount, returnedAmount, receivedPaymentMethod, exchangeRate, comments
             FROM payments
             WHERE invoiceId = ?
             ORDER BY date ASC, id ASC
             FOR UPDATE`,
            [invoiceId]
        )

        // Lo que de verdad entro por caja, con la misma regla que aplica el
        // cobro. No se re-suma `paidAmount` a mano: eso ya fue un bug (T1).
        const aDevolver = round2(totalizePayments(payments))

        // Una devolucion por pago, no una sola por factura. Se replican metodo y
        // tasa de cada pago para que el reporte de pagos atribuya la salida al
        // mismo canal por donde ento.
        //
        // Las filas exoneradas se saltan: no entró dinero por ellas, asi que no
        // hay nada que devolver. El filtro es explicito (`appliedAmount` ya las
        // excluye del total) para que el motivo quede a la vista.
        const reversos = payments.filter((p) => appliedAmount(p) > 0)

        for (const pago of reversos){
            const importe = round2(appliedAmount(pago))
            await conn.query(
                `INSERT INTO payments(
                    invoiceId,
                    receivedPaymentMethod,
                    returnedPaymentMethod,
                    paidAmount,
                    returnedAmount,
                    exchangeRate,
                    comments
                ) VALUES (?, ?, ?, 0, ?, ?, ?)`,
                [
                    invoiceId,
                    // Sin metodo de ENTRADA: esta fila no es un pago, es una salida.
                    null,
                    pago.receivedPaymentMethod,
                    importe,
                    // Se devuelve al valor en que se recibio, no al de hoy.
                    pago.exchangeRate,
                    `Devolucion por anulacion${reason ? ` - ${reason}` : ''}`
                ]
            )
        }

        await conn.query(
            `UPDATE invoices
             SET status = 'Anulada',
                 cancelledAt = NOW(),
                 cancelledBy = ?,
                 cancelledReason = ?
             WHERE id = ?`,
            [userId ?? null, reason, invoiceId]
        )

        return { refunded: aDevolver, reversals: reversos.length }
    })
}