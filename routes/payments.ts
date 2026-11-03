import express from "npm:express@4.18.2";
import { getPaymentsByInvoice, makePayment } from "../dbConnection/payments.ts";
import * as mw from "../middlewares.ts"
import * as t from "../interfaces.ts"

const paymentRoutes = express.Router()

paymentRoutes.get("/:invoiceId", mw.departmentWorker, async(req, res) => {
    try{
        const invoiceId = req.params.invoiceId
        const dbResponse = await getPaymentsByInvoice(invoiceId);
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

paymentRoutes.post("/", mw.departmentWorker, async(req, res) => {
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