import { cancelInvoice, getAllinvoices, getInvoicesById, getPendingInvoices, getinvoicesVerificationById, issueInvoice } from "../dbConnection/invoices.ts";
import express, { type Request, type Response } from "npm:express@4.18.2";
import { getPaymentsByInvoice } from "../dbConnection/payments.ts";
import { parseInvoiceForJson } from "../functions/parseInvoices.ts";
import { permissionsList } from "../functions/PermissionHelper.ts";
import { Iinvoice } from "../types/invoice.ts";
import * as mw from "../middlewares.ts"

const invoiceRoutes = express.Router()

const anyPermissionList = [
    permissionsList.abonarFactura,
    permissionsList.anularFactura,
    permissionsList.listarFacturas,
    permissionsList.generarFactura
]

// Obtener pagos para una factura
invoiceRoutes.get('/:invoiceId/payments', mw.multiplePermission(anyPermissionList), async(req: Request, res: Response) => {
    try{
        const invoiceId = req.params.invoiceId;
        const dbResponse = await getPaymentsByInvoice(invoiceId);
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

//Obtener facturas en estado pendiente
invoiceRoutes.get('/pending/:page', mw.multiplePermission(anyPermissionList), async (req: Request, res: Response) => {
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
invoiceRoutes.get('/pending/:patientId/:page', mw.multiplePermission(anyPermissionList), async (req: Request, res: Response) => {
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
invoiceRoutes.get('/:studentId/:page', mw.multiplePermission(anyPermissionList), async (req: Request, res: Response) => {
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
invoiceRoutes.get('/:page', mw.multiplePermission(anyPermissionList), async (req: Request, res: Response) => {
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

//Emitir nueva factura
invoiceRoutes.post('/', mw.singlePermission(permissionsList.generarFactura), async (req: Request, res: Response) => {
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

// Reversar una factura
invoiceRoutes.delete("/:invoiceId", mw.singlePermission(permissionsList.anularFactura), async(req: Request, res: Response) => {
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