import { deactivateModule, filterModules, getAllModules, setModule } from "../dbConnection/modules.ts";
import { getEnrolledStudentsByModule } from "../dbConnection/students.ts";
import express, { type Request, type Response } from "npm:express@4.18.2";
import { permissionsList } from "../functions/PermissionHelper.ts";
import { getSectionByModule } from "../dbConnection/section.ts";
import * as mw from '../middlewares.ts'

const moduleRouter = express.Router();

const anyPermissionList = [
    permissionsList.crearModulo,
    permissionsList.editarModulo,
    permissionsList.listarModulos,
    permissionsList.desactivarModulo
]

//Crear modulo
moduleRouter.post('/', mw.singlePermission(permissionsList.crearModulo), async (req: Request, res: Response) => {
    const { description } = req.body
    try{
        const _dbResponse = await setModule(description)
        res.status(200).send()		
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

// Desactivar modulo
moduleRouter.post('/:moduleId/deactivate', mw.singlePermission(permissionsList.desactivarModulo), async (req: Request, res: Response) => {
    const moduleId = req.params.moduleId
    try{
        await deactivateModule(moduleId)
        res.status(200).send({ message: 'Módulo suspendido' })
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

// Obtener todos los modulos
moduleRouter.get('/', mw.multiplePermission(anyPermissionList), async (req: Request, res: Response) => {
    try{
        const dbResponse = await getAllModules()
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

//Filtrar modulos segun descripcion
moduleRouter.get('/:searchParam', mw.multiplePermission(anyPermissionList), async (req: Request, res: Response) => {
    const searchParam = req.params.searchParam;
    try{
        const dbResponse = await filterModules(searchParam)
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)		
        res.status(404).send('Modulo no encontrado')
    }
})

//Obtener estudiantes para un modulo determinado
moduleRouter.get('/:moduleId/students', mw.multiplePermission(anyPermissionList), async (req: Request, res: Response) => {
    const moduleId = req.params.moduleId
    try{
        const dbResponse = await getEnrolledStudentsByModule(moduleId)
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

// De verdad que no se que hace esto
// moduleRouter.get('/:moduleId/sections', mw.departmentWorker, async (req: Request, res: Response) => {
//     const { moduleId } = req.params;
//     const { sectionCode, periodId } = req.query;
//     console.log(moduleId, sectionCode, periodId)
//     try {
//         const cleanPeriodId = periodId?.replace(/\/$/, '');
//         const dbResponse = await getSectionByModule(moduleId, sectionCode, cleanPeriodId);
//         res.status(200).send(dbResponse);
//     } catch (err) {
//         console.log(err);
//         res.status(500).send(err);
//     }
// });

// Obtener secciones de un modulo
moduleRouter.get('/:moduleId/sections', mw.multiplePermission(anyPermissionList), async (req: Request, res: Response) => {
    const moduleId = req.params.moduleId
    try {
        const dbResponse = await getSectionByModule(moduleId)
        res.status(200).send(dbResponse)
    } catch (err) {
        res.status(500).send('Error al obtener las secciones')
    }
})
export default moduleRouter;