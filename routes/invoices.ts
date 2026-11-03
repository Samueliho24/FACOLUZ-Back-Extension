import express from "npm:express@4.18.2";
import { cancelInvoice, getAllinvoices, getInvoicesById, getinvoicesVerification, getinvoicesVerificationById, issueInvoice } from "../dbConnection/invoices.ts";
import * as mw from "../middlewares.ts"

const invoiceRoutes = express.Router()

//Obtener facturas en estado pendiente
invoiceRoutes.get('/pending/:page', mw.departmentWorker, async (req, res) => {
    const page = Number(req.params.page)
    try{
        const dbResponse = await getinvoicesVerification(page)
        res.status(200).send(dbResponse)
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
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(404).send('Error del servidor, No pudo traer facturas deacuerdo al ID proporcionado')
    }
})

//Obtener citas por cedula de estudiante
invoiceRoutes.get('/:studentId/:page', mw.departmentWorker, async (req, res) => {
    const studentId = req.params.studentId
    const page = Number(req.params.page)
    try{
        const dbResponse = await getInvoicesById(studentId, page)
        res.status(200).send(dbResponse)
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
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(404).send('Usuario no encontrado')
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

invoiceRoutes.delete("/api/invoice/:invoiceId", mw.departmentWorker, async(req, res) => {
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