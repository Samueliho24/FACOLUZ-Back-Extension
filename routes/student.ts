import express from "npm:express@4.18.2";
import * as mw from '../middlewares.ts'
import { getEnrollmentHistory, getLastEnrollmentByStudentId } from "../dbConnection/enrollments.ts";
import { deactivateStudent, filterStudents, getStudentById, getStudentCardInfo, getStudents, registerStudents } from "../dbConnection/students.ts";
import { buildCarnet } from "../PdfModels/carnet.ts";
import { getDocumentsList } from "../dbConnection/documents.ts";

const studentRoutes = express.Router();

//Crear nuevo estudiante
studentRoutes.post('/', mw.departmentWorker, async (req, res) => {
    try{
        const _dbResponse = await registerStudents(req.body)
        res.status(200).send()
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

//Subir o actualizar foto de estudiante
studentRoutes.post("/:studentId/photo", mw.parseFormData, mw.departmentWorker, async (req, res) => {
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

//desactivar estudiante
studentRoutes.post("/:studentId/deactivate", mw.departmentWorker, async(req, res) => {
    const studentId = req.params.studentId;
    try {
        const dbResponse = await deactivateStudent(studentId);
        res.status(200).send(dbResponse);
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
})

//Obtener ultima inscripcion de un estudiante
studentRoutes.get('/:studentId/lastEnrollment', mw.departmentWorker, async (req, res) => {
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

//Obtener estudiante por cedula
studentRoutes.get('/:identification', mw.departmentWorker,  async (req, res) => {
    const identification = Number(req.params.identification)
    try{
        const dbResponse = await getStudentById(identification)
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

//Obtener lista de estudiantes
studentRoutes.get('/list/:page', mw.departmentWorker, async (req, res) => {
    const page = Number(req.params.page)
    try{
        const dbResponse = await getStudents(page)
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

//Lista de estudiantes filtrados por numero de cedula 
studentRoutes.get("/list/:param", mw.departmentWorker, async(req, res) => {
    try{
        const param = req.params.param;
        const dbResponse = await filterStudents(param)
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

//Descargar carnet de un estudiante
studentRoutes.get("/:studentId/card", mw.departmentWorker, async(req, res) => {
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

//Obtener lista de documentos para un estudiante
studentRoutes.get("/:studentId/docs", mw.departmentWorker, async(req, res) => {
	try{
		const studentId = req.params.studentId;
		const dbResponse = await getDocumentsList(studentId)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

//Historial de inscripciones para un alumno
studentRoutes.get('/history/:studentId', mw.departmentWorker, async (req, res) => {
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

export default studentRoutes;