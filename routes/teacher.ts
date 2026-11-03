import express from "npm:express@4.18.2";
import * as mw from '../middlewares.ts'
import { deactivateTeacher, filterTeachers, getTeachers, registerTeacher } from "../dbConnection/teachers.ts";

const teacherRoutes = express.Router();

//Obtener lista de profesor
teacherRoutes.get("/:page", mw.departmentWorker, async(req, res) => {
    const page = Number(req.params.page)
    try{
        const dbResponse = await getTeachers(page)
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

//Obtener lista de profesores filtrada por numero de cedula o nombre
teacherRoutes.get("/list/:param", mw.departmentWorker, async(req, res) => {
    try{
        const { param } = req.params;
        const dbResponse = await filterTeachers(param)
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

// Crear nuevo profesor
teacherRoutes.post("/", mw.departmentWorker, async(req, res) => {
    try{
        const dbResponse = await registerTeacher(req.body)
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

//desactivar profesor
teacherRoutes.post("/:teacherId/deactivate", mw.departmentWorker, async(req, res) => {
    const { id } = req.body;
    try {
        const dbResponse = await deactivateTeacher(id);
        res.status(200).send(dbResponse);
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
})

export default teacherRoutes;