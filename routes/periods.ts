import express from "npm:express@4.18.2";
import * as mw from "../middlewares.ts"
import { closePeriod, getActivePeriods, getCurrentPeriod, getPeriods, openPeriod, updatePeriod } from "../dbConnection/period.ts";

const periodRoutes = express.Router();

periodRoutes.post('/open', mw.departmentWorker, async (req, res) => {
    try{
        const dbResponse = await openPeriod(req.body)
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

periodRoutes.post('/close', mw.departmentWorker, async (req, res) => {
    const {year, period} = req.body
    try{
        const dbResponse = await closePeriod(year, period)
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

periodRoutes.get('/', mw.departmentWorker, async (req, res) => {
    try{
        const dbResponse = await getPeriods()
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

periodRoutes.get('/current', mw.departmentWorker, async (req, res) => {
    try{
        const dbResponse = await getCurrentPeriod()
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

periodRoutes.get('/active', mw.departmentWorker, async (req, res) => {
    try{
        const dbResponse = await getActivePeriods()
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

periodRoutes.patch('/', mw.departmentWorker, async (req, res) => {
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