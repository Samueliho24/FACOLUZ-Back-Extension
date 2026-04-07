import { randomUUID } from "node:crypto";
import { query, execute } from "../dbConnection.ts"
import { IDocument } from "../types/IDocument.ts"

export async function saveDocument(doc: IDocument){
    const verification = await query(`
        SELECT docType FROM documents WHERE studentId = ?    
    `, [doc.studentId])
    

    verification.forEach((item: IDocument) => {
        console.log(item, doc.docType)
        if(item.docType == doc.docType){
            throw new Error("No puedes subir documentos duplicados")
        }
    });

    const _res = await execute(`
        INSERT INTO documents(id, studentId, docType) VALUES(?, ?, ?)    
    `, [doc.id, doc.studentId, doc.docType])
}

export async function getDocumentsList(studentId: string){
    const res = await query(`
        SELECT * FROM documents WHERE studentId = ?    
    `, [studentId])
    return res;
}