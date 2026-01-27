export interface Iinvoice{
    id: string,
    billableitem: string,
    currency: string,
    reference: string,
    date: Date,
    patientId: number,
    patientName: string,
    patientPhone: string,
    amount: number,
    changeRate: number,
    status: string
}