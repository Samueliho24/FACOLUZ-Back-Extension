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