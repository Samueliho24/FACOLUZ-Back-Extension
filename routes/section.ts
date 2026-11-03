import express from "npm:express@4.18.2";
import * as mw from '../middlewares.ts'
import { closeSection, getSectionByModule, getSectionByPeriod, getSections, openSection, getActiveSections, getStudentsInSection } from "../dbConnection/section.ts";
import { getEnrollmentCountBySection } from "../dbConnection/enrollments.ts";

const sectionRoutes = express.Router();

// Abrir seccion
sectionRoutes.post('/open', mw.departmentWorker, async (req, res) => {
    try {
        const dbResponse = await openSection(req.body)
        res.status(200).send(dbResponse)
    } catch (err) {
        res.status(500).send('Error al abrir la sección')
    }
})

// Cerrar seccion
sectionRoutes.post('/close', mw.departmentWorker, async (req, res) => {
    const { sectionId } = req.body
    try {
        const dbResponse = await closeSection(sectionId)
        res.status(200).send(dbResponse)
    } catch (err) {
        res.status(500).send('Error al cerrar la sección')
    }
})

// Obtener secciones para un periodo
sectionRoutes.get('/period/:periodId', mw.departmentWorker, async (req, res) => {
    const periodId = req.params.periodId
    try {
        const dbResponse = await getSections(periodId)
        res.status(200).send(dbResponse)
    } catch (err) {
        res.status(500).send('Error al obtener las secciones')
    }
})

//Obtener secciones activas
sectionRoutes.get('/active', mw.departmentWorker, async (req, res) => {
    try {
        const dbResponse = await getActiveSections()
        res.status(200).send(dbResponse)
    } catch (err) {
        res.status(500).send('Error al obtener las secciónes')
    }
})
/*
sectionRoutes.get('/api/getSectionByModule/:moduleId', mw.departmentWorker, async (req, res) => {
    const moduleId = req.params.moduleId
    try {
        const dbResponse = await getSectionByModule(moduleId)
        res.status(200).send(dbResponse)
    } catch (err) {
        res.status(500).send('Error al obtener las secciones')
    }
})*/

// Obtener secciones de un modulo
sectionRoutes.get('/module/:moduleId', mw.departmentWorker, async (req, res) => {
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

sectionRoutes.get('/:sectionId/students', mw.departmentWorker, async (req, res) => {
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
sectionRoutes.get('/:sectionId/count', mw.departmentWorker, async (req, res) => {
    const { sectionId } = req.params;
    try {
        const count = await getEnrollmentCountBySection(sectionId);
        res.status(200).send({ count: count });
    } catch (err) {
        console.log(err);
        res.status(500).send({ error: 'Error al obtener conteo de inscritos' });
    }
});

// sectionRoutes.get('/period/:periodId', mw.departmentWorker, async (req, res) => {
//     const periodId = req.params.periodId
//     try {
//         const dbResponse = await getSectionByPeriod(periodId)
//         res.status(200).send(dbResponse)
//     } catch (err) {
//         res.status(500).send('Error al obtener las secciones')
//     }
// })



export default sectionRoutes;