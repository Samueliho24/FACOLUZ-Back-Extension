import express from "npm:express@4.18.2";
import * as mw from '../middlewares.ts'
import { filterCourses, getAllCourses, setCourse, updateAssignedModulesForCourse } from "../dbConnection/courses.ts";
import { getAssignedModulesByCourse } from "../dbConnection/modules.ts";
import { getModulesByStudent } from "../dbConnection/enrollments.ts";

const courseRoutes = express.Router();

//Crear curso
courseRoutes.post('/', mw.departmentWorker, async (req, res) => {
    const {description} = req.body
    try{
        const _dbResponse = await setCourse(description)
        res.status(200).send()	
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

//Actualizar o asignar modulos a un curso 
courseRoutes.patch('/:courseId/modules', mw.departmentWorker, async (req, res) => {
    const { moduleIds } = req.body
    const courseId = req.params.courseId
    try{
        await updateAssignedModulesForCourse(courseId, moduleIds)
        res.status(200).send({ message: 'Modules updated' })
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

//Obtener modulos para un curso
courseRoutes.get('/:courseId/modules', mw.departmentWorker, async (req, res) => {
    const courseId = req.params.courseId
    try{
        const dbResponse = await getAssignedModulesByCourse(courseId)
        res.status(200).send(dbResponse)		
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

//Obtener todos los cursos
courseRoutes.get('/', mw.departmentWorker, async (req, res) => {
    try{
        const dbResponse = await getAllCourses()
        res.status(200).send(dbResponse)	
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

//Filtrar cursos por descripcion
courseRoutes.get("/:param", mw.departmentWorker, async(req, res) => {
    try{
        const param = req.params.param;
        const dbResponse = await filterCourses(param)
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

//Obtener modulos de un curso para un estudiante
courseRoutes.get('/:courseId/:studentId', mw.departmentWorker, async (req, res) => {
    const { studentId, courseId } = req.params;
    try {
        const modules = await getModulesByStudent(studentId, courseId);
        res.status(200).send(modules);
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
});

export default courseRoutes;