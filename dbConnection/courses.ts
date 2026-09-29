import { query, execute, withTransaction } from "../dbConnection.ts"
import { escapeLike } from "../functions/validators.ts"

export async function filterCourses(param: string){
	const res = await query(`
		SELECT * FROM courses
		WHERE
			description LIKE ? ESCAPE '\\'
	`, [escapeLike(param)])
	return res;
}

export async function getAllCourses(){
    const res = await query(`SELECT * FROM courses`)
    return res
}

//Registro de cursos
export async function setCourse(description: string){
    const _res = await execute(`
        INSERT INTO courses(description)
        VALUES(?)	
    `, [description])
}

export async function updateAssignedModulesForCourse(courseId: string, moduleIds: (string|number)[]){
	// El borrado y los INSERT van en la misma transaccion: si un INSERT
	// fallaba a la mitad, el curso se quedaba sin los modulos que tenia
	// asignados y sin los nuevos, y `execute()` suelta no lo revierte.
	return await withTransaction(async (conn) => {
		await conn.execute(`DELETE FROM modules_courses WHERE courseid = ?`, [courseId])
		if (moduleIds && moduleIds.length > 0){
			const placeholders = moduleIds.map(() => '(?, ?, ?)').join(', ')
			const params: any[] = []
			moduleIds.forEach((m, index) => {
				params.push(m)
				params.push(courseId)
				params.push(index)
			})
			await conn.execute(`INSERT INTO modules_courses(moduleid, courseid, \`order\`) VALUES ${placeholders}`, params)
		}
	})
}