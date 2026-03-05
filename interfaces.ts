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

export interface userData extends newUser{
    uid: string
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
    invoiceId: string,
    receivedPaymentMethod: string,
    returnedPaymentMethod: string,
    paidAmount: number,
    returnedAmount: number,
    reference?: string,
    comments?: string,
    changeRate: number
}