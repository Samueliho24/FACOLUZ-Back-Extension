import { query, execute } from "../dbConnection.ts"
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
            changeRate,
            reference,
            comments
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?)    
    `, [
        data.InvoiceId,
        data.paymentAmmount,
        data.paymentMethod,
        data.changeAmount,
        data.changeMethod,
        data.changeRate,
        (data.reference ? data.reference : null),
        (data.comments ? data.comments : null),
    ])

    const remainingAmount = await query(`
        SELECT chargedAmount FROM invoices WHERE id = ?    
    `, [data.InvoiceId])

    const paymentsList = await query(`
        SELECT paidAmount FROM payments WHERE invoiceId = ?    
    `, [data.InvoiceId])

    let totalPaid = 0;
    paymentsList.forEach((element: any) => {
        totalPaid += element.paidAmount;
    });

    if(totalPaid >= remainingAmount[0].chargedAmount){
        const _res1 = await execute(`
            UPDATE invoices SET status = Pagado WHERE id = ?
        `, [data.InvoiceId])
    }
}