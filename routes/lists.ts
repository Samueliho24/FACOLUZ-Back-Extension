import express, { type Request, type Response } from "npm:express@4.18.2";
import { ChangePrices, GetBillables } from "../dbConnection/billables.ts";
import { permissionsList } from "../functions/PermissionHelper.ts";
import * as mw from "../middlewares.ts"

const listsRoutes = express.Router()

listsRoutes.get('/billables', mw.anyValidToken, async (req: Request, res: Response) => {
    try{	
        const dbResponse = await GetBillables()
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

listsRoutes.put('/prices', mw.singlePermission(permissionsList.modificarPrecios), async (req: Request, res: Response) => {
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