import { query, execute } from "../dbConnection.ts"
import { newTeacher } from "../interfaces.ts";
import { escapeLike } from "../functions/validators.ts";

export async function filterTeachers(param: string){
	const q = `${escapeLike(param)}%`
	const res = await query(`
		SELECT * FROM teachers
		WHERE
			name LIKE ? ESCAPE '\\'
			OR lastname LIKE ? ESCAPE '\\'
			OR CAST(identification AS CHAR) LIKE ? ESCAPE '\\'
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

/** El docente existe y esta activo. Una seccion no puede quedar sin docente. */
export async function activeTeacherExists(id: string) {
    const res = await query(`
        SELECT id FROM teachers WHERE id = ? AND status = 'Activo'
    `, [id]);
    return res.length > 0;
}

/** Cedulas ya usadas por otro docente. */
export async function isTeacherIdTaken(identification: number | string, exceptId?: string) {
    const res = await query(`
        SELECT id FROM teachers
        WHERE identification = ? AND (? IS NULL OR id <> ?)
    `, [identification, exceptId ?? null, exceptId ?? null]);
    return res.length > 0;
}

/** Correos ya usados por otro docente. */
export async function isTeacherEmailTaken(email: string, exceptId?: string) {
    const res = await query(`
        SELECT id FROM teachers
        WHERE LOWER(email) = LOWER(?) AND (? IS NULL OR id <> ?)
    `, [email, exceptId ?? null, exceptId ?? null]);
    return res.length > 0;
}