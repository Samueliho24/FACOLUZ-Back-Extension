import express from "npm:express@4.18.2";
import * as mw from '../middlewares.ts'
import { randomUUID } from "node:crypto";
import { saveDocument } from "../dbConnection/documents.ts";

const documentRoutes = express.Router();

documentRoutes.post("/:studentId", mw.departmentWorker, mw.saveDoc, async (req, res) => {
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

documentRoutes.get("/:docId", async(req, res) => {
    try{
        const docId = req.params.docId
        res.sendFile(`/data/documents/${docId}.pdf`, {root: '/'})
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

export default documentRoutes;