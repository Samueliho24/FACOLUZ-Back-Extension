// Pruebas de functions/totalizePayments.ts
// Ejecutar:  deno test -A functions/totalizePayments_test.ts
//
// El saldo de una factura es la regla de dinero mas delicada del sistema:
// la caja cobra contra el, y una exoneracion mal contada produce devoluciones
// de plata que nunca entro. Cada prueba cubre una forma de equivocarse.

import { assert, assertEquals } from '@std/assert'
import {
	EXONERACION,
	appliedAmount,
	invoiceBalance,
	isFullyPaid,
	isPaymentWithinBalance,
	round2,
	totalizePayments,
} from './totalizePayments.ts'

/** Un pago en dinero, el caso normal. */
const pago = (
	paidAmount: number | string,
	returnedAmount: number | string | null = null,
	method = 'Efectivo',
) => ({ paidAmount, returnedAmount, receivedPaymentMethod: method })

/** Una exoneracion: no es dinero, pero salda la factura. */
const exoneracion = (justification = 'Decreto 1234') => ({
	paidAmount: 20,
	returnedAmount: null,
	receivedPaymentMethod: EXONERACION,
	justification,
})

// --- round2: redondeo estable sobre float -----------------------------------

Deno.test('round2 redondea a 2 decimales', () => {
	assertEquals(round2(10), 10)
	assertEquals(round2(10.005), 10.01)
	assertEquals(round2(33.333333), 33.33)
	assertEquals(round2(0.1 + 0.2), 0.3)
})

Deno.test('round2 trata un valor no numerico como 0', () => {
	assertEquals(round2(null), 0)
	assertEquals(round2(undefined), 0)
	assertEquals(round2(''), 0)
	assertEquals(round2('abc'), 0)
	assertEquals(round2(NaN), 0)
})

Deno.test('round2 interpreta un monto enviado como texto', () => {
	// El cliente manda '10.00'; Number() debe entenderlo igual.
	assertEquals(round2('10.00'), 10)
	assertEquals(round2('  7.5 '), 7.5)
})

// --- appliedAmount: cuanto aporta cada pago ---------------------------------

Deno.test('appliedAmount de un pago en dinero es lo pagado menos lo devuelto', () => {
	assertEquals(appliedAmount(pago(10)), 10)
	assertEquals(appliedAmount(pago(10, 2)), 8)
	assertEquals(appliedAmount(pago(10, 10)), 0)
})

Deno.test('appliedAmount de una exoneracion es 0', () => {
	// El bug de la version anterior: el ENUM guarda 'Exoneracion', no 4.
	assertEquals(appliedAmount(exoneracion()), 0)
	assertEquals(appliedAmount(pago(20, null, EXONERACION)), 0)
})

Deno.test('appliedAmount de una exoneracion con devolucion sigue siendo 0', () => {
	// Ni lo pagado ni lo devuelto tocan el saldo: no hay plata de por medio.
	assertEquals(appliedAmount(pago(20, 5, EXONERACION)), 0)
})

Deno.test('appliedAmount de un pago null es 0', () => {
	assertEquals(appliedAmount(null), 0)
	assertEquals(appliedAmount(undefined), 0)
})

// --- totalizePayments: suma de pagos ----------------------------------------

Deno.test('totalizePayments de una lista vacia es 0', () => {
	assertEquals(totalizePayments([]), 0)
	assertEquals(totalizePayments(null), 0)
	assertEquals(totalizePayments(undefined), 0)
})

Deno.test('totalizePayments suma varios pagos en dinero', () => {
	const lista = [pago(10), pago(5, null, 'Transferencia'), pago(2.5)]
	assertEquals(totalizePayments(lista), 17.5)
})

Deno.test('totalizePayments descuenta el cambio de cada pago', () => {
	// Paga 10 y se le devuelven 3: la factura bajo 7, no 10.
	assertEquals(totalizePayments([pago(10, 3)]), 7)
	assertEquals(totalizePayments([pago(10, 3), pago(4)]), 11)
})

Deno.test('totalizePayments ignora las exoneraciones', () => {
	assertEquals(totalizePayments([exoneracion()]), 0)
	assertEquals(totalizePayments([exoneracion(), pago(10)]), 10)
	assertEquals(totalizePayments([pago(10), exoneracion()]), 10)
})

Deno.test('totalizePayments no acumula error de float', () => {
	// Tres tercios en float no da 10 exacto; el saldo tiene que dar 0.
	const lista = [pago(3.33), pago(3.33), pago(3.34)]
	assertEquals(totalizePayments(lista), 10)
})

Deno.test('totalizePayments acepta montos enviados como texto', () => {
	assertEquals(totalizePayments([pago('10.00'), pago('2.50')]), 12.5)
})

Deno.test('totalizePayments de un pago totalmente devuelto aporta 0', () => {
	// Pago 10, devuelvo 10: la factura no bajo nada. Con datos validos
	// (0 <= returnedAmount <= paidAmount) la suma nunca puede dar negativo.
	assertEquals(totalizePayments([pago(10, 10)]), 0)
	assertEquals(totalizePayments([pago(10, 10), pago(2)]), 2)
	assert(totalizePayments([pago(10, 10), pago(2)]) >= 0)
})

// --- invoiceBalance: saldo pendiente ----------------------------------------

Deno.test('invoiceBalance sin pagos es el total de la factura', () => {
	assertEquals(invoiceBalance(20, []), 20)
	assertEquals(invoiceBalance(33.33, null), 33.33)
})

Deno.test('invoiceBalance descuenta lo pagado', () => {
	assertEquals(invoiceBalance(20, [pago(10)]), 10)
	assertEquals(invoiceBalance(20, [pago(10), pago(10)]), 0)
})

Deno.test('invoiceBalance descuenta el cambio', () => {
	assertEquals(invoiceBalance(20, [pago(20, 4.5)]), 4.5)
})

Deno.test('invoiceBalance de una exoneracion sigue siendo el total', () => {
	// ESTE es el test que hoy falla. La exoneracion salda la factura por regla de
	// negocio, pero no reduce el saldo: no entro dinero a la caja.
	assertEquals(invoiceBalance(20, [exoneracion()]), 20)
})

Deno.test('invoiceBalance con exoneracion y pago en dinero', () => {
	// Se exonera todo y despues se abona una parte en dinero.
	assertEquals(invoiceBalance(20, [exoneracion(), pago(7)]), 13)
})

Deno.test('invoiceBalance nunca es negativo', () => {
	// Cobrar de mas no genera saldo negativo: no hay que cobrarle al cliente.
	assertEquals(invoiceBalance(20, [pago(20), pago(5)]), 0)
	assertEquals(invoiceBalance(10, [pago(20)]), 0)
})

Deno.test('invoiceBalance con float sucio no deja residuo', () => {
	// 33.33 - 16.67 - 16.66 tiene que dar 0 exacto, no 0.0000001.
	assertEquals(invoiceBalance(33.33, [pago(16.67), pago(16.66)]), 0)
})

// --- isFullyPaid: la factura quedo saldada -----------------------------------

Deno.test('isFullyPaid con el saldo en cero', () => {
	assert(isFullyPaid(20, [pago(20)]))
	assert(isFullyPaid(20, [pago(10), pago(10)]))
	assert(isFullyPaid(20, [pago(20, 5), pago(5)]))
})

Deno.test('isFullyPaid con saldo pendiente', () => {
	assert(!isFullyPaid(20, [pago(10)]))
	assert(!isFullyPaid(20, []))
})

Deno.test('isFullyPaid con un centavo de diferencia', () => {
	// El pago llego hasta 0.01. La tolerancia de un centavo lo da por saldada:
	// de lo contrario el ultimo abono de centavo seria imposible de registrar.
	assert(isFullyPaid(20, [pago(19.99)]))
	assert(isFullyPaid(20, [pago(20.01)]))
	assert(!isFullyPaid(20, [pago(19.98)]))
})

Deno.test('isFullyPaid de una factura exonerada', () => {
	// La ruta de cobro trata la exoneracion aparte; aca solo se verifica que la
	// funcion no la confunde con dinero.
	assert(!isFullyPaid(20, [exoneracion()]))
})

// --- isPaymentWithinBalance: el pago no puede pasar el saldo -----------------------

Deno.test('isPaymentWithinBalance acepta un pago que cabe', () => {
	assert(isPaymentWithinBalance(20, [], 20))
	assert(isPaymentWithinBalance(20, [pago(10)], 10))
	assert(isPaymentWithinBalance(20, [pago(10)], 9.99))
})

Deno.test('isPaymentWithinBalance tolera un centavo de exceso', () => {
	// El redondeo de float a 2 decimales puede empujar un centavo.
	assert(isPaymentWithinBalance(20, [pago(10)], 10.01))
})

Deno.test('isPaymentWithinBalance rechaza un pago que excede el saldo', () => {
	assert(!isPaymentWithinBalance(20, [pago(10)], 10.02))
	assert(!isPaymentWithinBalance(20, [], 21))
})

Deno.test('isPaymentWithinBalance sobre una factura ya saldada', () => {
	// Un nuevo pago sobre una factura pagada no cabe en el saldo. Un centavo
	// todavia entra, por la misma tolerancia que usa isFullyPaid.
	assert(!isPaymentWithinBalance(20, [pago(20)], 0.02))
	assert(isPaymentWithinBalance(20, [pago(20)], 0.01))
})
