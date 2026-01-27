import PDFDocument from "pdfkit"
import { Iinvoice } from '../types/invoice.ts' 

export function BuildReport(dataCallback, endCallback, invoiceList: Iinvoice[]){
    const doc = new PDFDocument()
    const date = new Date()

    //Cantidades
    const facturasExoneradas = FacturasExoneradas(invoiceList)
    const facturasDolares = FacturasDolares(invoiceList)
    const facturasBsTranf = FacturasBsTranf(invoiceList)
    const facturasBsEfectivo = FacturasBsEfectivo(invoiceList)

    //Montos
    const totalDolares = calcularIngreso(facturasDolares)
    const totalBsEfectivo = calcularIngreso(facturasBsEfectivo)
    const totalBsTranf = calcularIngreso(facturasBsTranf)

    //Consultas
    const facturasCirugia = FacturasCirugia(invoiceList)
    const facturasEndodoncia = FacturasEndodoncia(invoiceList)
    const facturasOrtodoncia = FacturasOrtodoncia(invoiceList)
    const facturasPeridoncia = FacturasPeridoncia(invoiceList)
    const facturasProtesisTotal = FacturasProtesisTotal(invoiceList)
    const facturasProtesisParcialRemovible = FacturasProtesisParcialRemovible(invoiceList)
    const facturasProtesisParcialFija = FacturasProtesisParcialFija(invoiceList)
    const facturasCia = FacturasCia(invoiceList)
    const facturasCian = FacturasCian(invoiceList)
    const facturasEmergenciaCia = FacturasEmergenciaCia(invoiceList)
    const facturasEmergenciaCian = FacturasEmergenciaCian(invoiceList)

    doc.on('data', dataCallback)
    doc.on('end', endCallback)

    doc.image('./assets/Logo_LUZ.png', 70, 50, {width: 60, align: 'center', valign: 'center'})
    doc.image('./assets/Logo_FacoLuz.png', 450, 60, {width: 110, align: 'center', valign: 'center'})
    doc.fontSize(12).text('Reporte diario de administracion', 50, 70, {align: 'center'})
    doc.text('facultad de Odontologia de la Universidad del Zulia', {align: 'center'})
    doc.text(`Reporte del dia: ${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`, {align: 'center'})

    doc.moveDown();

    doc.text(" ")
    doc.moveTo(70, 140)
    .lineTo(560, 140)
    .stroke();

    doc.text(" ", 75, 150)
    doc.text(`Total de facturas expedidas: ${invoiceList.length} facturas`)
    doc.text(`Facturas exoneradas: ${facturasExoneradas.length} facturas`)
    doc.text(`Facturas canceladas en dolares: ${facturasDolares.length} facturas`)
    doc.text(`Facturas canceladas en bolivares: ${facturasBsEfectivo.length + facturasBsTranf.length} facturas`)

    doc.text(" ")

    doc.text(`Ingreso total en dolares: ${totalDolares}$`)
    doc.text(`Ingreso total en bolivares: ${totalBsEfectivo + totalBsTranf}Bs`)
    doc.text(`Bolivares en efectivo: ${totalBsEfectivo}Bs`)
    doc.text(`Bolivares en transferencia: ${totalBsTranf}Bs`)

    doc.text(" ")


    doc.text(`Facturas para cirugia: ${facturasCirugia.length}`)
    doc.text(`Facturas para endodoncia: ${facturasEndodoncia.length}`)
    doc.text(`Facturas para ortodoncia: ${facturasOrtodoncia.length}`)
    doc.text(`Facturas para peridoncia: ${facturasPeridoncia.length}`)
    doc.text(`Facturas para protesis total: ${facturasProtesisTotal.length}`)
    doc.text(`Facturas para protesis parcial removible: ${facturasProtesisParcialRemovible.length}`)
    doc.text(`Facturas para protesis parcial fija: ${facturasProtesisParcialFija.length}`)
    doc.text(`Facturas para CIA: ${facturasCia.length}`)
    doc.text(`Facturas para CIAN: ${facturasCian.length}`)
    doc.text(`Facturas para emergencia de CIA: ${facturasEmergenciaCia.length}`)
    doc.text(`Facturas para emergencia de CIAN: ${facturasEmergenciaCian.length}`)

    doc.end()
}

function FacturasExoneradas(list: Iinvoice[]){
    const result = list.filter(item => item.currency == "Exoneracion")
    return result;
}

function FacturasDolares(list: Iinvoice[]){
    const filteredList = list.filter(item => item.currency == "Dolares en efectivo")
    return filteredList;
}

function FacturasBsEfectivo(list: Iinvoice[]){
    const filteredList = list.filter(item => item.currency == "Bolivares en efectivo")
    return filteredList;
}

function FacturasBsTranf(list: Iinvoice[]){
    const filteredList = list.filter(item => item.currency == "Bolivares en transferencia")
    return filteredList;
}

function calcularIngreso(list: Iinvoice[]){
    let amount: number = 0;

    list.forEach(item => {
        amount += item.amount;
    })

    return amount;
}

function FacturasCirugia(list: Iinvoice[]){
    const filteredList = list.filter(item => item.billableitem == "Cirugia")
    return filteredList;
}

function FacturasEndodoncia(list: Iinvoice[]){
    const filteredList = list.filter(item => item.billableitem == "Endodoncia")
    return filteredList;
}

function FacturasOrtodoncia(list: Iinvoice[]){
    const filteredList = list.filter(item => item.billableitem == "Ortodoncia")
    return filteredList;
}

function FacturasPeridoncia(list: Iinvoice[]){
    const filteredList = list.filter(item => item.billableitem == "Peridoncia")
    return filteredList;
}

function FacturasProtesisTotal(list: Iinvoice[]){
    const filteredList = list.filter(item => item.billableitem == "Protesis total")
    return filteredList;
}

function FacturasProtesisParcialRemovible(list: Iinvoice[]){
    const filteredList = list.filter(item => item.billableitem == "Protesis parcial removible")
    return filteredList;
}

function FacturasProtesisParcialFija(list: Iinvoice[]){
    const filteredList = list.filter(item => item.billableitem == "Protesis parcial fija")
    return filteredList;
}

function FacturasCia(list: Iinvoice[]){
    const filteredList = list.filter(item => item.billableitem == "CIA")
    return filteredList;
}

function FacturasCian(list: Iinvoice[]){
    const filteredList = list.filter(item => item.billableitem == "CIAN")
    return filteredList;
}

function FacturasEmergenciaCia(list: Iinvoice[]){
    const filteredList = list.filter(item => item.billableitem == "Emergencia de CIA")
    return filteredList;
}

function FacturasEmergenciaCian(list: Iinvoice[]){
    const filteredList = list.filter(item => item.billableitem == "Emergencia de CIAN")
    return filteredList;
}