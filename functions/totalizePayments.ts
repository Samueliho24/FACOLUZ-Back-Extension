// ============================================================================
//  Saldo de una factura: fuente unica de verdad.
//
//  REGLA: el saldo pendiente de una factura es
//      chargedAmount - SUMA(pagos que aportan dinero)
//  donde un pago aporta `paidAmount - returnedAmount`, y una EXONERACION no
//  aporta nada porque no entro dinero.
//
//  Esta es la unica funcion autorizada para calcular el saldo. Ningun modulo
//  debe recalcularlo por su cuenta: si el cliente lo recalcula, la caja ve un
//  saldo y el sistema acepta otro.
//
//  Corrige el bug de la version anterior: comparaba el metodo de pago contra
//  el numero 4, cuando el ENUM de payments.receivedPaymentMethod guarda texto.
//  Una exoneracion nunca fue excluida, asi que se contaban como dinero
//  y `cancelInvoice` devolvia plata que nunca entro.
// ============================================================================

/** payments.receivedPaymentMethod: el ENUM guarda texto, no el indice del Select. */
export const EXONERACION = 'Exoneracion'

/** Forma minima de un pago para poder totalizarlo. */
export interface PaymentLike {
    paidAmount: number | string | null
    returnedAmount?: number | string | null
    receivedPaymentMethod: string | null
}

/** Tolerancia de un centavo: los montos son float y el error binario se acumula. */
export const MONEY_TOLERANCE = 0.01

/**
 * Redondeo a 2 decimales. El EPSILON corrige el caso 1.005, que sin el
 * redondea a 1.0 por representacion binaria. Un valor no numerico (null, '', NaN)
 * vale 0: un pago sin monto no suma ni resta.
 */
export function round2(value: number | string | null | undefined): number {
    const n = Number(value)
    if (!Number.isFinite(n)) return 0
    return Math.round((n + Number.EPSILON) * 100) / 100
}

/**
 * Cuanto aporta un pago al saldo de la factura.
 *
 * La exoneracion aporta 0 por completo: ni el pago ni su devolucion tocan el
 * saldo, porque ninguno de los dos es dinero.
 */
export function appliedAmount(payment: PaymentLike | null | undefined): number {
    if (!payment) return 0
    if (payment.receivedPaymentMethod === EXONERACION) return 0
    const paid = round2(payment.paidAmount)
    const returned = round2(payment.returnedAmount)
    return round2(paid - returned)
}

/**
 * Total ya cobrado de una factura, en la moneda de la factura (USD).
 * Un pago que se devuelve entero puede dejar este total en negativo: eso es
 * informacion real, no un error, y por eso aqui no se recorta en 0.
 */
export function totalizePayments(
    paymentsList: PaymentLike[] | null | undefined,
): number {
    let total = 0
    for (const payment of paymentsList ?? []) {
        total += appliedAmount(payment)
    }
    return round2(total)
}

/** Saldo que falta por cobrar. Nunca negativo: un saldo negativo no se cobra. */
export function invoiceBalance(
    chargedAmount: number | string,
    paymentsList: PaymentLike[] | null | undefined,
): number {
    return Math.max(0, round2(Number(chargedAmount) - totalizePayments(paymentsList)))
}

/** La factura esta saldada, con la tolerancia de un centavo del redondeo. */
export function isFullyPaid(
    chargedAmount: number | string,
    paymentsList: PaymentLike[] | null | undefined,
): boolean {
    return invoiceBalance(chargedAmount, paymentsList) <= MONEY_TOLERANCE
}

/**
 * Se puede aplicar un pago de `amount` a la factura. Aplica la tolerancia de un
 * centavo: comparar igualdad entre float es un bug latente.
 *
 * NO confundir con `isBalanceAllowed` de functions/validators.ts, que solo
 * compara dos numeros sueltos. Esta necesita la lista de pagos para poder
 * deducir el saldo, y por eso vive aqui.
 */
export function isPaymentWithinBalance(
    chargedAmount: number | string,
    paymentsList: PaymentLike[] | null | undefined,
    amount: number | string,
): boolean {
    const balance = invoiceBalance(chargedAmount, paymentsList)
    return round2(amount) <= round2(balance + MONEY_TOLERANCE)
}
