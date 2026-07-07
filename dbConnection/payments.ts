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
            exchangeRate,
            reference,
            returnReference,
            comments
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)    
    `, [
        data.InvoiceId,
        data.paymentAmmount,
        data.paymentMethod,
        data.changeAmount,
        data.changeMethod,
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

    let totalPaid = 0;
    paymentsList.forEach((element: any) => {
        if(element.receivedPaymentMethod === 3){
            totalPaid += element.paidAmount
        }else{
            let paidOnDolars = Number(element.paidAmount / element.exchangeRate);
            totalPaid += paidOnDolars;
        }

        if(element.returnedPaymentMethod === 3){
            totalPaid -= element.paidAmount
        }else{
            let returnedOnDolars = Number(element.returnedAmount / element.exchangeRate);
            totalPaid -= returnedOnDolars;
        }
    });

    const resTotalToPay = await query(`
        SELECT chargedAmount, exchangeRate FROM invoices WHERE id = ?    
    `, [data.InvoiceId])

    let totalToPay = resTotalToPay[0].chargedAmount / resTotalToPay[0].exchangeRate;

    if(totalPaid >= totalToPay){
        const _res1 = await execute(`
            UPDATE invoices SET status = 'Pagado' WHERE id = ?
        `, [data.InvoiceId])
        return true
    }else{
        return false
    }
}