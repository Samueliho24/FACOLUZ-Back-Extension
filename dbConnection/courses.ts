import { query, execute } from "../dbConnection.ts"

export async function filterCourses(param: string){
	const res = await query(`
		SELECT * FROM courses
		WHERE
			description LIKE ?
	`, [param])
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
	// Remove existing assignments for the course and insert the provided ones in a single operation
	try{
		// Delete existing
		await execute(`DELETE FROM modules_courses WHERE courseid = ?`, [courseId])
		if (moduleIds && moduleIds.length > 0){
			const placeholders = moduleIds.map(() => '(?, ?)').join(', ')
			const params: any[] = []
			moduleIds.forEach((m) => {
				params.push(m)
				params.push(courseId)
			})
			await execute(`INSERT INTO modules_courses(moduleid, courseid) VALUES ${placeholders}`, params)
		}
	}catch(err){
		console.log(err)
		throw err
	}
}