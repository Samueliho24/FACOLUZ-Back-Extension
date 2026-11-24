import express, { type Request, type Response } from "npm:express@4.18.2";
import { permissionsList } from "../functions/PermissionHelper.ts";
import { saveDocument } from "../dbConnection/documents.ts";
import { randomUUID } from "node:crypto";
import * as mw from '../middlewares.ts'

const documentRoutes = express.Router();

// Recibir documento de un estudiante
documentRoutes.post("/:studentId", mw.singlePermission(permissionsList.subirDocumentoEstudiante), mw.saveDoc, async (req: Request, res: Response) => {
    const file = req.file
    try{
        const studentId = req.params.studentId;
        const fileName = randomUUID()
        Deno.rename(file.path, `/data/documents/${fileName}.pdf`)
        const doc = {id: fileName, studentId: studentId, docType: req.body.docType }
        const _dbResponse = await saveDocument(doc)
        res.status(201).send()
    }catch(err){
        Deno.remove(file.path)
        console.log(err)
        res.status(500).send(err)
    }
})

// Descargar documento de un estudiante
documentRoutes.get("/:docId", mw.singlePermission(permissionsList.descargarDocumentoEstudiante),async(req: Request, res: Response) => {
    try{
        const docId = req.params.docId
        res.sendFile(`/data/documents/${docId}.pdf`, {root: '/'})
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

export default documentRoutes;