import { deactivateTeacher, filterTeachers, getTeachers, registerTeacher } from "../dbConnection/teachers.ts";
import express, { type Request, type Response } from "npm:express@4.18.2";
import { permissionsList } from "../functions/PermissionHelper.ts";
import * as mw from '../middlewares.ts'

const teacherRoutes = express.Router();

const anyPermissionList = [
    permissionsList.listarProfesores,
    permissionsList.agregarProfesor,
    permissionsList.desactivarProfesor
]

//Obtener lista de profesor
teacherRoutes.get("/:page", mw.multiplePermission(anyPermissionList), async(req: Request, res: Response) => {
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
teacherRoutes.get("/list/:param", mw.multiplePermission(anyPermissionList), async(req: Request, res: Response) => {
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
teacherRoutes.post("/", mw.singlePermission(permissionsList.agregarProfesor), async(req: Request, res: Response) => {
    try{
        const dbResponse = await registerTeacher(req.body)
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

//desactivar profesor
teacherRoutes.post("/:teacherId/deactivate", mw.singlePermission(permissionsList.desactivarProfesor), async(req: Request, res: Response) => {
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