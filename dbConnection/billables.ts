import { query, execute, transaction } from "../dbConnection.ts";

export async function GetBillables(){
    const res = await query(`
        SELECT * FROM billables    
    `)
    return res
}

export async function ChangePrices(newPrices: any){
    const queries = [
        `UPDATE billables SET price = ? WHERE name = "Inscripcion"`,
        `UPDATE billables SET price = ? WHERE name = "Materia"`,
        `UPDATE billables SET price = ? WHERE name = "Actividad especial"`,
        `UPDATE billables SET price = ? WHERE name = "Reimpresion de certificado"`
    ]

    const values = [
        newPrices.inscripcion,
        newPrices.materia,
        newPrices.actividadEspecial,
        newPrices.certificado,
    ]

    const res = await transaction(queries, values)
    return res
}