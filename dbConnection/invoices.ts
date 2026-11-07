import { query, execute, transaction } from "../dbConnection.ts"
import { getDolarPrice } from "../functions/getDolarPrice.ts";
import { totalizePayments } from "../functions/totalizePayments.ts";
import * as t from "../interfaces.ts"
import { Iinvoice } from "../types/invoice.ts";
import { getPaymentsByInvoice } from "./payments.ts";
import { studentExist } from "./students.ts";

//Obtener facturas por ID de paciente
export async function getInvoicesById(studentId: string, page: number){	
    const res: Iinvoice[] = await query(`
        SELECT 
            i.id,
            b.name AS billable,
            i.chargedAmount,
            i.exchangeRate,
            i.date,
            i.comments,
            i.status,
            s.studentIdentification,
            i.quantity,
            i.overpaidTo,
            s.name,
            s.lastname
        FROM invoices i 
        JOIN students s ON i.StudentIdentification = s.studentIdentification
        JOIN billables b ON i.billableid = b.id
        WHERE i.StudentIdentification LIKE ?
        ORDER BY date DESC
        LIMIT 10 OFFSET ?
    `, [ studentId, (page-1)*10])
    return res	
}

export async function getAllinvoices(page: number){	
    const res: Iinvoice[] = await query(`
        SELECT 
            i.id,
            b.name AS billable,
            i.chargedAmount,
            i.exchangeRate,
            i.date,
            i.comments,
            i.status,
            s.studentIdentification,
            i.quantity,
            i.overpaidTo,
            s.name,
            s.lastname
        FROM invoices i
        JOIN students s ON i.StudentIdentification = s.studentIdentification
        JOIN billables b ON i.billableid = b.id
        ORDER BY i.date DESC
        LIMIT 10 OFFSET ?
    `, [(page-1)*10])

    return res	
}

export async function getPendingInvoices(page: number): Promise<Iinvoice[]>{
    try{
        const res: Iinvoice[] = await query(`
            SELECT * FROM invoices
            WHERE status = 'Pendiente'
            ORDER BY date DESC
            LIMIT 10 OFFSET ?    
        `)
        return res
    }catch(err){
        console.log(err)
        throw err
    }
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

export async function issueInvoice(data: t.invoiceData){
    const {studentIdentification, billableid, quantity, chargedAmount, comment, exchangeRate } = data
    if (await studentExist(studentIdentification)){
        const _res = await execute(`
            INSERT INTO invoices(
                StudentIdentification,
                billableid,
                quantity,
                chargedAmount,
                comments,
                exchangeRate
            ) VALUES (?, ?, ?, ?, ?, ?)    
        `, [
            studentIdentification,
            billableid,
            quantity,
            chargedAmount,
            comment,
            exchangeRate
        ])
        return true
    }else{
        return false
    }
}

export async function getCurrentDayInvoices(page: number){
    const res = await query(`
        SELECT 
            i.id,
            b.name AS billable,
            i.chargedAmount,
            i.exchangeRate,
            i.date,
            i.comments,
            i.status,
            s.studentIdentification,
            i.quantity,
            i.overpaidTo,
            s.name,
            s.lastname
        FROM invoices i
        JOIN students s ON i.StudentIdentification = s.studentIdentification
        JOIN billables b ON i.billableid = b.id
        ORDER BY i.date DESC
        LIMIT 10 OFFSET ?
    `, [(page - 1) * 10])
    return res
}

export async function getInvoicesByPayer(page: number, identification: number){
	const res = await query(`
		SELECT 
            i.id,
            b.name AS billable,
            i.chargedAmount,
            i.exchangeRate,
            i.date,
            i.comments,
            i.status,
            s.studentIdentification,
            i.quantity,
            i.overpaidTo,
            s.name,
            s.lastname
        FROM invoices i
        JOIN students s ON i.StudentIdentification = s.studentIdentification
        JOIN billables b ON i.billableid = b.id
		WHERE i.studentIdentification = ?
		ORDER BY i.date DESC
		LIMIT 10 OFFSET ?	
	`, [identification, ((page-1)*10)])
	return res
}

export async function cancelInvoice(invoiceId: string){
    const payments = await getPaymentsByInvoice(invoiceId)

    let ammountToReturn = totalizePayments(payments);
    let dolarPrice = await getDolarPrice()
    
    const queries = [
        `UPDATE invoices SET status = 'Anulada' WHERE id = ?`,
        `INSERT INTO payments(
            invoiceId,
            paidAmount,
            returnedAmount,
            exchangeRate,
            comments,
            returnedPaymentMethod
        ) VALUES(?, ?, ?, ?, ?, ?)`
    ]

    const params = [
        [invoiceId],
        [
            invoiceId,
            0,
            Number(ammountToReturn).toFixed(2),
            dolarPrice,
            "Devolucion por anulacion",
            "Dolares"
        ]
    ]

    const _DbResponse = await transaction(queries, params);
}

export async function getOverPaidInvoices(studentId: number){
    const res = await query(`
        SELECT 
            i.id,
            i.chargedAmount,
            SUM(p.paidAmount),
            SUM(p.returnedAmount)
        FROM payments p
        JOIN invoices i ON p.invoiceId = i.id
        WHERE 
            i.status = 'Excedente' 
            AND i.overpaidTo = null
            AND i.StudentIdentification = ?
    `, [studentId])
    return res;
}