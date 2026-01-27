import express from "npm:express@4.18.2";
import cors from 'npm:cors'
import jwt from 'npm:jsonwebtoken'
import * as db from './dbConnection.ts'
import * as tokenVerification from './tokenVerification.ts'
import "jsr:@std/dotenv/load";
import { BuildReport } from "./PdfModels/DailyReport.ts";

const port = Deno.env.get("PORT")
const secret = Deno.env.get("SECRET")

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: true}))

app.post('/api/login', async (req, res) => {
	const {passwordHash} = req.body
	let dbResponse
	try{
		dbResponse = await db.login(req.body)
		if(dbResponse.length == 0){
			res.status(404).send('Usuario no encontrado')
		}else if(dbResponse[0].passwordSHA256 != passwordHash){
			res.status(401).send('Contraseña Incorrecta')
		}else if(dbResponse[0].active == false){
			res.status(404).send('Este usuario se encuentra inactivo')
		}else if(dbResponse[0].type != 5 && dbResponse[0].type != 6){
			res.status(401).send('Usted no es personal administrativo')
		}else{
			const token = jwt.sign({
				id: dbResponse[0].id,
				name: dbResponse[0].name,
				type: dbResponse[0].type,
				exp: Date.now() + 600000
			}, secret)
			console.log({...dbResponse[0], jwt: token})
			res.status(200).send({...dbResponse[0], jwt: token})
		}
	}catch(err){
		console.log(err)
		res.status(500).send('error del servidor')
	}
})

//Obtener el numero de Factura a emitir
app.get('/api/getIdInvoice', tokenVerification.forAdmins, async (req, res) => {
	try{
		const dbResponse = await db.getIdInvoice()
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send('error del servidor')
	}
})

app.post('/api/issueInvoice', tokenVerification.forAdmins, async (req, res) => {
	const token = req.headers.authorization.split(" ")[1]
	const payload = jwt.verify(token, secret)
	try {
		const dbResponse = await db.issueInvoice(req.body)
		console.log(dbResponse)
		res.status(200).send("Factura creada exitosamente")
	} catch (err) {
		console.log(err)
		res.status(500).send('Error del servidor')
	}
})

//Modificar para verificar si un pagador ya existe
app.get('/api/getSearchedPatient/:idParam', tokenVerification.forSysAdmins, async (req, res) => {
	const idParam = req.params.idParam
	try {
		const dbResponse = await db.getSearchedPatient(idParam)
		res.status(200).send(dbResponse)
	} catch (err) {
		console.log(err)
		res.status(404).send('Paciente no encontrado')
	}
})
//Obtener facturas por verificar
app.get('/api/getinvoicesVerification/:page', tokenVerification.forAdmins, async (req, res) => {
	const page = Number(req.params.page)
	try{
		const dbResponse = await db.getinvoicesVerification(page)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(404).send('Error del servidor, No pudo traer facturas por verificar')
	}
})
//Obtener facturas por verificar y por ID de paciente
app.get('/api/getInvoicesVerificationById/:patientId/:page', tokenVerification.forAdmins, async (req, res) => {
	const patientId = req.params.patientId
	const page = Number(req.params.page)
	try{
		const dbResponse = await db.getinvoicesVerificationById(patientId, page)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(404).send('Error del servidor, No pudo traer facturas deacuerdo al ID proporcionado')
	}
})
//Verificar factura
app.post('/api/verifyInvoice', tokenVerification.forAdmins, async (req, res) => {
	const {idParam, status} = req.body
	try{
		const dbResponse = await db.verifyInvoice(idParam, status)
		res.status(200).send('La factura ha sido verificada con exitosamente')
	}catch(err){
		console.log(err)
		res.status(500).send('Error del servidor, No pudo actualizar el estado de la factura')
	}
})

//Modificar para obtener citas por cedula de pagador
app.get('/api/getInvoices/:patientId/:page', tokenVerification.forAdmins, async (req, res) => {
	const patientId = req.params.patientId
	const page = Number(req.params.page)
	try{
		const dbResponse = await db.getInvoicesById(patientId, page)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(404).send('Usuario no encontrado')
	}
})

app.get('/api/getInvoices/:page', tokenVerification.forAdmins, async (req, res) => {
	const page = Number(req.params.page)
	try{
		const dbResponse = await db.getAllinvoices(page)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(404).send('Usuario no encontrado')
	}
})

app.get('/api/getDailyReport', async (req, res) => {
	try{

		const currentDate = new Date
		const roofLimit = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)
		const floorLimit = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())

		const stream = res.writeHead(200, {
			"Content-Type": "aplication/pdf",
			"Content-Disposition": `attachment; filename=Reporte del ${floorLimit.toDateString()}.pdf`
		})

		const dbResponse = await db.getDailyReportInfo(floorLimit, roofLimit)
		console.log(dbResponse)

		res.status(200)

		BuildReport(
			(data) => stream.write(data),
			() => stream.end(),
			dbResponse
		)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.get('/api/getSettings', tokenVerification.forAdmins, async (req, res) => {
	try{
		const dbResponse = await db.getSettings()
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.listen(port, "0.0.0.0", () => {
	console.log(`Puerto: ${port}`)
})