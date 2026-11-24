import { closeSection, getSections, openSection, getActiveSections, getStudentsInSection } from "../dbConnection/section.ts";
import { getEnrollmentCountBySection } from "../dbConnection/enrollments.ts";
import express, { type Request, type Response } from "npm:express@4.18.2";
import { permissionsList } from "../functions/PermissionHelper.ts";
import * as mw from '../middlewares.ts'

const sectionRoutes = express.Router();

const anyPermissionList = [
    permissionsList.abrirSeccion,
    permissionsList.cerrarSeccion,
    permissionsList.listarSecciones
]

// Abrir seccion
sectionRoutes.post('/open', mw.singlePermission(permissionsList.abrirSeccion), async (req: Request, res: Response) => {
    try {
        const dbResponse = await openSection(req.body)
        res.status(200).send(dbResponse)
    } catch (err) {
        console.log(err)
        res.status(500).send('Error al abrir la sección')
    }
})

// Cerrar seccion
sectionRoutes.post('/close', mw.singlePermission(permissionsList.cerrarSeccion), async (req: Request, res: Response) => {
    const { sectionId } = req.body
    try {
        const dbResponse = await closeSection(sectionId)
        res.status(200).send(dbResponse)
    } catch (err) {
        console.log(err)
        res.status(500).send('Error al cerrar la sección')
    }
})

// Obtener secciones para un periodo
sectionRoutes.get('/period/:periodId', mw.multiplePermission(anyPermissionList), async (req: Request, res: Response) => {
    const periodId = req.params.periodId
    try {
        const dbResponse = await getSections(periodId)
        res.status(200).send(dbResponse)
    } catch (err) {
        console.log(err)
        res.status(500).send('Error al obtener las secciones')
    }
})

//Obtener secciones activas
sectionRoutes.get('/active', mw.multiplePermission(anyPermissionList), async (_req: Request, res: Response) => {
    try {
        const dbResponse = await getActiveSections()
        res.status(200).send(dbResponse)
    } catch (err) {
        console.log(err)
        res.status(500).send('Error al obtener las secciónes')
    }
})

sectionRoutes.get('/:sectionId/students', mw.multiplePermission(anyPermissionList), async (req: Request, res: Response) => {
    const sectionId = req.params.sectionId
    try{
        const dbResponse = await getStudentsInSection(sectionId)
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

//Cuenta la cantidad de inscritos en una seccion
sectionRoutes.get('/:sectionId/count', mw.multiplePermission(anyPermissionList), async (req: Request, res: Response) => {
    const { sectionId } = req.params;
    try {
        const count = await getEnrollmentCountBySection(sectionId);
        res.status(200).send({ count: count });
    } catch (err) {
        console.log(err);
        res.status(500).send({ error: 'Error al obtener conteo de inscritos' });
    }
});

// sectionRoutes.get('/period/:periodId', mw.departmentWorker, async (req: Request, res: Response) => {
//     const periodId = req.params.periodId
//     try {
//         const dbResponse = await getSectionByPeriod(periodId)
//         res.status(200).send(dbResponse)
//     } catch (err) {
//         res.status(500).send('Error al obtener las secciones')
//     }
// })



export default sectionRoutes;