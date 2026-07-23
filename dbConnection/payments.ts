import { query, execute } from "../dbConnection.ts"
import { totalizePayments } from "../functions/totalizePayments.ts";
import * as t from "../interfaces.ts"

export const getPaymentsByInvoice = async(invoiceId: string) => {
    const res = await query(`
        SELECT * FROM payments WHERE invoiceId = ?
    `, [invoiceId])
    return res;
}

//Realizar el abono correspondiente y luego revisar si la deuda esta saldada
export const makePayment = async(data: t.IPayment) => {
    const _res0 = await execute(`
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
        Number(data.paidAmount).toFixed(2),
        data.receivedPaymentMethod,
        Number(data.returnedAmount).toFixed(2),
        data.returnedPaymentMethod,
        data.exchangeRate,
        (data.reference ? data.reference : null),
        (data.returnReference ? data.returnReference : null),
        (data.comments ? data.comments : null)
    ])

    const paymentsList = await query(`
        SELECT 
            paidAmount,
            returnedAmount,
            receivedPaymentMethod,
            returnedPaymentMethod,
            exchangeRate
        FROM payments WHERE invoiceId = ?    
    `, [data.InvoiceId])

    let totalPaid = totalizePayments(paymentsList);

    const resTotalToPay = await query(`
        SELECT chargedAmount FROM invoices WHERE id = ?    
    `, [data.InvoiceId])

    let totalToPay = resTotalToPay[0].chargedAmount;

    if(totalPaid >= totalToPay){
        const _res1 = await execute(`
            UPDATE invoices SET status = 'Pagado' WHERE id = ?
        `, [data.InvoiceId])
        return true
    }else{
        return false
    }
}