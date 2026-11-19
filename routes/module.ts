import express from "npm:express@4.18.2";
import * as mw from '../middlewares.ts'
import { deactivateModule, filterModules, getAllModules, getSearchedModule, setModule } from "../dbConnection/modules.ts";
import { getEnrolledStudentsByModule } from "../dbConnection/students.ts";
import { getSectionByModule } from "../dbConnection/section.ts";

const moduleRouter = express.Router();

//Crear modulo
moduleRouter.post('/', mw.departmentWorker, async (req, res) => {
    const {description} = req.body
    try{
        const _dbResponse = await setModule(description)
        res.status(200).send()		
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

// Desactivar modulo
moduleRouter.post('/:moduleId/deactivate', mw.departmentWorker, async (req, res) => {
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
moduleRouter.get('/', mw.departmentWorker, async (req, res) => {
    try{
        const dbResponse = await getAllModules()
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

//Filtrar modulos segun descripcion
moduleRouter.get('/:searchParam', mw.departmentWorker, async (req, res) => {
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
moduleRouter.get('/:moduleId/students', mw.departmentWorker, async (req, res) => {
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
// moduleRouter.get('/:moduleId/sections', mw.departmentWorker, async (req, res) => {
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
moduleRouter.get('/:moduleId/sections', mw.departmentWorker, async (req, res) => {
    const moduleId = req.params.moduleId
    try {
        const dbResponse = await getSectionByModule(moduleId)
        res.status(200).send(dbResponse)
    } catch (err) {
        res.status(500).send('Error al obtener las secciones')
    }
})
export default moduleRouter;