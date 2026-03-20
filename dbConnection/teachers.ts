import { query, execute } from "../dbConnection.ts"
import { newTeacher } from "../interfaces.ts";

export async function filterTeachers(param: string){
	const q = `${param}%`
	const res = await query(`
		SELECT * FROM teachers
		WHERE
			name LIKE ?
			OR lastname LIKE ?
			OR CAST(identification AS CHAR) LIKE ?
	`, [q, q, q])
	return res;
}

export async function getTeachers(page: number) {
	const limit = 20;
	const offset = (page - 1) * limit;
	const res = await query(`
		SELECT * FROM teachers
		ORDER BY id DESC
		LIMIT ? OFFSET ?
	`, [limit, offset]);
	return res;
}

export async function registerTeacher(data: newTeacher) {
	const res = await execute(`
		INSERT INTO teachers (name, lastname, identification, email, phone)
		VALUES (?, ?, ?, ?, ?)
	`, [data.name, data.lastname, data.identification, data.email, data.phone]);
	return res;
}

export async function deactivateTeacher(id: string) {
    const res = await execute(`
        UPDATE teachers SET status = 'Inactivo' WHERE id = ?
    `, [id]);
    return res;
}