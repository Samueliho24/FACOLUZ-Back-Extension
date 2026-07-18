export interface newSection {
    periodId: string,
    moduleId: string,
    // En la nueva estructura, la asignación de docentes se modela como un arreglo de objetos con id
    // para representar relaciones en dbConnection (tabla sections_teachers).
    teachers: { id: string }[],
    code: string,
    quota: number,
}
export interface loginData{
    id: number,
    passwordHash: string
}

export interface invoiceData{
    studentIdentification: number,
    billableid: string,
    quantity: number,
    chargedAmount: number,
    exchangeRate: number,
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
    modality: 'Intensivo' | 'Sabatino',
    startDate: Date,
    endDate: Date
}

export interface IPayment{
    InvoiceId: string,
    paidAmount: number,
    receivedPaymentMethod: string,
    returnedAmount: number,
    returnedPaymentMethod: string,
    exchangeRate: number,
    reference?: string,
    returnReference?: string,
    comments?: string,
}

export interface newTeacher {
    name: string,
    lastname: string,
    identification: number,
    email: string,
    phone: string
}
