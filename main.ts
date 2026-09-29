import express from "npm:express@4.18.2";
import cors from 'npm:cors'
import jwt from 'npm:jsonwebtoken'
import * as mw from './middlewares.ts'
import "jsr:@std/dotenv/load";
import * as t from "./interfaces.ts"
import { BuildReport } from "./PdfModels/DailyReport.ts"
import { buildCertificate } from "./PdfModels/certificate.ts"
import { buildCarnet } from "./PdfModels/carnet.ts"
import { login } from "./dbConnection/system.ts"
import { getCertificateInfo, getCertificateList } from "./dbConnection/certificates.ts"
import { filterCourses, getAllCourses, setCourse, updateAssignedModulesForCourse } from "./dbConnection/courses.ts"
import { getLastEnrollmentByStudentId, registerEnrollment, updateEnrollmentState, getStudentCohorts, createStudentCohort, getEnrollmentHistory,getApprovedModulesByStudent, getEnrollmentCountBySection } from "./dbConnection/enrollments.ts"
import { getAllinvoices, getCurrentDayInvoices, getIdInvoice, getInvoicesById, getInvoicesByPayer, getinvoicesVerification, getinvoicesVerificationById, issueInvoice, verifyInvoice, cancelInvoice, getInvoiceById } from "./dbConnection/invoices.ts"
import { deactivateModule, filterModules, getAllModules, getAssignedModulesByCourse, getSearchedModule, setModule, getModulesByCourse, activeModuleExists } from "./dbConnection/modules.ts"
import { getPaymentsByInvoice, makePayment } from "./dbConnection/payments.ts"
import { changeEndDatePeriod, closePeriod, getCurrentPeriod, openPeriod, getPeriods, getActivePeriods, 	getPeriodById,
	getPeriodByYearAndNumber,
	periodExists, runningPeriodExists, openPeriodExists } from "./dbConnection/period.ts"
import { openSection, getSections, getCurrentSection, closeSection, getSectionByModule, getStudentsInSection, getSectionByPeriod } from "./dbConnection/section.ts"
import { getReportInfo } from "./dbConnection/reports.ts"
import { deactivateStudent, filterStudents, getEnrolledStudentsByModule, getStudentById, getStudents, registerStudents, getStudentCardInfo, studentExist, isStudentIdTaken, isStudentEmailTaken } from "./dbConnection/students.ts"
import { filterTeachers, getTeachers, registerTeacher, deactivateTeacher, activeTeacherExists, isTeacherIdTaken, isTeacherEmailTaken } from "./dbConnection/teachers.ts"
import { loadScores, getScoreByStudent, updateScore, getGradeStudentsBySection, enrollmentGradeBelongsTo } from "./dbConnection/scores.ts";
import { getDocumentsList, saveDocument } from "./dbConnection/documents.ts"
import { getAllUsers, createNewUser, updatePassword, updateUser, isUserIdTaken } from "./dbConnection/users.ts";
import { ChangePrices, GetBillables, billableExists, getBillable } from "./dbConnection/billables.ts";
import { totalizePayments } from "./functions/totalizePayments.ts";
import { randomUUID } from "node:crypto";
import { IFilterUsers } from "./types/filterObjects/IFilterUsers.ts";
import {
	YEAR_MAX,
	YEAR_MIN,
	QUANTITY_MAX,
	QUANTITY_MIN,
	QUOTA_MAX,
	QUOTA_MIN,
	INSTRUCTION_GRADES,
	MODALITIES,
	PAYMENT_METHODS,
	TERM_MAX,
	TERM_MIN,
	REFERENCE_MAX,
	ROLES,
	PHONE_MAX,
	PHONE_MIN,
	NAME_MAX,
	ENROLLMENT_TYPES,
	isUuid,
	isFailure,
	failure,
	newValidator,
	normalizeInstructionGrade,
	normalizePaymentMethod,
	isBalanceAllowed,
	validateAmount,
	validateGrade,
	validatePage,
	validatePeriod,
	toISODate,
} from "./functions/validators.ts";

const port = Deno.env.get("PORT")
export const secret = Deno.env.get("SECRET")

/**
 * Errores de negocio de registerEnrollment.
 *
 * No son fallos de validacion de forma, sino de coherencia con el estado
 * actual, asi que no pasan por el validador. Se listan aqui para responder
 * 400 con un texto entendible en vez de 500.
 */
const ENROLLMENT_ERRORS = new Set([
	'La seccion no existe',
	'La seccion no esta activa',
	'El periodo no esta en curso',
	'El modulo esta suspendido',
	'SecciÃƒÂ³n sin cupo disponible',
	'El estudiante ya esta inscrito en esta seccion',
	'El estudiante ya aprobo este modulo',
	'El modulo no pertenece al curso del cohorte',
	'Una inscripcion Repitiente requiere la inscripcion original',
	'La inscripcion original no existe',
	'La inscripcion original pertenece a otro estudiante',
	'La inscripcion original no esta reprobada',
])

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: true}))

// PATRON de las rutas de escritura, ver seccion 9 de GUIA-EXTENSION.md:
//   1. leer y validar la entrada (dentro del try)
//   2. si falla -> return res.status(400).send(failure)
//   3. recien entonces llamar a dbConnection/
// Un `failure` lanzado por los validadores se distingue de un error de base de
// datos con isFailure(err), y asi nunca se devuelve como 500.
app.post('/api/login', async (req, res) => {
	let dbResponse
	try{
		const v = newValidator()
		v.integer('id', req.body.id, 'El id de usuario', 1)
		// Sin esto un login vacio comparaba contra el hash de la cadena ""
		if (typeof req.body.passwordHash !== 'string' || !/^[0-9a-f]{64}$/.test(req.body.passwordHash)) {
			v.add(failure('passwordHash', 'La contrasena debe ser un hash SHA-256 de 64 caracteres'))
		}
		const err = v.firstError()
		if (err) return res.status(400).send(err)

		const {passwordHash} = req.body
		dbResponse = await login(req.body)
		console.log(dbResponse)
		if(dbResponse.length == 0){
			res.status(404).send('Usuario no encontrado')
		}else if(dbResponse[0].passwordSHA256 != passwordHash){
			res.status(401).send('ContraseÃƒÂ±a Incorrecta')
		}else if(dbResponse[0].active == false){
			res.status(404).send('Este usuario se encuentra inactivo')
		}else{
			const token = jwt.sign({
				id: dbResponse[0].id,
				name: dbResponse[0].name,
				type: dbResponse[0].type,
				exp: Math.floor(Date.now() / 1000) + 60000
			}, secret)
			res.status(200).send({...dbResponse[0], jwt: token})
		}
	}catch(err){
		console.log(err)
		res.status(500).send('error del servidor')
	}
})

app.get('/api/billables', mw.departmentWorker, async (req, res) => {
	try{	
		const dbResponse = await GetBillables()
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.put('/api/prices', mw.departmentChief, async (req, res) => {
	const newPrices = req.body
	try{
		const _dbResponse = await ChangePrices(newPrices)
		res.status(200).send()
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

//Obtener el numero de Factura a emitir
// app.get('/api/getIdInvoice', mw.departmentWorker, async (req, res) => {
// 	try{
// 		const dbResponse = await getIdInvoice()
// 		res.status(200).send(dbResponse)
// 	}catch(err){
// 		console.log(err)
// 		res.status(500).send('error del servidor')
// 	}
// })

//Crear factura
app.post('/api/issueInvoice', mw.departmentWorker, async (req, res) => {
	try {
		const body = req.body
		const v = newValidator()
		v.identification('studentIdentification', body.studentIdentification, 'La cedula del estudiante')
		v.uuid('billableid', body.billableid, 'El concepto')
		// quantity es int(11) NOT NULL y admitia 0 y negativos.
		v.integer('quantity', body.quantity, 'La cantidad', QUANTITY_MIN, QUANTITY_MAX)
		v.amount('chargedAmount', body.chargedAmount, 'El monto facturado')
		v.amount('exchangeRate', body.exchangeRate, 'La tasa de cambio', { min: 0.000001 })
		v.longText('comment', body.comment, 'El comentario', 200)
		const err = v.firstError()
		if (err) return res.status(400).send(err)

		if (!(await studentExist(body.studentIdentification))) {
			return res.status(404).send(failure('studentIdentification', 'No se ah encontrado al estudiante'))
		}
		// Solo lo protegia la FK, y con un 500 crudo.
		if (!(await billableExists(body.billableid))) {
			return res.status(400).send(failure('billableid', 'El concepto facturable no existe'))
		}

		const dbResponse = await issueInvoice({
			...body,
			quantity: Number(body.quantity),
			chargedAmount: validateAmount(body.chargedAmount),
			exchangeRate: Number(body.exchangeRate)
		})
		if(dbResponse === true){
			res.status(200).send("Factura creada exitosamente")
		}else{
			res.status(404).send("No se ah encontrado al estudiante")
		}
	} catch (err) {
		if (isFailure(err)) return res.status(400).send(err)
		console.log(err)
		res.status(500).send('Error del servidor')
	}
})

//Obtener facturas por verificar
app.get('/api/getinvoicesVerification/:page', mw.departmentWorker, async (req, res) => {
	try{
		const page = validatePage(req.params.page)
		const dbResponse = await getinvoicesVerification(page)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(404).send('Error del servidor, No pudo traer facturas por verificar')
	}
})

//Obtener facturas por verificar y por ID de estudiante
app.get('/api/getInvoicesVerificationById/:patientId/:page', mw.departmentWorker, async (req, res) => {
	const patientId = req.params.patientId
	try{
		const page = validatePage(req.params.page)
		const dbResponse = await getinvoicesVerificationById(patientId, page)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(404).send('Error del servidor, No pudo traer facturas deacuerdo al ID proporcionado')
	}
})

//Verificar factura
// app.post('/api/verifyInvoice', mw.departmentWorker, async (req, res) => {
// 	const {idParam, status} = req.body
// 	try{
// 		const dbResponse = await verifyInvoice(idParam, status)
// 		res.status(200).send('La factura ha sido verificada con exitosamente')
// 	}catch(err){
// 		console.log(err)
// 		res.status(500).send('Error del servidor, No pudo actualizar el estado de la factura')
// 	}
// })

//Modificar para obtener citas por cedula de pagador
app.get('/api/getInvoices/:studentId/:page', mw.departmentWorker, async (req, res) => {
	const studentId = req.params.studentId
	try{
		const page = validatePage(req.params.page)
		const dbResponse = await getInvoicesById(studentId, page)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(404).send('Usuario no encontrado')
	}
})

//Obtener todas las facturas
app.get('/api/getInvoices/:page', mw.departmentWorker, async (req, res) => {
	try{
		const page = validatePage(req.params.page)
		const dbResponse = await getAllinvoices(page)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(404).send('Usuario no encontrado')
	}
})

//Emitir reporte diario
app.get('/api/getDailyReport', mw.departmentWorker, async (req, res) => {
	try{

		const currentDate = new Date
		const roofLimit = new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 28)
		const floorLimit = new Date(currentDate.getFullYear(), currentDate.getMonth()-1, currentDate.getDate())

		const stream = res.writeHead(200, {
			"Content-Type": "aplication/pdf",
			"Content-Disposition": `attachment; filename=Reporte del ${floorLimit.toDateString()}.pdf`
		})

		const dbResponse = await getReportInfo(floorLimit, roofLimit)

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

//Endpoint para procesos de inscripcion masiva

//Periodos

app.post('/api/openPeriod', mw.departmentWorker, async (req, res) => {
	try{
		const body = req.body
		const v = newValidator()
		v.integer('year', body.year, 'El anio', YEAR_MIN, YEAR_MAX)
		v.integer('period', body.period, 'El periodo', TERM_MIN, TERM_MAX)
		v.enum('modality', body.modality, 'La modalidad', MODALITIES)
		const err = v.firstError()
		if (err) return res.status(400).send(err)

		// period.ts armaba `endDate` desde `startDate`, asi que el periodo
		// duraba 0 dias. Ademas las fechas no tenian zero-padding.
		let validatedPeriod
		try {
			validatedPeriod = validatePeriod(body)
		} catch (e) {
			return res.status(400).send(e)
		}

		// Un solo periodo En curso a la vez: si no, getCurrentPeriod devuelve
		// N filas y cualquier JOIN que lo use se multiplica.
		if (await runningPeriodExists(body.year, body.period, body.modality)) {
			return res.status(400).send(failure('period', 'Ya existe un periodo en curso con esos datos'))
		}
		if (await periodExists(body.year, body.period, body.modality)) {
			return res.status(400).send(failure('period', 'Ya existe un periodo registrado con esos datos'))
		}

		const dbResponse = await openPeriod({
			...body,
			startDate: validatedPeriod.start,
			endDate: validatedPeriod.end
		})
		res.status(200).send(dbResponse)
	}catch(err){
		if (isFailure(err)) return res.status(400).send(err)
		console.log(err)
		res.status(500).send(err)
	}
})

app.get('/api/getPeriods', mw.departmentWorker, async (req, res) => {
	try{
		const dbResponse = await getPeriods()
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.get('/api/getCurrentPeriod', mw.departmentWorker, async (req, res) => {
	try{
		const dbResponse = await getCurrentPeriod()
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.patch('/api/changeEndDatePeriod', mw.departmentWorker, async (req, res) => {
	const { year, period, newEndDate, modality } = req.body
	try{
		const v = newValidator()
		v.integer('year', year, 'El anio', YEAR_MIN, YEAR_MAX)
		v.integer('period', period, 'El periodo', TERM_MIN, TERM_MAX)
		if (modality !== undefined && modality !== null && modality !== '') {
			v.enum('modality', modality, 'La modalidad', MODALITIES)
		}
		const err = v.firstError()
		if (err) return res.status(400).send(err)

		// La nueva fecha de fin no puede quedar antes del inicio del periodo.
		const currentPeriod = await getPeriodByYearAndNumber(Number(year), Number(period), modality ?? undefined)
		if (!currentPeriod) {
			return res.status(404).send(failure('period', 'No se encontro el periodo'))
		}
		const v2 = newValidator()
		v2.date('newEndDate', newEndDate, 'La fecha de fin')
		const err2 = v2.firstError()
		if (err2) return res.status(400).send(err2)
		const endDateISO = v2.cleaned().newEndDate as string
		if (endDateISO <= toISODate(currentPeriod.startDate)) {
			return res.status(400).send(failure('newEndDate', 'La fecha de fin debe ser posterior a la fecha de inicio'))
		}

		const dbResponse = await changeEndDatePeriod(Number(year), Number(period), endDateISO, modality ?? undefined)
		res.status(200).send(dbResponse)
	}catch(err){
		if (isFailure(err)) return res.status(400).send(err)
		console.log(err)
		res.status(500).send(err)
	}
})

app.post('/api/closePeriod', mw.departmentWorker, async (req, res) => {
	const { year, period, modality } = req.body
	try{
		const v = newValidator()
		v.integer('year', year, 'El anio', YEAR_MIN, YEAR_MAX)
		v.integer('period', period, 'El periodo', TERM_MIN, TERM_MAX)
		if (modality !== undefined && modality !== null && modality !== '') {
			v.enum('modality', modality, 'La modalidad', MODALITIES)
		}
		const err = v.firstError()
		if (err) return res.status(400).send(err)

		// Sin desambiguar por modalidad, el UPDATE cerraba las dos.
		const dbResponse = await closePeriod(Number(year), Number(period), modality ?? undefined)
		res.status(200).send(dbResponse)
	}catch(err){
		if (isFailure(err)) return res.status(400).send(err)
		console.log(err)
		res.status(500).send(err)
	}
})

app.get('/api/getActivePeriods', mw.departmentWorker, async (req, res) => {
	try{
		const dbResponse = await getActivePeriods()
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

// Secciones
app.post('/api/openSection', mw.departmentWorker, async (req, res) => {
	try {
		const body = req.body
		const v = newValidator()
		v.uuid('periodId', body.periodId, 'El periodo')
		v.uuid('moduleId', body.moduleId, 'El modulo')
		// sections.code es varchar(1): 2 caracteres se truncan en silencio y
		// colisionan con otra seccion.
		v.text('code', body.code, 'El codigo de la seccion', { min: 1, max: 1 })
		// int(2) firmado: quota 0 deja la seccion inscriptible y un negativo
		// la cierra siempre.
		v.integer('quota', body.quota, 'El cupo', QUOTA_MIN, QUOTA_MAX)
		v.nonEmptyList('teachers', body.teachers, 'Los docentes')
		// Un string en vez de array rompia despues del INSERT.
		v.noDuplicates('teachers', Array.isArray(body.teachers) ? body.teachers.map((t: any) => t?.id) : body.teachers, 'Los docentes')
		const err = v.firstError()
		if (err) return res.status(400).send(err)

		const code = String(body.code).toUpperCase().trim()
		if (!/^[A-Z]$/.test(code)) {
			return res.status(400).send(failure('code', 'El codigo de la seccion debe ser una sola letra'))
		}

		if (!(await openPeriodExists(body.periodId))) {
			return res.status(400).send(failure('periodId', 'El periodo no existe o no esta en curso'))
		}
		if (!(await activeModuleExists(body.moduleId))) {
			return res.status(400).send(failure('moduleId', 'El modulo no existe o esta suspendido'))
		}

		for (const teacher of body.teachers) {
			if (!isUuid(teacher?.id)) {
				return res.status(400).send(failure('teachers', 'El identificador de un docente no es valido'))
			}
			if (!(await activeTeacherExists(teacher.id))) {
				return res.status(400).send(failure('teachers', 'Uno de los docentes no existe o esta inactivo'))
			}
		}

		const dbResponse = await openSection({ ...body, code, quota: Number(body.quota) })
		res.status(200).send(dbResponse)
	} catch (err) {
		if (isFailure(err)) return res.status(400).send(err)
		console.log(err)
		res.status(500).send('Error al abrir la secciÃƒÂ³n')
	}
})

app.get('/api/getSections/:id', mw.departmentWorker, async (req, res) => {
	const id = req.params.id
	try {
		const dbResponse = await getSections(id)
		res.status(200).send(dbResponse)
	} catch (err) {
		res.status(500).send('Error al obtener las secciones')
	}
})

app.get('/api/getCurrentSection', mw.departmentWorker, async (req, res) => {
	try {
		const dbResponse = await getCurrentSection()
		res.status(200).send(dbResponse)
	} catch (err) {
		res.status(500).send('Error al obtener la secciÃƒÂ³n actual')
	}
})
/*
app.get('/api/getSectionByModule/:moduleId', mw.departmentWorker, async (req, res) => {
	const moduleId = req.params.moduleId
	try {
		const dbResponse = await getSectionByModule(moduleId)
		res.status(200).send(dbResponse)
	} catch (err) {
		res.status(500).send('Error al obtener las secciones')
	}
})*/

app.get('/api/getSectionByModule/:moduleId', mw.departmentWorker, async (req, res) => {
    const { moduleId } = req.params;
    const { sectionCode, periodId } = req.query;
	console.log(moduleId, sectionCode, periodId)
    try {
		const cleanPeriodId = periodId?.replace(/\/$/, '');
        const dbResponse = await getSectionByModule(moduleId, sectionCode, cleanPeriodId);
        res.status(200).send(dbResponse);
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
});

app.get('/api/getSectionByPeriod/:periodId', mw.departmentWorker, async (req, res) => {
	const periodId = req.params.periodId
	try {
		const dbResponse = await getSectionByPeriod(periodId)
		res.status(200).send(dbResponse)
	} catch (err) {
		res.status(500).send('Error al obtener las secciones')
	}
})

app.post('/api/closeSection', mw.departmentWorker, async (req, res) => {
	const { sectionId } = req.body
	try {
		if (!isUuid(sectionId)) {
			return res.status(400).send(failure('sectionId', 'El identificador de la seccion no es valido'))
		}
		const dbResponse = await closeSection(sectionId)
		res.status(200).send(dbResponse)
	} catch (err) {
		if (isFailure(err)) return res.status(400).send(err)
		console.log(err)
		res.status(500).send('Error al cerrar la secciÃƒÂ³n')
	}
})


app.post('/api/course', mw.departmentWorker, async (req, res) => {
	const {description} = req.body
	try{
		const _dbResponse = await setCourse(description)
		res.status(200).send()	
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.post('/api/module', mw.departmentWorker, async (req, res) => {
	const {description} = req.body
	try{
		const _dbResponse = await setModule(description)
		res.status(200).send()		
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.get('/api/course', mw.departmentWorker, async (req, res) => {
	try{
		const dbResponse = await getAllCourses()
		res.status(200).send(dbResponse)	
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.get('/api/getAllModules', mw.departmentWorker, async (req, res) => {
	try{
		const dbResponse = await getAllModules()
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.post('/api/deactivateModule', mw.departmentWorker, async (req, res) => {
	const { moduleId } = req.body
	try{
		await deactivateModule(moduleId)
		res.status(200).send({ message: 'MÃƒÂ³dulo suspendido' })
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.get('/api/getSearchedModule/:idParam', mw.departmentWorker, async (req, res) => {
	const idParam = req.params.idParam
	try{
		const dbResponse = await getSearchedModule(idParam)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)		
		res.status(404).send('Modulo no encontrado')
	}
})

app.get('/api/getEnrolledStudentsByModule/:idParam', mw.departmentWorker, async (req, res) => {
	const idParam = req.params.idParam
	try{
		const dbResponse = await getEnrolledStudentsByModule(idParam)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.post('/api/getAssignedModules', mw.departmentWorker, async (req, res) => {
	const {courseId} = req.body
	try{
		const dbResponse = await getAssignedModulesByCourse(courseId)
		res.status(200).send(dbResponse)		
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.post('/api/updateAssignedModules', mw.departmentWorker, async (req, res) => {
    const { courseId, moduleIds } = req.body
    try{
        await updateAssignedModulesForCourse(courseId, moduleIds)
        res.status(200).send({ message: 'Modules updated' })
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

app.get('/api/getLastEnrollmentByStudentId/:id', mw.departmentWorker, async (req, res) => {
	const id = Number(req.params.id)
	try{
		const dbResponse = await getLastEnrollmentByStudentId(id)
		if(dbResponse.length == 0){
			res.status(404).send('No se han encontrado inscripciones para este estudiante')
			return
		}
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.get('/api/getStudentsInSection/:sectionId', mw.departmentWorker, async (req, res) => {
	const sectionId = req.params.sectionId
	try{
		const dbResponse = await getStudentsInSection(sectionId)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

// Ruta duplicada de /api/registerEnrollment que el frontend ya no llama.
// Se conserva pero con la firma nueva de registerEnrollment (objeto), porque
// la llamada vieja `registerEnrollment(studentId, sectionId)` ya no compila.
app.post('/api/tregisterEnrollment', mw.departmentWorker, async (req, res) => {
	const { studentId, sectionId } = req.body
	try {
		const v = newValidator()
		v.uuid('studentId', studentId, 'El estudiante')
		v.uuid('sectionId', sectionId, 'La seccion')
		const err = v.firstError()
		if (err) return res.status(400).send(err)

		const dbResponse = await registerEnrollment({ studentId, sectionId, cohortId: req.body.cohortId })
		res.status(200).send(dbResponse)
	} catch (err) {
		if (isFailure(err)) return res.status(400).send(err)
		if (err instanceof Error && ENROLLMENT_ERRORS.has(err.message)) {
			return res.status(400).send(failure('enrollment', err.message))
		}
		console.log(err)
		res.status(500).send(err)
	}
})

app.patch('/api/updateEnrollmentState', mw.departmentWorker, async (req, res) => {
	const {enrollmentId, newState} = req.body
	try{
		const dbResponse = await updateEnrollmentState(enrollmentId, newState)
		res.status(200).send(dbResponse)		
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

///Falta el endpoint para cargar notas de estudiantes

//Endpoint para obtener configuraciones
// app.get('/api/getSettings', mw.departmentWorker, async (req, res) => {
// 	try{
// 		const dbResponse = await getSettings()
// 		res.status(200).send(dbResponse)
// 	}catch(err){
// 		console.log(err)
// 		res.status(500).send(err)
// 	}
// })

app.post('/api/setLoadScores', mw.departmentWorker, async (req, res) => {
	const data = req.body
	try{
		const v = newValidator()
		v.enum('evaluationMode', data.evaluationMode, 'El modo de evaluacion', ['Simple', 'Promedio'])
		if (!Array.isArray(data.grades)) {
			return res.status(400).send(failure('grades', 'La lista de calificaciones debe ser una lista'))
		}
		if (data.grades.length === 0) {
			return res.status(400).send(failure('grades', 'No se recibieron calificaciones'))
		}
		const err = v.firstError()
		if (err) return res.status(400).send(err)

		// Un enrollmentGradeId inexistente hacia un UPDATE de 0 filas y la ruta
		// respondia 200. Ademas enrollment_partial_scores.score es NOT NULL.
		const validatedGrades: any[] = []
		for (const [index, item] of data.grades.entries()) {
			if (!isUuid(item?.enrollmentGradeId)) {
				return res.status(400).send(failure(`grades[${index}].enrollmentGradeId`, 'El identificador de la calificacion no es valido'))
			}
			if (!(await enrollmentGradeBelongsTo(item.enrollmentGradeId))) {
				return res.status(400).send(failure(`grades[${index}].enrollmentGradeId`, 'La calificacion no existe'))
			}

			if (data.evaluationMode === 'Promedio') {
				if (!Array.isArray(item.scores) || item.scores.length === 0) {
					return res.status(400).send(failure(`grades[${index}].scores`, 'Debe enviar al menos una nota parcial'))
				}
				for (const [partialIndex, partial] of item.scores.entries()) {
					const score = validateGrade(partial?.score)
					if (score === null) {
						return res.status(400).send(failure(`grades[${index}].scores[${partialIndex}].score`, 'Las notas parciales no pueden quedar sin nota'))
					}
					const v2 = newValidator()
					v2.integer('evaluationOrder', partial?.evaluationOrder, 'El orden de la evaluacion', 1, 9)
					const e2 = v2.firstError()
					if (e2) return res.status(400).send(e2)
				}
				validatedGrades.push(item)
			} else {
				const score = validateGrade(item?.score)
				// "SI" llega como null y enrollments_grade.score es nullable:
				// es el unico caso en que la nota se guarda sin nota.
				validatedGrades.push({ enrollmentGradeId: item.enrollmentGradeId, score })
			}
		}

		const dbResponse = await loadScores({ evaluationMode: data.evaluationMode, grades: validatedGrades })
		res.status(200).send(dbResponse)
	}catch(err){
		if (isFailure(err)) return res.status(400).send(err)
		console.log(err)
		res.status(500).send(err)
	}
})

app.get('/api/getScoreByStudent/:moduleId/:studentIdentification', mw.departmentWorker, async (req, res) => {
	try{
		const moduleId = req.params.moduleId
		const studentIdentification = req.params.studentIdentification
		const dbResponse = await getScoreByStudent(studentIdentification, moduleId)
		if (dbResponse.length == 0){
			res.status(404).send('No se han encontrado notas para este estudiante')
			return
		}
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.post('/api/setUpdateScore', mw.departmentWorker, async (req, res) => {
    const { gradeId, evaluationMode, finalScore, partials, reason } = req.body

    try {
        const v = newValidator()
        v.uuid('gradeId', gradeId, 'La calificacion')
        v.enum('evaluationMode', evaluationMode, 'El modo de evaluacion', ['Simple', 'Promedio'])
        // modify_scores.reason es nullable: sin esto el cambio queda sin motivo
        // y la auditoria no sirve.
        v.text('reason', reason, 'El motivo', { min: 1, max: 200 })

        if (evaluationMode === 'Simple') {
            if (!finalScore || typeof finalScore !== 'object') {
                v.add(failure('finalScore', 'Debe enviarse la nueva calificacion'))
            } else {
                // modify_scores.newscore es int NOT NULL: no admite NULL, asi
                // que "SI" no es valido al modificar una nota ya cargada.
                const grade = validateGrade(finalScore.newScore)
                if (grade === null) v.add(failure('finalScore.newScore', 'La calificacion debe ser un numero entre 1 y 20'))
            }
        } else {
            if (!Array.isArray(partials) || partials.length === 0) {
                v.add(failure('partials', 'Debe enviarse al menos una nota parcial'))
            } else {
                for (const [i, partial] of partials.entries()) {
			v.uuid(`partials[${i}].partialId`, partial?.partialId, 'La nota parcial')
                    if (validateGrade(partial?.newScore) === null) {
                        v.add(failure(`partials[${i}].newScore`, 'La calificacion debe ser un numero entre 1 y 20'))
                    }
                }
            }
        }
        const err = v.firstError()
        if (err) return res.status(400).send(err)

        if (!(await enrollmentGradeBelongsTo(gradeId))) {
            return res.status(404).send(failure('gradeId', 'La calificacion no existe'))
        }

        // `lastScore` deja de venir del cliente: modify_scores lo lee de la base
        // en updateScore, porque si no la auditoria es falsificable.
        const dbResponse = await updateScore({
            gradeId,
            evaluationMode,
            finalScore: finalScore ? { newScore: validateGrade(finalScore.newScore) as number } : undefined,
            partials: Array.isArray(partials)
                ? partials.map((p: any) => ({
                    partialId: p.partialId,
                    evaluationOrder: p.evaluationOrder,
                    newScore: validateGrade(p.newScore) as number
                }))
                : undefined,
            reason: v.cleaned().reason
        })
        res.status(200).send(dbResponse)
    } catch (err) {
        if (isFailure(err)) return res.status(400).send(err)
        console.log(err)
        res.status(500).send(err)
    }
})

/*app.post('/api/setUpdateScore',mw.departmentWorker, async (req,res) => {
	const {studentId,moduleId, gradeId, lastScore,newScore,reason} = req.body
	try{
		const dbResponse = await updateScore(studentId,moduleId,gradeId,lastScore,newScore,reason)
		console.log(dbResponse)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})*/

app.get('/api/getGradeStudentsBySection/:periodId/:sectionCode', mw.departmentWorker, async (req, res) => {
	try{
		const periodId = req.params.periodId
		const sectionCode = req.params.sectionCode
		const dbResponse = await getGradeStudentsBySection(periodId, sectionCode)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.get("/api/filterModules/:param", mw.departmentWorker, async(req, res) => {
	try{
		const { param } = req.params;
		const dbResponse = await filterModules(param)
		res.status(200).send(dbResponse)
	}catch(err){
		if (isFailure(err)) return res.status(400).send(err)
		console.log(err)
		res.status(500).send(err)
	}
})

app.get("/api/filterCourses/:param", mw.departmentWorker, async(req, res) => {
	try{
		const { param } = req.params;
		const dbResponse = await filterCourses(param)
		res.status(200).send(dbResponse)
	}catch(err){
		if (isFailure(err)) return res.status(400).send(err)
		console.log(err)
		res.status(500).send(err)
	}
})

app.get("/api/certificate/:certificateId", mw.departmentWorker, async(req, res) => {
	try{
		const certificateId = req.params.certificateId;
		const dbResponse = await getCertificateInfo(certificateId)
		const fileTitle = `Certificado de ${dbResponse.course_name} a ${dbResponse.name} ${dbResponse.lastname}`
		const stream = res.writeHead(200, {
			"Content-Type": "aplication/pdf",
			"Content-Disposition": `attachment; filename=${fileTitle}.pdf`
		})
		res.status(200)

		buildCertificate(
			(data) => stream.write(data),
			() => stream.end(),
			dbResponse
		)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.get("/api/certificateList/", mw.departmentWorker, async(req, res) => {
	try{
		const dbResponse = await getCertificateList();
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

//Obtener pagos para una factura
app.get("/api/payments/:invoiceId", mw.departmentWorker, async(req, res) => {
	try{
		const invoiceId = req.params.invoiceId
		const dbResponse = await getPaymentsByInvoice(invoiceId);
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

//Abonar a una factura
app.post("/api/payments", mw.departmentWorker, async(req, res) => {
	try{
		const data: t.IPayment = req.body
		const v = newValidator()
		v.uuid('InvoiceId', data.InvoiceId, 'La factura')
		// "Infinity" y "NaN" llegaban contra un float NOT NULL.
		v.amount('paidAmount', data.paidAmount, 'El monto pagado')
		v.amount('exchangeRate', data.exchangeRate, 'La tasa de cambio', { min: 0.000001 })
		v.longText('reference', data.reference, 'La referencia', REFERENCE_MAX)
		v.longText('returnReference', data.returnReference, 'La referencia de devolucion', REFERENCE_MAX)
		v.longText('comments', data.comments, 'El comentario', 200)
		const err = v.firstError()
		if (err) return res.status(400).send(err)

		const paidAmount = validateAmount(data.paidAmount)

		// returnedAmount es 0 <= x <= paidAmount. Sin este techo, un negativo
		// marcaba la factura como pagada sin que entre dinero: es el ataque mas
		// grave de la tabla de pagos.
		//
		// Se lee de `req.body` y no de `data` porque el tipo declarado dice
		// `number`, pero el body todavia no esta validado y un input vacio
		// llega como `''`.
		const rawReturnedAmount: any = (req.body as any).returnedAmount
		let returnedAmount = 0
		if (rawReturnedAmount !== undefined && rawReturnedAmount !== null && rawReturnedAmount !== '') {
			if (typeof rawReturnedAmount === 'boolean' || !Number.isFinite(Number(rawReturnedAmount))) {
				return res.status(400).send(failure('returnedAmount', 'El monto de devolucion debe ser un numero entre 0 y el monto pagado'))
			}
			returnedAmount = Number(rawReturnedAmount)
			if (returnedAmount < 0 || returnedAmount > paidAmount) {
				return res.status(400).send(failure('returnedAmount', 'El monto de devolucion debe estar entre 0 y el monto pagado'))
			}
		}

		// El <Select> manda 1..4 y el ENUM guarda el nombre. Sin normalizar,
		// todo se guardaba mal.
		let receivedPaymentMethod = ''
		let returnedPaymentMethod: string | null = null
		try {
			receivedPaymentMethod = normalizePaymentMethod(data.receivedPaymentMethod)
		} catch (e) {
			return res.status(400).send(e)
		}
		if (returnedAmount > 0) {
			if (!data.returnedPaymentMethod) {
				return res.status(400).send(failure('returnedPaymentMethod', 'El metodo de devolucion es obligatorio si hay monto a devolver'))
			}
			try {
				returnedPaymentMethod = normalizePaymentMethod(data.returnedPaymentMethod)
			} catch (e) {
				return res.status(400).send(e)
			}
		}

		// Sin esto se puede financiar la cadena de reembolsos infinitos.
		const invoice = await getInvoiceById(data.InvoiceId)
		if (!invoice) {
			return res.status(404).send(failure('InvoiceId', 'No se encontro la factura'))
		}
		if (invoice.status === 'Anulada') {
			return res.status(400).send(failure('InvoiceId', 'No se puede pagar una factura anulada'))
		}

		// La referencia es obligatoria en transferencia: es el numero que deja
		// rastro del banco.
		if (receivedPaymentMethod === 'Transferencia' && !v.cleaned().reference) {
			return res.status(400).send(failure('reference', 'La referencia es obligatoria para pagos por transferencia'))
		}

		// El pago no puede exceder el saldo pendiente.
		const previouslyPaid = totalizePayments(await getPaymentsByInvoice(data.InvoiceId))
		const balance = Number(invoice.chargedAmount) - previouslyPaid
		if (paidAmount > balance + 0.01) {
			return res.status(400).send(failure('paidAmount', 'El monto a pagar no puede superar el saldo de la factura'))
		}

		const paymentResult = await makePayment({
			...data,
			paidAmount,
			returnedAmount,
			receivedPaymentMethod,
			returnedPaymentMethod,
			reference: v.cleaned().reference,
			returnReference: v.cleaned().returnReference,
			comments: v.cleaned().comments
		})
		if(paymentResult === true){
			res.status(200).send()
		}else{
			res.status(201).send()
		}
	}catch(err){
		if (isFailure(err)) return res.status(400).send(err)
		console.log(err)
		res.status(500).send(err)
	}
})

app.delete("/api/invoice/:invoiceId", mw.departmentWorker, async(req, res) => {
	try{
		const invoiceId: string = req.params.invoiceId;
		if (!isUuid(invoiceId)) {
			return res.status(400).send(failure('invoiceId', 'El identificador de la factura no es valido'))
		}
		const _dbResponse = await cancelInvoice(invoiceId)
		res.status(200).send()
	}catch(err){
		if (isFailure(err)) return res.status(400).send(err)
		// "La factura no existe" y "ya se encuentra anulada" son estado, no
		// fallos del servidor: anular dos veces inserta dos devoluciones.
		if (err instanceof Error && (err.message === 'La factura no existe' || err.message === 'La factura ya se encuentra anulada')) {
			return res.status(400).send(failure('invoiceId', err.message))
		}
		console.log(err)
		res.status(500).send(err)
	}
})

//Students
app.post('/api/registerStudents', mw.departmentWorker, async (req, res) => {
	try{
		const body = req.body
		const v = newValidator()
		v.text('name', body.name, 'El nombre', { min: 1, max: NAME_MAX })
		v.text('lastName', body.lastName, 'El apellido', { min: 1, max: NAME_MAX })
		v.identification('identification', body.identification, 'La cedula')
		v.email('email', body.email)
		v.date('birthDate', body.birthDate, 'La fecha de nacimiento', { noFuture: true })
		v.text('phone', body.phone, 'El telefono',PHONE_MIN, PHONE_MAX)
		v.longText('address', body.address, 'La direccion', 200)
		// El <Select> manda 1..4 y el ENUM guarda texto. Sin normalizar, el
		// INSERT falla con "Data truncated for column 'instructionGrade'".
		let instructionGrade = ''
		try {
			instructionGrade = normalizeInstructionGrade(body.instructionGrade)
		} catch (e) {
			v.add(e as any)
		}
		const err = v.firstError()
		if (err) return res.status(400).send(err)

		if (await isStudentIdTaken(body.identification)) {
			return res.status(400).send(failure('identification', 'Ya existe un alumno con esa cedula'))
		}
		if (await isStudentEmailTaken(String(req.body.email).trim())) {
			return res.status(400).send(failure('email', 'Ya existe un alumno con ese correo'))
		}

		const _dbResponse = await registerStudents({
			...body,
			instructionGrade
		})
		res.status(200).send()
	}catch(err){
		if (isFailure(err)) return res.status(400).send(err)
		console.log(err)
		res.status(500).send(err)
	}
})

app.get('/api/getStudentById/:id', mw.departmentWorker,  async (req, res) => {
	const id = Number(req.params.id)
	try{
		const dbResponse = await getStudentById(id)
		if(dbResponse.length == 0){
			res.status(404).send('Estudiante no encontrado')
			return
		}
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.get('/api/getStudents/:page', mw.departmentWorker, async (req, res) => {
	try{
		const page = validatePage(req.params.page)
		const dbResponse = await getStudents(page)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.post("/api/studentPhoto/:studentId", mw.parseFormData, mw.departmentWorker, async (req, res) => {
	try{
		const studentId = req.params.studentId
		const file = req.file
		res.status(201).send()
		Deno.rename(file.path, `/data/profilePics/${studentId}.png`)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.post("/api/deactivateStudent", mw.departmentWorker, async(req, res) => {
    const { id } = req.body;
    try {
        const dbResponse = await deactivateStudent(id);
        res.status(200).send(dbResponse);
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
})

app.get("/api/filterStudents/:param", mw.departmentWorker, async(req, res) => {
	try{
		const { param } = req.params;
		const dbResponse = await filterStudents(param)
		res.status(200).send(dbResponse)
	}catch(err){
		if (isFailure(err)) return res.status(400).send(err)
		console.log(err)
		res.status(500).send(err)
	}
})

app.get("/api/getStudentCard/:studentId", mw.departmentWorker, async(req, res) => {
	try{
		const studentId = req.params.studentId;
		const dbResponse = await getStudentCardInfo(studentId)
		const fileTitle = `Carnet de ${dbResponse.name} ${dbResponse.lastname}`
		
		const stream = res.writeHead(200, {
			"Content-Type": "aplication/pdf",
			"Content-Disposition": `attachment; filename=${fileTitle}.pdf`
		})

		res.status(200)

		buildCarnet(
			(data) => stream.write(data),
			() => stream.end(),
			dbResponse
		)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

//Teachers
app.get("/api/getTeachers/:page", mw.departmentWorker, async(req, res) => {
    try{
        const page = validatePage(req.params.page)
        const dbResponse = await getTeachers(page)
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

app.post("/api/registerTeacher", mw.departmentWorker, async(req, res) => {
    try{
        const body = req.body
        const v = newValidator()
        v.text('name', body.name, 'El nombre', { min: 1, max: NAME_MAX })
        v.text('lastname', body.lastname, 'El apellido', { min: 1, max: NAME_MAX })
        v.identification('identification', body.identification, 'La cedula')
        v.email('email', body.email)
        v.text('phone', body.phone, 'El telefono', PHONE_MIN, PHONE_MAX)
        const err = v.firstError()
        if (err) return res.status(400).send(err)

        if (await isTeacherIdTaken(body.identification)) {
            return res.status(400).send(failure('identification', 'Ya existe un docente con esa cedula'))
        }
        if (await isTeacherEmailTaken(String(body.email).trim())) {
            return res.status(400).send(failure('email', 'Ya existe un docente con ese correo'))
        }

        const dbResponse = await registerTeacher({ ...body, ...v.cleaned() })
        res.status(200).send(dbResponse)
    }catch(err){
        if (isFailure(err)) return res.status(400).send(err)
        console.log(err)
        res.status(500).send(err)
    }
})

app.post("/api/deactivateTeacher", mw.departmentWorker, async(req, res) => {
    const { id } = req.body;
    try {
        const dbResponse = await deactivateTeacher(id);
        res.status(200).send(dbResponse);
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
})

app.get("/api/filterTeachers/:param", mw.departmentWorker, async(req, res) => {
	try{
		const { param } = req.params;
		const dbResponse = await filterTeachers(param)
		res.status(200).send(dbResponse)
	}catch(err){
		if (isFailure(err)) return res.status(400).send(err)
		console.log(err)
		res.status(500).send(err)
	}
})

app.post("/api/document/:studentId", mw.departmentWorker, mw.saveDoc, async (req, res) => {
	const file = req.file
	try{
		const studentId = req.params.studentId;
		const fileName = randomUUID()
		Deno.rename(file.path, `/data/documents/${fileName}.pdf`)
		const doc = {id: fileName, studentId: studentId, docType: req.body.docType }
		const _dbResponse = await saveDocument(doc)
		res.status(201).send()
	}catch(err){
		Deno.remove(file.path)
		console.log(err)
		res.status(500).send(err)
	}
})

app.get("/api/document/:studentId", mw.departmentWorker, async(req, res) => {
	try{
		const studentId = req.params.studentId;
		const dbResponse = await getDocumentsList(studentId)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.get("/api/document/doc/:docId", async(req, res) => {
	try{
		const docId = req.params.docId
		res.sendFile(`/data/documents/${docId}.pdf`, {root: '/'})
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

//Endpoint de prueba
app.post('/api/registerEnrollment', mw.departmentWorker, async (req, res) => {
    const { studentId, sectionId, cohortId, enrollmentType, parentEnrollmentId } = req.body;
    try {
        const v = newValidator()
        v.uuid('studentId', studentId, 'El estudiante')
        v.uuid('sectionId', sectionId, 'La seccion')
        // enrollments.cohortId es NOT NULL y hoy puede llegar undefined.
        v.uuid('cohortId', cohortId, 'El cohorte')
        v.enum('enrollmentType', enrollmentType ?? 'Regular', 'El tipo de inscripcion', ENROLLMENT_TYPES)
        if (parentEnrollmentId !== undefined && parentEnrollmentId !== null && parentEnrollmentId !== '') {
            v.uuid('parentEnrollmentId', parentEnrollmentId, 'La inscripcion original')
        }
        const err = v.firstError()
        if (err) return res.status(400).send(err)

        const dbResponse = await registerEnrollment({
            studentId,
            sectionId,
            cohortId,
            enrollmentType: enrollmentType ?? 'Regular',
            parentEnrollmentId: parentEnrollmentId ?? null
        });
        res.status(200).send(dbResponse);
    } catch (err) {
        if (isFailure(err)) return res.status(400).send(err)
        if (err instanceof Error && ENROLLMENT_ERRORS.has(err.message)) {
            return res.status(400).send(failure('enrollment', err.message))
        }
        console.log(err);
        res.status(500).send(err);
    }
});

app.post('/api/createCohort', mw.departmentWorker, async (req, res) => {
    const { studentId, periodId, sectionCode, courseId } = req.body;
    try {
        const cohortId = await createStudentCohort({ studentId, periodId, sectionCode, courseId });
        res.status(200).send({ cohortId, success: true });
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
});

app.get('/api/getApprovedModules/:studentId/:courseId', mw.departmentWorker, async (req, res) => {
    const { studentId, courseId } = req.params;
    try {
        const modules = await getApprovedModulesByStudent(studentId, courseId);
        res.status(200).send(modules);
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
});

app.get('/api/getEnrollmentHistory/:studentId', mw.departmentWorker, async (req, res) => {
    const { studentId } = req.params;
	console.log(studentId)
    try {
        const history = await getEnrollmentHistory(studentId);
        res.status(200).send(history);
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
});

app.get('/api/getEnrollmentCount/:sectionId', mw.departmentWorker, async (req, res) => {
    const { sectionId } = req.params;
    try {
        const count = await getEnrollmentCountBySection(sectionId);
        res.status(200).send({ count });
    } catch (err) {
        console.log(err);
        res.status(500).send({ error: 'Error al obtener conteo de inscritos' });
    }
});

// enpoints de usuarios

app.get('/api/user/:page', mw.systemAdmin, async(req, res) => {
	
	//Si se esta filtrando u obteniendo un elemento concreto
	//se usa este objeto, si es null se devuelven todos
	const _searchObject: IFilterUsers = req.body	//falta imprementar filtrado, por ahora devuelve todos
	try{
		const page = validatePage(req.params.page)
		const dbResponse = await getAllUsers(page)
		res.status(200).send(dbResponse)
	}catch(err){
		if (isFailure(err)) return res.status(400).send(err)
		console.log(err)
		res.status(500).send()
	}
})

app.post('/api/user', mw.systemAdmin, async (req, res) => {
	try{
		const body = req.body
		const v = newValidator()
		v.integer('id', body.id, 'El id de usuario', 1)
		v.text('name', body.name, 'El nombre', { min: 1, max: NAME_MAX })
		v.text('lastname', body.lastname, 'El apellido', { min: 1, max: NAME_MAX })
		// Antes se aceptaba cualquier string, incluso el texto plano de la
		// contrasena. users.passwordSHA256 es varchar(64) y guarda un SHA-256.
		if (typeof body.passwordSHA256 !== 'string' || !/^[0-9a-f]{64}$/.test(body.passwordSHA256)) {
			v.add(failure('passwordSHA256', 'La contrasena debe ser un hash SHA-256 de 64 caracteres'))
		}
		// Antes el cliente se autoasignaba el rol.
		v.integer('type', body.type, 'El tipo de usuario')
		v.enum('type', body.type, 'El tipo de usuario', ROLES)
		if (typeof body.active === 'boolean') {
			// tinyint(1)
		} else if (body.active === 1 || body.active === 0) {
			// aceptado
		} else {
			v.add(failure('active', 'El estado del usuario debe ser activo o inactivo'))
		}
		const err = v.firstError()
		if (err) return res.status(400).send(err)

		if (await isUserIdTaken(body.id)) {
			return res.status(400).send(failure('id', 'Ya existe un usuario con ese id'))
		}

		const _dbResponse = await createNewUser({ ...body, ...v.cleaned() })
		res.status(201).send()
	}catch(err){
		if (isFailure(err)) return res.status(400).send(err)
		console.log(err)
		res.status(500).send(err)
	}
})

app.patch('/api/user/', mw.systemAdmin, async (req, res) => {
	try{
		const body = req.body
		const v = newValidator()
		v.integer('id', body.id, 'El id de usuario', 1)
		v.text('name', body.name, 'El nombre', { min: 1, max: NAME_MAX })
		v.text('lastname', body.lastname, 'El apellido', { min: 1, max: NAME_MAX })
		v.integer('type', body.type, 'El tipo de usuario')
		v.enum('type', body.type, 'El tipo de usuario', ROLES)
		const err = v.firstError()
		if (err) return res.status(400).send(err)

		if (!(await isUserIdTaken(body.id))) {
			return res.status(404).send(failure('id', 'No se encontro el usuario'))
		}

		const _dbResponse = await updateUser({ ...body, ...v.cleaned() })
		res.status(201).send()
	}catch(err){
		if (isFailure(err)) return res.status(400).send(err)
		console.log(err)
		res.status(500).send(err)
	}
})

app.listen(port, "0.0.0.0", () => {
	console.log(`Puerto: ${port}`)
})
