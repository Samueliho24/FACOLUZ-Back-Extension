import { query, execute } from "../dbConnection.ts"
import * as t from "../interfaces.ts"
import { IUser } from "../types/IUser.ts";

//Inicio de sesion
export async function login(data: t.loginData){
	const id = data.id
	const res: IUser[] = await query('SELECT * FROM users WHERE id = ?', [id])
	// Los permisos son enteros de 64 bits, JavaScript no tiene capacidad para parsearlos a JSON, se transmiten como strings
	res[0].permissions = res[0].permissions.toString()
	return res
}