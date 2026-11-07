import { query, execute } from "../dbConnection.ts"

export async function getReportInfo(start: Date, end: Date){
    const res = await query(`
        SELECT 
            s.id as studentId,
            i.id as invoiceId,
            i.status,
            i.date,
            i.chargedAmount,
            i.exchangeRate,
            s.name,
            s.lastname,
            s.studentidentification,
            b.name as billableitem
        FROM invoices i
        JOIN students s ON s.studentIdentification = i.StudentIdentification
        JOIN billables b ON b.id = i.billableid
        WHERE i.date > ? AND i.date < ?
    `, [start, end])
    return res
}

export async function paymentsReport(start: Date, end: Date){
    const res = await query(`
        SELECT
            
    `)
}