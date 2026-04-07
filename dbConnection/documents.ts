import { randomUUID } from "node:crypto";
import { query, execute } from "../dbConnection.ts"
import { IDocument } from "../types/IDocument.ts"

export async function saveDocument(doc: IDocument){
    const id = randomUUID();
    const _res = await execute(`
        INSERT INTO documents(id, studentId, docType) VALUES(?, ?, ?)    
    `, [id, doc.studentId, doc.docType])
}

export async function getDocumentsList(studentId: string){
    const res = await query(`
        SELECT * FROM documents WHERE studentId = ?    
    `, [studentId])
    return res;
}