import PDFDocument from "pdfkit"
import { ICertificate } from "../types/ICertificate.ts"

export function buildCertificate(dataCallback, endCallback, data: ICertificate){
    const doc = new PDFDocument()
    
    doc.on('data', dataCallback)
    doc.on('end', endCallback)

    doc.
}