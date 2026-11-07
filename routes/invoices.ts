import express from "npm:express@4.18.2";
import { cancelInvoice, getAllinvoices, getInvoicesById, getPendingInvoices, getinvoicesVerificationById, issueInvoice } from "../dbConnection/invoices.ts";
import * as mw from "../middlewares.ts"
import { getPaymentsByInvoice } from "../dbConnection/payments.ts";
import { Iinvoice } from "../types/invoice.ts";
import { parseInvoiceForJson } from "../functions/parseInvoices.ts";

const invoiceRoutes = express.Router()

//Obtener facturas en estado pendiente
invoiceRoutes.get('/pending/:page', mw.departmentWorker, async (req, res) => {
    const page = Number(req.params.page)
    try{
        const dbResponse: Iinvoice[] = await getPendingInvoices(page)
        const invoices = dbResponse.map(item => parseInvoiceForJson(item))
        res.status(200).send(invoices)
    }catch(err){
        console.log(err)
        res.status(404).send('Error del servidor, No pudo traer facturas por verificar')
    }
})

//Obtener facturas en estado pendiente filtrado por ID de estudiante
invoiceRoutes.get('/pending/:patientId/:page', mw.departmentWorker, async (req, res) => {
    const patientId = req.params.patientId
    const page = Number(req.params.page)
    try{
        const dbResponse = await getinvoicesVerificationById(patientId, page)
        const invoices = dbResponse.forEach(item => parseInvoiceForJson(item))
        res.status(200).send(invoices)
    }catch(err){
        console.log(err)
        res.status(404).send('Error del servidor, No pudo traer facturas deacuerdo al ID proporcionado')
    }
})

//Obtener facturas por cedula de estudiante
invoiceRoutes.get('/:studentId/:page', mw.departmentWorker, async (req, res) => {
    const studentId = req.params.studentId
    const page = Number(req.params.page)
    try{
        const dbResponse = await getInvoicesById(studentId, page)
        const invoices = dbResponse.map(item => parseInvoiceForJson(item))
        res.status(200).send(invoices)
    }catch(err){
        console.log(err)
        res.status(404).send('Usuario no encontrado')
    }
})

//Obtener todas las facturas
invoiceRoutes.get('/:page', mw.departmentWorker, async (req, res) => {
    const page = Number(req.params.page)
    try{
        const dbResponse = await getAllinvoices(page)
        const invoices = dbResponse.map(item => parseInvoiceForJson(item))
        res.status(200).send(invoices)
    }catch(err){
        console.log(err)
        res.status(404).send('Usuario no encontrado')
    }
})

invoiceRoutes.get("/:invoiceId/payments", mw.departmentWorker, async(req, res) => {
    try{
        const invoiceId = req.params.invoiceId
        const dbResponse = await getPaymentsByInvoice(invoiceId);
        const invoices = dbResponse.map(item => parseInvoiceForJson(item))
        res.status(200).send(invoices)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

//Emitir nueva factura
invoiceRoutes.post('/', mw.departmentWorker, async (req, res) => {
    try {
        const dbResponse = await issueInvoice(req.body)
        if(dbResponse === true){
            res.status(200).send("Factura creada exitosamente")
        }else{
            res.status(404).send("No se ah encontrado al estudiante")
        }
    } catch (err) {
        console.log(err)
        res.status(500).send('Error del servidor')
    }
})

invoiceRoutes.delete("/:invoiceId", mw.departmentWorker, async(req, res) => {
    try{
        const invoiceId: string = req.params.invoiceId;
        const _dbResponse = await cancelInvoice(invoiceId)
        res.status(200).send()
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

export default invoiceRoutes;