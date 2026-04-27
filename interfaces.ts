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
    modality: 'Intensivo' | 'Sabatino',
    startDate: Date,
    endDate: Date
}

export interface IPayment{
    InvoiceId: string,
    paymentAmmount: number,
    paymentMethod: number,
    changeAmount: number,
    changeMethod: number,
    reference?: string,
    comments?: string,
    changeRate: number
}

export interface newTeacher {
    name: string,
    lastname: string,
    identification: number,
    email: string,
    phone: string
}
