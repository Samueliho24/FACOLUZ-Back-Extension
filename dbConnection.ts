import mariadb from 'npm:mariadb'
import * as t from './interfaces.ts'
import "jsr:@std/dotenv/load";

const db = mariadb.createPool({
	host: Deno.env.get("BDD_HOST"),
	user: Deno.env.get("BDD_USER"),
	password: Deno.env.get("BDD_PASSWORD"),
	database: Deno.env.get("BDD_DATABASE"),
	port: Number(Deno.env.get("BDD_PORT")),
	acquireTimeout: Number(Deno.env.get("BDD_TIMEOUT")),
	connectionLimit: Number(Deno.env.get("BDD_CONECTION_LIMITS"))
})

async function query(query: string, params?: object) {
	let connection
	try{
		connection = await db.getConnection()
		const res = await connection.query(query, params)
		return res
	}catch(err){
		console.log(err)
		throw err
	}finally{
		connection?.release()
	}
}

async function execute(query: string, params?: object) {
	let connection
	try{
		connection = await db.getConnection()
		const res = await connection.execute(query, params)
		return res
	}catch(err){
		console.log(err)
		throw err
	}finally{
		connection?.release()
	}
}
//Inicio de sesion
export async function login(data: t.loginData){
	const id = data.id
	const res = await query('SELECT * FROM users WHERE id = ?', [id])
	return res
}
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
//Obtener todas las facturas 
export async function getAllinvoices(page: number){	
	const res = await query(`
		SELECT * FROM invoices
		ORDER BY date DESC
		LIMIT 10 OFFSET ?
	`, [(page-1)*10])
	return res	
}
//Obtener facturas por verificar
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


export async function getSearchedPatient(idParam: number) {
	const res = await query('SELECT * FROM payer WHERE id = ?', [idParam])
	return res
}

export async function issueInvoice(data: t.invoiceData){
	const {billableItem, currency, amount, reference, changeRate, patientId, patientName, patientPhone} = data
	if (currency !== 2){
		const res = await execute(`
			INSERT INTO invoices(billableitem, currency, amount, reference, changeRate, patientId, patientName, patientPhone,status)
			VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)	
		`, [billableItem, currency, amount, reference, changeRate, patientId, patientName, patientPhone, 'Recibida'])
		return res
	}else{
		const res = await execute(`
			INSERT INTO invoices(billableitem, currency, amount, reference, changeRate, patientId, patientName, patientPhone)
			VALUES(?, ?, ?, ?, ?, ?, ?, ?)	
		`, [billableItem, currency, amount, reference, changeRate, patientId, patientName, patientPhone ])
		return res
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

export async function setSettings(){

}

export async function getSettings(){
	const res = await query(`
		SELECT * from settings
		WHERE 
			label != 'startedPeriod' 
	`)
	return res
}

export async function getLogs(page: number) {
	const res = await query(`
		SELECT
			changelogs.dateTime,
			changelogs.changeType,
			modificated.name AS modificatedName,
			modificated.lastname AS modificatedLastname,
			modificator.name AS modificatorName,
			modificator.lastname AS modificatorLastname
		FROM changelogs
		JOIN users AS modificated ON changelogs.userModificatedId = modificated.id
		JOIN users AS modificator ON changelogs.userModificatorId = modificator.id
		ORDER BY changelogs.dateTime DESC
		LIMIT 10 OFFSET ?
	`, [(page-1)*10])
	return res
}

export async function getDailyReportInfo(start: Date, end: Date){
	const res = await query(`
		SELECT * FROM invoices
		WHERE date > ? AND date < ?
	`, [start, end])
	return res
}