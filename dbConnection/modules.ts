import { query, execute } from "../dbConnection.ts"

export async function filterModules(param: string){
	const res = await query(`
		SELECT * FROM modules
		WHERE
			description LIKE ?
	`, [param])
	return res;
}

export async function deactivateModule(moduleId: string){
    const res = await execute(`UPDATE modules SET status = 'Inactivo' WHERE id = ?`, [moduleId])
    return res
}

export async function setModule(description: string){
    const _res = await execute(`
        INSERT INTO modules(description)
        VALUES(?)	
    `, [description])
}

export async function getAllModules(){
    const res = await query(`SELECT * FROM modules WHERE status = 'Activo' ORDER BY description ASC`)
    return res
}

export async function getSearchedModule(description: string){
    const res = await query(`
        SELECT * FROM modules
        WHERE description LIKE ? AND status = 'Activo'
        ORDER BY description ASC
    `, [`${description}%`])
    return res
}

export async function getAssignedModulesByCourse(courseId: string){
	const res = await query(`
		SELECT * FROM modules_courses
		WHERE courseid = ?
	`, [courseId])
	return res
}