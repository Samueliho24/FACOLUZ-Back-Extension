import express from "npm:express@4.18.2";
import * as mw from "../middlewares.ts"
import { ChangePrices, GetBillables } from "../dbConnection/billables.ts";

const listsRoutes = express.Router()

listsRoutes.get('/billables', mw.departmentWorker, async (req, res) => {
    try{	
        const dbResponse = await GetBillables()
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

listsRoutes.put('/prices', mw.departmentChief, async (req, res) => {
    const newPrices = req.body
    try{
        const _dbResponse = await ChangePrices(newPrices)
        res.status(200).send()
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

export default listsRoutes;