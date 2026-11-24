import express, { type Request, type Response } from "npm:express@4.18.2";
import { makePayment } from "../dbConnection/payments.ts";
import * as mw from "../middlewares.ts"
import * as t from "../interfaces.ts"
import { permissionsList } from "../functions/PermissionHelper.ts";

const paymentRoutes = express.Router()

paymentRoutes.post("/", mw.singlePermission(permissionsList.abonarFactura), async(req: Request, res: Response) => {
    try{
        const data: t.IPayment = req.body
        const paymentResult = await makePayment(data)
        if(paymentResult === true){
            res.status(200).send()
        }else{
            res.status(201).send()
        }
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

export default paymentRoutes