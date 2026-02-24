import PDFDocument from "pdfkit"
import { ICertificate } from "../types/ICertificate.ts"
import { mergeDate } from "../functions/formatDateTime.ts"

export function buildCertificate(dataCallback: any, endCallback: any, data: ICertificate) {
    // Configuración vertical (Portrait) según la imagen
    const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, left: 50, right: 50, bottom: 40 }
    });

    doc.on('data', dataCallback);
    doc.on('end', endCallback);

    const pageWidth = doc.page.width;

    // --- 1. ENCABEZADO SUPERIOR ---
    // Logo LUZ (Izquierda) y FaCO-LUZ (Derecha)
    doc.image('./assets/Logo_LUZ.png', 60, 40, { width: 50 });
    doc.image('./assets/Logo_FacoLuz.png', pageWidth - 110, 40, { width: 60 });

    // Texto Central del Encabezado
    doc.fillColor('#000')
        .fontSize(10)
        .text('República Bolivariana de Venezuela', 50, 50, { align: 'center' })
        .text('Universidad del Zulia', { align: 'center' })
        .text('Facultad de Odontología', { align: 'center' })
        .text('División de Extensión', { align: 'center' });

    // --- 2. FRANJA NEGRA DECORATIVA ---
    doc.moveDown(2);
    doc.rect(50, doc.y, pageWidth - 100, 40)
        .fill('#1a1a1a'); 

    // --- 3. LOGOS VERTICALES IZQUIERDOS ---
    // Según la foto, hay unos logos alineados verticalmente a la 
    const yStartLogos = 300;
    doc.image('./assets/Logo_LUZ.png', 50, yStartLogos, { width: 35 });
    doc.image('./assets/Logo_FacoLuz.png', 50, yStartLogos + 60, { width: 35 });

    // --- 4. CUERPO DEL CERTIFICADO ---
    doc.fillColor('#000');
    doc.moveDown(4);
    
    doc.fontSize(14).text('Certificado que se otorga a:', { align: 'center' });

    doc.moveDown(1);
    // Nombre en Cursiva (Usa una fuente tipo 'Script' o 'ZapfChancery')
    // Nota: Debes cargar la fuente si no es estándar
    doc.font('Times-Italic') 
        .fontSize(28)
        .text(`${data.name} ${data.lastname}`, { align: 'center' });

    doc.moveDown(0.5);
    doc.font('Helvetica-Bold')
        .fontSize(18)
        .text(`C.I. ${data.studentsIdentification}`, { align: 'center' });

    // Línea divisoria fina
    doc.moveDown(1);
    doc.moveTo(150, doc.y).lineTo(pageWidth - 150, doc.y).lineWidth(0.5).stroke();

    doc.moveDown(1);
    doc.font('Helvetica-Oblique').fontSize(14).text('Por haber aprobado el curso:', { align: 'center' });

    doc.moveDown(0.5);
    doc.font('Times-BoldItalic').fontSize(26).text(`${data.course_name}`, { align: 'center' });

    // Detalles adicionales
    doc.moveDown(1);
    doc.font('Helvetica').fontSize(11)
        .text(`Duración: 540 Horas`, { align: 'center' })
        .text(`II Periodo 2025`, { align: 'center' });

    doc.moveDown(2);
    doc.text('Maracaibo – Estado Zulia', { align: 'center' });

    // --- 5. SECCIÓN DE FIRMAS ---
    const yFirmas = 650;
    
    // Firma Izquierda
    doc.fontSize(11).font('Helvetica-Bold')
        .text('Dr. Roberto García', 70, yFirmas, { width: 200, align: 'center' });
    doc.font('Helvetica').text('Decano', 70, yFirmas + 15, { width: 200, align: 'center' });

    // Firma Derecha
    doc.font('Helvetica-Bold')
        .text('Dra. Maryoris Yerena', pageWidth - 270, yFirmas, { width: 200, align: 'center' });
    doc.font('Helvetica').text('Directora', pageWidth - 270, yFirmas + 15, { width: 200, align: 'center' });

    // --- 6. PIE DE PÁGINA (ID Y FECHA) ---
    const yFooter = 780;
    doc.moveTo(50, yFooter - 10).lineTo(pageWidth - 50, yFooter - 10).strokeColor('#ccc').lineWidth(0.5).stroke();

    doc.fontSize(9).fillColor('#444');
    doc.text(`ID de Verificación: ${data.certificate_id}`, 60, yFooter);
    doc.text(`Fecha de Emisión: ${mergeDate(data.date)}`, pageWidth - 250, yFooter, { align: 'right' });

    doc.end();
}