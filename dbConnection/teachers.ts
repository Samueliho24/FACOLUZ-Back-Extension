import { query, execute } from "../dbConnection.ts"

export async function filterTeachers(param: string){
	const res = await query(`
		SELECT * FROM teachers
		WHERE
			name LIKE ?
			OR lastname LIKE ?
			OR 	studentsidentification LIKE ?
	`, [param, param, Number(param)])
	return res;
}