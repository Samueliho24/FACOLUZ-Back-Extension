import PDFDocument from "pdfkit"
import { Iinvoice } from '../types/invoice.ts' 
import { mergeDate } from "../functions/formatDateTime.ts"

export function BuildReport(dataCallback, endCallback, invoiceList: Iinvoice[]){
    const doc = new PDFDocument()
    const date = new Date()

    //Cantidades
    const reporteDetalladoGeneral = ReporteDetalladoGeneral(invoiceList)
    const pagosPendientes = PagosPendientes(invoiceList)
    const pagosCompletados = PagosCompletados(invoiceList)
    const pagosEnDolares = PagosEnDolares(invoiceList)
    const pagosEnBolivares = PagosEnBolivares(invoiceList)

    doc.on('data', dataCallback)
    doc.on('end', endCallback)

    doc.image('./assets/Logo_LUZ.png', 70, 50, {width: 60, align: 'center', valign: 'center'})
    doc.image('./assets/Logo_FacoLuz.png', 450, 60, {width: 110, align: 'center', valign: 'center'})
    doc.fontSize(12).text('Reporte de extension', 50, 70, {align: 'center'})
    doc.text('Facultad de Odontologia de la Universidad del Zulia', {align: 'center'})
    doc.text(`Reporte del mes: ${date.getMonth()+1}/${date.getFullYear()}`, {align: 'center'})

    doc.moveDown();

    doc.text(" ")
    doc.moveTo(70, 140)
    .lineTo(560, 140)
    .stroke();

    doc.text(" ", 75, 150)
    doc.text(`Detalle de transacciones:`)
    doc.table({
        data: [
            ["Cedula", "Nombre", "Concepto", "Monto", "Tasa", "Fecha", "Metodo de pago"],
            ...reporteDetalladoGeneral
        ]
    })

    doc.text(" ")

    doc.text(`Pagos pendientes:`)
    doc.table({
        data: [
            ["Cedula", "Nombre", "Concepto", "Monto", "Tasa", "Fecha", "Metodo de pago"],
            ...pagosPendientes
        ]
    })

    doc.text(" ")

    doc.text(`Pagos completados:`)
    doc.table({
        data: [
            ["Cedula", "Nombre", "Concepto", "Monto", "Tasa", "Fecha", "Metodo de pago"],
            ...pagosCompletados
        ]
    })

    doc.text(" ")

    doc.text(`Transacciones canceladas en bolivares:`)
    doc.table({
        data: [
            ["Cedula", "Nombre", "Concepto", "Monto", "Tasa", "Fecha", "Metodo de pago"],
            ...pagosEnBolivares
        ]
    })

    doc.text(" ")


    doc.text(`Transacciones canceladas en dolares:`)
    doc.table({
        data: [
            ["Cedula", "Nombre", "Concepto", "Monto", "Tasa", "Fecha", "Metodo de pago"],
            ...pagosEnDolares
        ]
    })

    doc.text(" ")


    // doc.text(`Ingreso total en bolivares: ${totalBsEfectivo + totalBsTranf}Bs`)
    // doc.text(`Bolivares en efectivo: ${totalBsEfectivo}Bs`)
    // doc.text(`Bolivares en transferencia: ${totalBsTranf}Bs`)

    // doc.text(" ")


    // doc.text(`Facturas para cirugia: ${facturasCirugia.length}`)
    // doc.text(`Facturas para endodoncia: ${facturasEndodoncia.length}`)
    // doc.text(`Facturas para ortodoncia: ${facturasOrtodoncia.length}`)
    // doc.text(`Facturas para peridoncia: ${facturasPeridoncia.length}`)
    // doc.text(`Facturas para protesis total: ${facturasProtesisTotal.length}`)
    // doc.text(`Facturas para protesis parcial removible: ${facturasProtesisParcialRemovible.length}`)
    // doc.text(`Facturas para protesis parcial fija: ${facturasProtesisParcialFija.length}`)
    // doc.text(`Facturas para CIA: ${facturasCia.length}`)
    // doc.text(`Facturas para CIAN: ${facturasCian.length}`)
    // doc.text(`Facturas para emergencia de CIA: ${facturasEmergenciaCia.length}`)
    // doc.text(`Facturas para emergencia de CIAN: ${facturasEmergenciaCian.length}`)

    doc.end()
}

function ReporteDetalladoGeneral(list){
    const result = list.map(item => [
        item.studentsidentification,
        `${item.name} ${item.lastname}`,
        item.billableitem,
        item.chargedAmount,
        item.changeRate,
        mergeDate(item.date),
        item.currencyReceived
    ])
    return result;
}

function PagosPendientes(list){
    const filteredList = list.filter(item => item.status == "Pendiente")
    const result = filteredList.map(item => [
        item.studentsidentification,
        `${item.name} ${item.lastname}`,
        item.billableitem,
        item.chargedAmount,
        item.changeRate,
        mergeDate(item.date),
        item.currencyReceived
    ])
    return result;
}

function PagosCompletados(list){
    const filteredList = list.filter(item => item.status == "Recibida")
    const result = filteredList.map(item => [
        item.studentsidentification,
        `${item.name} ${item.lastname}`,
        item.billableitem,
        item.chargedAmount,
        item.changeRate,
        mergeDate(item.date),
        item.currencyReceived
    ])
    return result;
}

function PagosEnDolares(list){
    const filteredList = list.filter(item => item.currencyReceived == "Dolares en efectivo")
    const result = filteredList.map(item => [
        item.studentsidentification,
        `${item.name} ${item.lastname}`,
        item.billableitem,
        item.chargedAmount,
        item.changeRate,
        mergeDate(item.date),
        item.currencyReceived
    ])
    return result;
}

function PagosEnBolivares(list){
    const filteredList = list.filter(item => item.currencyReceived == "Bolivares en efectivo" || item.currencyReceived == "Bolivares en transferencia")
    const result = filteredList.map(item => [
        item.studentsidentification,
        `${item.name} ${item.lastname}`,
        item.billableitem,
        item.chargedAmount,
        item.changeRate,
        mergeDate(item.date),
        item.currencyReceived
    ])
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