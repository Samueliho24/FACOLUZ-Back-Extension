import PDFDocument from "pdfkit";
import { ICarnet } from "../types/ICarnet.ts";

export function buildCarnet(dataCallback: any, endCallback: any, data: ICarnet){
    const doc = new PDFDocument()

    doc.on('data', dataCallback);
    doc.on('end', endCallback);

    doc.image(`/data/profilePics/${data.id}.png`, 50, 50, {width: 35});
    doc.text(`${data.name} ${data.lastname}`)
    doc.text(`${data.studentsIdentification}`)

    doc.end();
}