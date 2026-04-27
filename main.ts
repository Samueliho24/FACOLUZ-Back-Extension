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
import { getLastEnrollmentByStudentId, registerEnrollment, updateEnrollmentState } from "./dbConnection/enrollments.ts"
import { getAllinvoices, getCurrentDayInvoices, getIdInvoice, getInvoicesById, getInvoicesByPayer, getinvoicesVerification, getinvoicesVerificationById, issueInvoice, verifyInvoice } from "./dbConnection/invoices.ts"
import { deactivateModule, filterModules, getAllModules, getAssignedModulesByCourse, getSearchedModule, setModule } from "./dbConnection/modules.ts"
import { getPaymentsByInvoice, makePayment } from "./dbConnection/payments.ts"
import { changeEndDatePeriod, closePeriod, getCurrentPeriod, openPeriod, getPeriods, getActivePeriods} from "./dbConnection/period.ts"
import { openSection, getSections, getCurrentSection, closeSection, getSectionByModule, getStudentsInSection, getSectionByPeriod} from "./dbConnection/section.ts"
import { getReportInfo } from "./dbConnection/reports.ts"
import { deactivateStudent, filterStudents, getEnrolledStudentsByModule, getStudentById, getStudents, registerStudents, getStudentCardInfo } from "./dbConnection/students.ts"
import { filterTeachers, getTeachers, registerTeacher,deactivateTeacher } from "./dbConnection/teachers.ts"
import { loadScores, getScoreByStudent, updateScore, getGradeStudentsBySection } from "./dbConnection/scores.ts";
import { getDocumentsList, saveDocument } from "./dbConnection/documents.ts"
import { randomUUID } from "node:crypto";

const port = Deno.env.get("PORT")
export const secret = Deno.env.get("SECRET")

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: true}))

app.post('/api/login', async (req, res) => {
	const {passwordHash} = req.body
	let dbResponse
	try{
		dbResponse = await login(req.body)
		if(dbResponse.length == 0){
			res.status(404).send('Usuario no encontrado')
		}else if(dbResponse[0].passwordSHA256 != passwordHash){
			res.status(401).send('Contraseña Incorrecta')
		}else if(dbResponse[0].active == false){
			res.status(404).send('Este usuario se encuentra inactivo')
		}else{
			const token = jwt.sign({
				id: dbResponse[0].id,
				name: dbResponse[0].name,
				type: dbResponse[0].type,
				exp: Math.floor(Date.now() / 1000) + 600
			}, secret)
			res.status(200).send({...dbResponse[0], jwt: token})
		}
	}catch(err){
		console.log(err)
		res.status(500).send('error del servidor')
	}
})

//Obtener el numero de Factura a emitir
app.get('/api/getIdInvoice', mw.forAdmins, async (req, res) => {
	try{
		const dbResponse = await getIdInvoice()
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send('error del servidor')
	}
})

app.post('/api/issueInvoice', mw.forAdmins, async (req, res) => {
	const token = req.headers.authorization.split(" ")[1]
	const payload = jwt.verify(token, secret)
	try {
		const dbResponse = await issueInvoice(req.body)
		if(dbResponse === true){
			res.status(200).send("Factura creada exitosamente")
		}else{
			res.status(404).send("No se ah encontrado al estudiante")
		}
	} catch (err) {
		console.log(err)
		res.status(500).send('Error del servidor')
	}
})

//Obtener facturas por verificar
app.get('/api/getinvoicesVerification/:page', mw.forAdmins, async (req, res) => {
	const page = Number(req.params.page)
	try{
		const dbResponse = await getinvoicesVerification(page)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(404).send('Error del servidor, No pudo traer facturas por verificar')
	}
})
//Obtener facturas por verificar y por ID de paciente
app.get('/api/getInvoicesVerificationById/:patientId/:page', mw.forAdmins, async (req, res) => {
	const patientId = req.params.patientId
	const page = Number(req.params.page)
	try{
		const dbResponse = await getinvoicesVerificationById(patientId, page)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(404).send('Error del servidor, No pudo traer facturas deacuerdo al ID proporcionado')
	}
})
//Verificar factura
app.post('/api/verifyInvoice', mw.forAdmins, async (req, res) => {
	const {idParam, status} = req.body
	try{
		const dbResponse = await verifyInvoice(idParam, status)
		res.status(200).send('La factura ha sido verificada con exitosamente')
	}catch(err){
		console.log(err)
		res.status(500).send('Error del servidor, No pudo actualizar el estado de la factura')
	}
})

//Modificar para obtener citas por cedula de pagador
app.get('/api/getInvoices/:patientId/:page', mw.forAdmins, async (req, res) => {
	const patientId = req.params.patientId
	const page = Number(req.params.page)
	try{
		const dbResponse = await getInvoicesById(patientId, page)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(404).send('Usuario no encontrado')
	}
})

app.get('/api/getInvoices/:page', mw.forAdmins, async (req, res) => {
	const page = Number(req.params.page)
	try{
		const dbResponse = await getAllinvoices(page)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(404).send('Usuario no encontrado')
	}
})

app.get('/api/getDailyReport', mw.forAdmins, async (req, res) => {
	try{

		const currentDate = new Date
		const roofLimit = new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 28)
		const floorLimit = new Date(currentDate.getFullYear(), currentDate.getMonth()-1, currentDate.getDate())

		const stream = res.writeHead(200, {
			"Content-Type": "aplication/pdf",
			"Content-Disposition": `attachment; filename=Reporte del ${floorLimit.toDateString()}.pdf`
		})

		const dbResponse = await getReportInfo(floorLimit, roofLimit)
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

//Endpoint para procesos de inscripcion masiva

//Periodos

app.post('/api/openPeriod', mw.forAdmins, async (req, res) => {
	try{
		const dbResponse = await openPeriod(req.body)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.get('/api/getPeriods', mw.forAdmins, async (req, res) => {
	try{
		const dbResponse = await getPeriods()
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.get('/api/getCurrentPeriod', mw.forAdmins, async (req, res) => {
	try{
		const dbResponse = await getCurrentPeriod()
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.patch('/api/changeEndDatePeriod', mw.forAdmins, async (req, res) => {
	const {year, period, newEndDate} = req.body
	try{
		const dbResponse = await changeEndDatePeriod(year, period, newEndDate)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.post('/api/closePeriod', mw.forAdmins, async (req, res) => {
	const {year, period} = req.body
	try{
		const dbResponse = await closePeriod(year, period)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.get('/api/getActivePeriods', mw.forAdmins, async (req, res) => {
	try{
		const dbResponse = await getActivePeriods()
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

// Secciones
app.post('/api/openSection', mw.forAdmins, async (req, res) => {
	try {
		const dbResponse = await openSection(req.body)
		res.status(200).send(dbResponse)
	} catch (err) {
		res.status(500).send('Error al abrir la sección')
	}
})

app.get('/api/getSections/:id', mw.forAdmins, async (req, res) => {
	const id = req.params.id
	try {
		const dbResponse = await getSections(id)
		res.status(200).send(dbResponse)
	} catch (err) {
		res.status(500).send('Error al obtener las secciones')
	}
})

app.get('/api/getCurrentSection', mw.forAdmins, async (req, res) => {
	try {
		const dbResponse = await getCurrentSection()
		res.status(200).send(dbResponse)
	} catch (err) {
		res.status(500).send('Error al obtener la sección actual')
	}
})

app.get('/api/getSectionByModule/:moduleId', mw.forAdmins, async (req, res) => {
	const moduleId = req.params.moduleId
	try {
		const dbResponse = await getSectionByModule(moduleId)
		res.status(200).send(dbResponse)
	} catch (err) {
		res.status(500).send('Error al obtener las secciones')
	}
})

app.get('/api/getSectionByPeriod/:periodId', mw.forAdmins, async (req, res) => {
	const periodId = req.params.periodId
	try {
		const dbResponse = await getSectionByPeriod(periodId)
		res.status(200).send(dbResponse)
	} catch (err) {
		res.status(500).send('Error al obtener las secciones')
	}
})

app.post('/api/closeSection', mw.forAdmins, async (req, res) => {
	const { sectionId } = req.body
	try {
		const dbResponse = await closeSection(sectionId)
		res.status(200).send(dbResponse)
	} catch (err) {
		res.status(500).send('Error al cerrar la sección')
	}
})



app.post('/api/course', mw.forAdmins, async (req, res) => {
	const {description} = req.body
	try{
		const _dbResponse = await setCourse(description)
		res.status(200).send()	
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.post('/api/module', mw.forAdmins, async (req, res) => {
	const {description} = req.body
	try{
		const _dbResponse = await setModule(description)
		res.status(200).send()		
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.get('/api/course', mw.forAdmins, async (req, res) => {
	try{
		const dbResponse = await getAllCourses()
		res.status(200).send(dbResponse)	
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.get('/api/getAllModules', mw.forAdmins, async (req, res) => {
	try{
		const dbResponse = await getAllModules()
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.post('/api/deactivateModule', mw.forAdmins, async (req, res) => {
	const { moduleId } = req.body
	try{
		await deactivateModule(moduleId)
		res.status(200).send({ message: 'Módulo suspendido' })
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.get('/api/getSearchedModule/:idParam', mw.forAdmins, async (req, res) => {
	const idParam = req.params.idParam
	try{
		const dbResponse = await getSearchedModule(idParam)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)		
		res.status(404).send('Modulo no encontrado')
	}
})

app.get('/api/getEnrolledStudentsByModule/:idParam', mw.forAdmins, async (req, res) => {
	const idParam = req.params.idParam
	try{
		const dbResponse = await getEnrolledStudentsByModule(idParam)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.post('/api/getAssignedModules', mw.forAdmins, async (req, res) => {
	const {courseId} = req.body
	try{
		const dbResponse = await getAssignedModulesByCourse(courseId)
		res.status(200).send(dbResponse)		
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.post('/api/updateAssignedModules', mw.forAdmins, async (req, res) => {
    const { courseId, moduleIds } = req.body
    try{
        await updateAssignedModulesForCourse(courseId, moduleIds)
        res.status(200).send({ message: 'Modules updated' })
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

app.get('/api/getLastEnrollmentByStudentId/:id', mw.forAdmins, async (req, res) => {
	const id = Number(req.params.id)
	try{
		console.log(id)
		const dbResponse = await getLastEnrollmentByStudentId(id)
		console.log(dbResponse)
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

app.get('/api/getStudentsInSection/:sectionId', mw.forAdmins, async (req, res) => {
	const sectionId = req.params.sectionId
	try{
		const dbResponse = await getStudentsInSection(sectionId)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.post('/api/registerEnrollment', mw.forAdmins, async (req, res) => {
	const {studentId, sectionId} = req.body
	try{
		const dbResponse = await registerEnrollment(studentId, sectionId)
		res.status(200).send(dbResponse)		
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.patch('/api/updateEnrollmentState', mw.forAdmins, async (req, res) => {
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
// app.get('/api/getSettings', mw.forAdmins, async (req, res) => {
// 	try{
// 		const dbResponse = await getSettings()
// 		res.status(200).send(dbResponse)
// 	}catch(err){
// 		console.log(err)
// 		res.status(500).send(err)
// 	}
// })

app.post('/api/setLoadScores', mw.forAdmins, async (req, res) => {
	const data =req.body
	try{
		const dbResponse = await loadScores(data)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.get('/api/getScoreByStudent/:moduleId/:studentIdentification', mw.forAdmins, async (req, res) => {
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

app.post('/api/setUpdateScore',mw.forAdmins, async (req,res) => {
	const {studentId,moduleId, gradeId, lastScore,newScore,reason} = req.body
	try{
		const dbResponse = await updateScore(studentId,moduleId,gradeId,lastScore,newScore,reason)
		console.log(dbResponse)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.get('/api/getGradeStudentsBySection/:periodId/:sectionCode', mw.forAdmins, async (req, res) => {
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



app.get("/api/filterModules/:param", mw.forAdmins, async(req, res) => {
	try{
		const { param } = req.params;
		const dbResponse = await filterModules(param)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.get("/api/filterCourses/:param", mw.forAdmins, async(req, res) => {
	try{
		const { param } = req.params;
		const dbResponse = await filterCourses(param)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.get("/api/certificate/:certificateId", mw.forAdmins, async(req, res) => {
	try{
		const certificateId = req.params.certificateId;
		console.log(req.params)
		const dbResponse = await getCertificateInfo(certificateId)
		console.log(dbResponse)
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

app.get("/api/certificateList/", mw.forAdmins, async(req, res) => {
	try{
		const dbResponse = await getCertificateList();
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.get("/api/payments/:invoiceId", mw.forAdmins, async(req, res) => {
	try{
		const invoiceId = req.params.invoiceId
		const dbResponse = await getPaymentsByInvoice(invoiceId);
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.post("/api/payments", mw.forAdmins, async(req, res) => {
	try{
		const data: t.IPayment = req.body
		const _dbResponse = await makePayment(data)
		res.status(201).send()
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

//Students
app.post('/api/registerStudents', mw.forAdmins, async (req, res) => {
	try{
		const _dbResponse = await registerStudents(req.body)
		res.status(200).send()
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.get('/api/getStudentById/:id', mw.forAdmins,  async (req, res) => {
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

app.get('/api/getStudents/:page', mw.forAdmins, async (req, res) => {
	const page = Number(req.params.page)
	try{
		const dbResponse = await getStudents(page)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.post("/api/studentPhoto/:studentId", mw.parseFormData, mw.forAdmins, async (req, res) => {
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

app.post("/api/deactivateStudent", mw.forAdmins, async(req, res) => {
    const { id } = req.body;
    try {
        const dbResponse = await deactivateStudent(id);
        res.status(200).send(dbResponse);
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
})

app.get("/api/filterStudents/:param", mw.forAdmins, async(req, res) => {
	try{
		const { param } = req.params;
		const dbResponse = await filterStudents(param)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.get("/api/getStudentCard/:studentId", mw.forAdmins, async(req, res) => {
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
app.get("/api/getTeachers/:page", mw.forAdmins, async(req, res) => {
    const page = Number(req.params.page)
    try{
        const dbResponse = await getTeachers(page)
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

app.post("/api/registerTeacher", mw.forAdmins, async(req, res) => {
    try{
        const dbResponse = await registerTeacher(req.body)
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

app.post("/api/deactivateTeacher", mw.forAdmins, async(req, res) => {
    const { id } = req.body;
    try {
        const dbResponse = await deactivateTeacher(id);
        res.status(200).send(dbResponse);
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
})

app.get("/api/filterTeachers/:param", mw.forAdmins, async(req, res) => {
	try{
		const { param } = req.params;
		const dbResponse = await filterTeachers(param)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.post("/api/document/:studentId", mw.forAdmins, mw.saveDoc, async (req, res) => {
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

app.get("/api/document/:studentId", mw.forAdmins, async(req, res) => {
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
		res.sendFile(`\\data\\documents\\${docId}.pdf`, {root: '/'})
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

app.listen(port, "0.0.0.0", () => {
	console.log(`Puerto: ${port}`)
})