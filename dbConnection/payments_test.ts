// ============================================================================
//  Prueba de integracion del cobro: T4 del P0.
//
//  Corre CONTRA UNA MARIADB REAL. No simula nada: usa el mismo `makePayment`,
//  el mismo `withTransaction` y el mismo `SELECT ... FOR UPDATE` que la API.
//
//  Crea una base de prueba propia, la puebla y la destruye. La base de
//  desarrollo no se toca.
//
//  COMO CORRER. El pool de dbConnection.ts se arma con BDD_DATABASE al importarse
//  este archivo, asi que la base de prueba tiene que existir ANTES de arrancar
//  Deno (una sola vez; el test se borra solo al terminar):
//
//    cd Back/FACOLUZ-Back-Extension
//    C:\xampp\mysql\bin\mysql.exe -u root -e "CREATE DATABASE IF NOT EXISTS p0_pagos_test"
//    $env:BDD_DATABASE="p0_pagos_test"; $env:BDD_REAL_DB="faco_luz_extension"
//    deno test -A --no-check dbConnection/payments_test.ts
//
//  El esquema sale de la base real con CREATE TABLE ... LIKE, asi que las
//  columnas y los CHECK son los de verdad: si el CHECK del saldo se rompe, esta
//  prueba lo detecta.
//
//  Que verifica:
//    1. Un pago parcial deja la factura en Pendiente con el saldo correcto.
//    2. El pago que cierra la factura la marca Pagado.
//    3. Sobrepagar se rechaza por saldo y no se escribe nada.
//    4. Una factura ya Pagada se rechaza por ESTADO (no por saldo).
//    5. Una factura Anulada se rechaza.
//    6. La devolucion no puede superar lo pagado.
//    7. La exoneracion se guarda con paidAmount = 0, cierra la factura y NO
//       suma al total cobrado.
//    8. Una exoneracion sin observacion se rechaza.
//    9. Dos cobros CONCURRENTES: uno entra y el otro se rechaza. Esta es la
//       prueba del FOR UPDATE.
// ============================================================================

import { assert, assertEquals } from '@std/assert'
import { withTransaction } from '../dbConnection.ts'
import { EXONERACION, totalizePayments } from '../functions/totalizePayments.ts'
import { getPaymentsByInvoice, makePayment, PaymentError } from './payments.ts'
import type * as t from '../interfaces.ts'

const TEST_DB = 'p0_pagos_test'

/** Conexion suelta a la base de pruebas, para crearla y borrarla. */
async function admin() {
	const { default: mariadb } = await import('npm:mariadb')
	return await mariadb.createConnection({
		host: Deno.env.get('BDD_HOST'),
		user: Deno.env.get('BDD_USER'),
		password: Deno.env.get('BDD_PASSWORD'),
		port: Number(Deno.env.get('BDD_PORT')),
	})
}

/**
 * Crea las tablas de la prueba copiando el esquema de la base real.
 * `CREATE TABLE ... LIKE` NO copia las claves foraneas, asi que las tablas de la
 * base real no se ven afectadas.
 *
 * La base `p0_pagos_test` tiene que existir antes de arrancar Deno (ver la
 * cabecera): el pool de dbConnection.ts se abre al importarse este archivo.
 */
async function crearBaseDePrueba() {
	const conn = await admin()
	for (const tabla of ['invoices', 'payments', 'billables', 'students', 'enrollments']) {
		await conn.query(`DROP TABLE IF EXISTS ${TEST_DB}.${tabla}`)
		await conn.query(
			`CREATE TABLE ${TEST_DB}.${tabla} LIKE ${Deno.env.get('BDD_REAL_DB')}.${tabla}`,
		)
	}
	await conn.query(
		`INSERT INTO ${TEST_DB}.billables SELECT * FROM ${Deno.env.get('BDD_REAL_DB')}.billables`,
	)
	await conn.query(
		`INSERT INTO ${TEST_DB}.students SELECT * FROM ${Deno.env.get('BDD_REAL_DB')}.students LIMIT 1`,
	)
	await conn.end()
}

async function borrarBaseDePrueba() {
	const conn = await admin()
	for (const tabla of ['invoices', 'payments', 'billables', 'students', 'enrollments']) {
		await conn.query(`DROP TABLE IF EXISTS ${TEST_DB}.${tabla}`)
	}
	await conn.end()
}

/**
 * Una factura nueva de `total` dolares para el primer estudiante de la prueba.
 *
 * El id se genera aca y no en la base: `invoices.id` es `uuid DEFAULT uuid()`,
 * sin AUTO_INCREMENT, asi que el driver no devuelve `insertId` (viene en 0).
 */
async function factura(total: number): Promise<string> {
	const id = crypto.randomUUID()
	await withTransaction(async (conn) => {
		await conn.execute(`
            INSERT INTO invoices(id, billableid, chargedAmount, exchangeRate, StudentIdentification, quantity)
            SELECT ?, id, ?, 36.50, studentsIdentification, 1 FROM students LIMIT 1
        `, [id, total])
	})
	const creada = await withTransaction(async (conn) => conn.query(`SELECT id FROM invoices WHERE id = ?`, [id]))
	assertEquals(creada.length, 1, 'no se pudo crear la factura de prueba')
	return id
}

const estado = (invoiceId: string) =>
	withTransaction(async (conn) => {
		const r = await conn.query(`SELECT status FROM invoices WHERE id = ?`, [invoiceId])
		return r[0]?.status
	})

/** Ejecuta un pago esperando que falle, y devuelve el code del error. */
async function codeEsperado(pago: t.IPayment): Promise<string> {
	try {
		await makePayment(pago)
	} catch (e) {
		assert(e instanceof PaymentError, `no fue PaymentError: ${e}`)
		return e.code
	}
	return ''
}

const pagoDe = (invoiceId: string, paidAmount: number, extra: Partial<t.IPayment> = {}) => ({
	InvoiceId: invoiceId,
	paidAmount,
	receivedPaymentMethod: 'Efectivo',
	returnedAmount: 0,
	returnedPaymentMethod: null,
	exchangeRate: 36.5,
	...extra,
})

Deno.test('T4 cobro: transaccion, FOR UPDATE y exoneracion', async (t) => {
	if (Deno.env.get('BDD_DATABASE') !== TEST_DB) {
		throw new Error(
			`Este test necesita BDD_DATABASE=${TEST_DB} desde antes de arrancar Deno.\n` +
				`En PowerShell:\n` +
				`  $env:BDD_DATABASE="${TEST_DB}"; $env:BDD_REAL_DB="${Deno.env.get('BDD_DATABASE')}"; deno test -A --no-check dbConnection/payments_test.ts`,
		)
	}
	if (!Deno.env.get('BDD_REAL_DB')) {
		throw new Error('Falta BDD_REAL_DB: el nombre de la base de desarrollo (para copiar el esquema).')
	}

	await crearBaseDePrueba()
	try {
		await t.step('pago parcial: la factura queda Pendiente con el saldo correcto', async () => {
			const inv = await factura(20)
			const res = await makePayment(pagoDe(inv, 8))
			assertEquals(res.fullyPaid, false)
			assertEquals(res.totalPaid, 8)
			assertEquals(res.balance, 12)
			assertEquals(await estado(inv), 'Pendiente')
		})

		await t.step('el pago que cierra la factura la marca Pagado', async () => {
			const inv = await factura(20)
			await makePayment(pagoDe(inv, 8))
			const res = await makePayment(pagoDe(inv, 12))
			assertEquals(res.fullyPaid, true)
			assertEquals(res.balance, 0)
			assertEquals(res.totalPaid, 20)
			assertEquals(await estado(inv), 'Pagado')
		})

		await t.step('sobrepagar se rechaza y no se escribe nada', async () => {
			const inv = await factura(20)
			await makePayment(pagoDe(inv, 8)) // saldo 12.00
			const antes = (await getPaymentsByInvoice(inv)).length

			assertEquals(await codeEsperado(pagoDe(inv, 12.02)), 'EXCEEDS_BALANCE')
			assertEquals((await getPaymentsByInvoice(inv)).length, antes, 'el rechazo dejo un pago escrito')
			assertEquals(await estado(inv), 'Pendiente', 'el rechazo movio el estado de la factura')
		})

		await t.step('la tolerancia es de un centavo, ni mas ni menos', async () => {
			// Decision consciente, no un accidente: comparar float con igualdad
			// rechaza pagos legitimos por el error binario. El costo es que un
			// cobro puede exceder el saldo en 0.01 y la factura se cierra igual. Es
			// un centavo por cobro, acotado, y preferable a rechazar un pago real.
			// Si alguna vez se cambia MONEY_TOLERANCE, esta prueba hay que mirarla.
			const inv = await factura(20)
			await makePayment(pagoDe(inv, 8)) // saldo 12.00

			assertEquals(await codeEsperado(pagoDe(inv, 12.01)), '', '1 centavo de tolerancia deberia entrar')
			assertEquals(await estado(inv), 'Pagado')
		})

		await t.step('una factura Pagada se rechaza por ESTADO, no por saldo', async () => {
			// La factura Pagada tiene saldo 0, asi que el saldo ya la rechazaria.
			// Lo que se prueba es el status, que es lo unico que protege a una
			// factura EXONERADA (su saldo sigue en pie porque no entro dinero).
			const inv = await factura(20)
			await makePayment(pagoDe(inv, 20))
			assertEquals(await codeEsperado(pagoDe(inv, 1)), 'ALREADY_PAID')
		})

		await t.step('una factura Anulada no admite pagos', async () => {
			const inv = await factura(20)
			await withTransaction(async (c) =>
				c.execute(`UPDATE invoices SET status = 'Anulada' WHERE id = ?`, [inv])
			)
			assertEquals(await codeEsperado(pagoDe(inv, 1)), 'CANCELLED')
		})

		await t.step('la devolucion no puede superar lo pagado', async () => {
			const inv = await factura(20)
			assertEquals(
				await codeEsperado(pagoDe(inv, 10, { returnedAmount: 15, returnedPaymentMethod: 'Efectivo' })),
				'INVALID_RETURN',
			)
			// El CHECK de la base es la ultima linea de defensa: si el codigo se
			// saltara el techo, la MariaDB lo detiene.
			let dbBloqueo = false
			try {
				await withTransaction(async (c) =>
					c.execute(
						`INSERT INTO payments(invoiceId, paidAmount, returnedAmount, receivedPaymentMethod, exchangeRate) VALUES(?, 10, 15, 'Efectivo', 36.5)`,
						[inv],
					)
				)
			} catch {
				dbBloqueo = true
			}
			assert(dbBloqueo, 'el CHECK chk_payments_returned_le_paid no detuvo la devolucion mayor a lo pagado')
		})

		await t.step('la exoneracion es 0, cierra la factura y no suma al cobrado', async () => {
			const inv = await factura(50)
			const res = await makePayment(pagoDe(inv, 999, {
				receivedPaymentMethod: EXONERACION,
				returnedAmount: 999,
				returnedPaymentMethod: 'Efectivo',
				comments: 'Exonerado por decreto 1234, autorizado por Dr. Perez',
			}))

			assertEquals(res.fullyPaid, true)
			assertEquals(res.exonerated, true)
			// Lo importante: el total cobrado es 0, no 50. Una caja que sume esto
			// como ingreso esta reportando plata que nunca entro.
			assertEquals(res.totalPaid, 0)
			// Y el saldo sigue en pie, porque la exoneracion no es dinero.
			assertEquals(res.balance, 50)
			assertEquals(await estado(inv), 'Pagado')

			const pagos = await getPaymentsByInvoice(inv)
			assertEquals(pagos.length, 1)
			assertEquals(Number(pagos[0].paidAmount), 0)
			assertEquals(Number(pagos[0].returnedAmount), 0)
			assertEquals(pagos[0].returnedPaymentMethod, null)
			assertEquals(totalizePayments(pagos), 0)
		})

		await t.step('una exoneracion sin observacion se rechaza', async () => {
			const inv = await factura(30)
			for (const comments of [undefined, '', '   ', 'ok', 'corto']) {
				assertEquals(
					await codeEsperado(pagoDe(inv, 0, { receivedPaymentMethod: EXONERACION, comments })),
					'OBSERVATION_REQUIRED',
					`comments = ${JSON.stringify(comments)}`,
				)
			}
			assertEquals((await getPaymentsByInvoice(inv)).length, 0)
		})

		await t.step('dos cobros concurrentes: uno entra y el otro se rechaza', async () => {
			// Esta es la prueba que justifica el FOR UPDATE. La factura vale 20 y
			// cada cobro quiere 15: por separado los dos caben (15 < 20) pero juntos
			// son 30. Sin el bloqueo los dos leen saldo 20, los dos pasan y la
			// factura queda con 15 cobrados de mas.
			const inv = await factura(20)

			const resultados = await Promise.allSettled([
				makePayment(pagoDe(inv, 15)),
				makePayment(pagoDe(inv, 15)),
			])
			const ok = resultados.filter((r) => r.status === 'fulfilled')
			const errs = resultados.filter((r) => r.status === 'rejected')

			assertEquals(ok.length, 1, 'los dos cobros entraron a la vez: el FOR UPDATE no bloquea')
			assertEquals(errs.length, 1, 'no se rechazo ninguno de los dos cobros')
			const err = (errs[0] as PromiseRejectedResult).reason
			assert(err instanceof PaymentError)
			assertEquals(err.code, 'EXCEEDS_BALANCE')

			const pagos = await getPaymentsByInvoice(inv)
			assertEquals(pagos.length, 1, 'se escribieron dos pagos sobre la misma factura')
			assertEquals(totalizePayments(pagos), 15)
		})
	} finally {
		await borrarBaseDePrueba()
	}
})
