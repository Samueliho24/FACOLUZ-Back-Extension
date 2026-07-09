import { query, execute } from "../dbConnection.ts";

export async function GetBillables(){
    const res = await query(`
        SELECT * FROM billables    
    `)
    return res
}