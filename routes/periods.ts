import { closePeriod, getActivePeriods, getCurrentPeriod, getPeriods, openPeriod, updatePeriod } from "../dbConnection/period.ts";
import express, { type Request, type Response } from "npm:express@4.18.2";
import { permissionsList } from "../functions/PermissionHelper.ts";
import { getSectionScores } from "../dbConnection/scores.ts";
import * as mw from "../middlewares.ts"

const periodRoutes = express.Router();

const anyPermissionList = [
    permissionsList.cerrarPeriodo,
    permissionsList.editarPeriodo,
    permissionsList.listarPeriodos,
    permissionsList.agregarPeriodo
]

periodRoutes.post('/open', mw.singlePermission(permissionsList.agregarPeriodo), async (req: Request, res: Response) => {
    try{
        const dbResponse = await openPeriod(req.body)
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

periodRoutes.post('/close', mw.singlePermission(permissionsList.cerrarPeriodo), async (req: Request, res: Response) => {
    const {year, period} = req.body
    try{
        const dbResponse = await closePeriod(year, period)
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

periodRoutes.get('/', mw.multiplePermission(anyPermissionList), async (_req: Request, res: Response) => {
    try{
        const dbResponse = await getPeriods()
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

periodRoutes.get('/:periodId/section/:sectionCode/scores', mw.singlePermission(permissionsList.listarNotas), async(req: Request, res: Response) => {
    try{
        const periodId = req.params.periodId;
        const sectionCode = req.params.sectionCode;

        const dbResponse = await getSectionScores(periodId, sectionCode)
        res.status(200).send(dbResponse);
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

periodRoutes.get('/current', mw.multiplePermission(anyPermissionList), async (_req: Request, res: Response) => {
    try{
        const dbResponse = await getCurrentPeriod()
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

periodRoutes.get('/active', mw.multiplePermission(anyPermissionList), async (_req: Request, res: Response) => {
    try{
        const dbResponse = await getActivePeriods()
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

periodRoutes.patch('/', mw.singlePermission(permissionsList.editarPeriodo), async (req: Request, res: Response) => {
    const {year, period, newEndDate, newStartDate} = req.body
    try{
        const dbResponse = await updatePeriod(year, period, newEndDate, newStartDate)
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

export default periodRoutes;