import { query, execute } from "../dbConnection.ts"
import * as t from "../interfaces.ts"
import { studentExist } from "./students.ts";

//Obtener el ID de la siguiente factura a emitir (probar si este enfoque funciona correctamente)
export async function getIdInvoice(){
    const res = await query('SELECT AUTO_INCREMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [Deno.env.get("BDD_DATABASE"), 'invoices'])
    return res
}

//Obtener facturas por ID de paciente
export async function getInvoicesById(patientId: string, page: number){	
    const res = await query(`
        SELECT * FROM invoices
        WHERE patientId = ?
        ORDER BY date DESC
        LIMIT 10 OFFSET ?
    `, [ patientId, (page-1)*10])
    return res	
}

export async function getAllinvoices(page: number){	
    const res = await query(`
        SELECT * FROM invoices
        ORDER BY date DESC
        LIMIT 10 OFFSET ?
    `, [(page-1)*10])
    return res	
}

export async function getinvoicesVerification(page: number){	
    const res = await query(`
        SELECT * FROM invoices WHERE status = 'Por verificar'
        ORDER BY date DESC
        LIMIT 10 OFFSET ?
    `, [(page-1)*10])
    return res	
}
//Obtener facturas por verificar y por ID de paciente
export async function getinvoicesVerificationById(patientId: string, page: number){	
    const res = await query(`
        SELECT * FROM invoices
        WHERE patientId = ? AND status = 'Por verificar'
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
    const {studentIdentification, billableitem, quantity, chargedAmount, comment } = data
    if (await studentExist(studentIdentification)){
        const _res = await execute(`
            INSERT INTO invoices(
                StudentIdentification,
                billableItem,
                quantity,
                chargedAmount,
                comments
            ) VALUES (?, ?, ?, ?, ?)    
        `, [
            studentIdentification,
            billableitem,
            quantity,
            chargedAmount,
            comment
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