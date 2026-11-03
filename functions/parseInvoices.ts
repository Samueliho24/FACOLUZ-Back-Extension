import { Iinvoice } from "../types/invoice.ts";

export function parseInvoiceForJson(invoice: Iinvoice){
    
    invoice.id = invoice.id.toString()
    if(invoice.overpaidTo != null){
        invoice.overpaidTo = invoice.overpaidTo.toString()
    }

    return invoice;
}

export function parseInvoiceForOperations(invoice: Iinvoice){
    
    invoice.id = BigInt(invoice.id)
    if(invoice.overpaidTo != null){
        invoice.overpaidTo = BigInt(invoice.overpaidTo)
    }

    return invoice;
}