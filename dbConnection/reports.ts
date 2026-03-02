import { query, execute } from "../dbConnection.ts"

export async function getReportInfo(start: Date, end: Date){
    const res = await query(`
        SELECT 
            s.id as studentId,
            i.id as invoiceId,
            i.status as invoiceStatus,
            i.billableitem,
            i.changeRate,
            i.date,
            i.chargedAmount,
            i.currencyReceived,
            i.amountReceived,
            i.currencyReturned,
            s.name,
            s.lastname,
            s.studentsidentification
        FROM invoices i
        JOIN students s
        ON s.id = i.studentId
        WHERE i.date > ? AND i.date < ?
    `, [start, end])
    return res
}