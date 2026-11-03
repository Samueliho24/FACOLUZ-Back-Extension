export interface Iinvoice{
    id: bigint | string,
    billable: string,
    chargedAmount: number,
    exchangeRate: number,
    date: Date,
    comments: string,
    status: string,
    quantity: number,
    overpaidTo: bigint | string,
    name: string,
    lastname: string,
    studentIdentification: number
}