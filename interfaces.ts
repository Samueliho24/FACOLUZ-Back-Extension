export interface loginData{
    id: number,
    passwordHash: string
}

export interface invoiceData{
    patientId: number,
    patientName: string,
    patientPhone: string,
    billableItem: number,
    amount: number,
    currency: number,
    reference: string,
    changeRate: number
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