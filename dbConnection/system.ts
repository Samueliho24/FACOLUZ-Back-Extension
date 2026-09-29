import { query } from "../dbConnection.ts"
import * as t from "../interfaces.ts"

export async function login(data: t.loginData){
	console.log(data)
	return await query(
		'SELECT id, name, lastname, passwordSHA256, type, active FROM users WHERE id = ? AND passwordSHA256 = ?',
		[data.id, data.passwordHash]
	)
}
