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

/** El concepto facturable existe. La FK lo cubria, pero con un 500 crudo. */
export async function billableExists(id: string) {
    const res = await query(`SELECT id FROM billables WHERE id = ?`, [id])
    return res.length > 0
}

/**
 * Precio del concepto, leido del servidor.
 *
 * El precio lo define quien administra la caja (PUT /api/prices), asi que
 * calcular el importe aqui evita que el cliente mande el monto que quiera.
 */
export async function getBillable(id: string) {
    const res = await query(`SELECT id, name, price FROM billables WHERE id = ?`, [id])
    return res[0] || null
}