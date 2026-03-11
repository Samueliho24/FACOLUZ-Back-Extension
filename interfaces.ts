export interface loginData{
    id: number,
    passwordHash: string
}

export interface invoiceData{
    studentIdentification: number,
    billableitem: number,
    quantity: number,
    chargedAmount: number,
    comment: string
}

export interface newStudent{
    name: string,
    lastName: string,
    photo: string,
    identification: number,
    birthDate: string,
    email: string,
    phone: string,
    address: string,
    instructionGrade: number
}

export interface newPeriod{
    year: number,
    period: number,
    startDate: Date,
    endDate: Date
}

export interface IPayment{
    InvoiceId: string,
    paymentAmmount: number,
    paymentMethod: string,
    changeAmount: number,
    changeMethod: string,
    reference?: string,
    comments?: string,
    changeRate: number
}