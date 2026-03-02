import { query, execute } from "../dbConnection.ts"
import * as t from "../interfaces.ts"

//Inicio de sesion
export async function login(data: t.loginData){
	const id = data.id
	const res = await query('SELECT * FROM users WHERE id = ?', [id])
	return res
}