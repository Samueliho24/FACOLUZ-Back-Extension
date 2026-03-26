import PDFDocument from "pdfkit";
import { ICarnet } from "../types/ICarnet.ts";

export function buildCarnet(dataCallback: any, endCallback: any, data: ICarnet){
    const doc = new PDFDocument()

    doc.on('data', dataCallback);
    doc.on('end', endCallback);

    //Recuadro para delimitar
    doc.moveTo(50, 50)
    .lineTo(50, 240)
    .lineTo(203, 240)
    .lineTo(203, 50)
    .stroke();

    doc.image("./assets/CardBanner.png", 50, 50, {width: 153})
    doc.image(`/data/profilePics/${data.id}.png`, 100, 115, {width: 50, height: 55});
    doc.text(`${data.name} ${data.lastname}`, 50, 175, {
        width: 153,
        align: 'center'
    })
    doc.text(`C.I.: ${data.studentsIdentification}`, 50, 190, {
        width: 153,
        align: 'center'
    })

    doc.end();
}