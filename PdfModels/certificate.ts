import PDFDocument from "pdfkit"
import { ICertificate } from "../types/ICertificate.ts"
import { mergeDate } from "../functions/formatDateTime.ts"

export function buildCertificate(dataCallback, endCallback, data: ICertificate){
    console.log(data)
    const doc = new PDFDocument()
    
    doc.on('data', dataCallback)
    doc.on('end', endCallback)

    doc.image('./assets/Logo_LUZ.png', 70, 50, {width: 60, align: 'center', valign: 'center'})
    doc.image('./assets/Logo_FacoLuz.png', 450, 60, {width: 110, align: 'center', valign: 'center'})
    doc.fontSize(30).text('Certificado', 50, 70, {align: 'center'})
    doc.fontSize(12).text('Facultad de Odontologia de la Universidad del Zulia', {align: 'center'})

    doc.moveDown();

    doc.text(" ")
    doc.moveTo(70, 140)
    .lineTo(560, 140)
    .stroke();

    doc.text(" ", 75, 150)
    doc.text(" ")

    doc.fontSize(30).text(`${data.course_name}`, {align: 'center'})
    doc.text(" ")
    doc.fontSize(12).text(`El departamento de extension de la facultad de odontologia de la Universidad del Zulia presenta el siguiente certificado al ciudadano ${data.name} ${data.lastname}, portador de la cedula de identidad numero V-${data.studentsIdentification} por haber culminado con exito el curso de: ${data.course_name}. Dicho certificado se otorga el dia ${mergeDate(data.date)} bajo el identificador: ${data.certificate_id}`, {align: 'justify'})

    doc.end()
}