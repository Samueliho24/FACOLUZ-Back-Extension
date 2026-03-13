import { query, execute } from "../dbConnection.ts"
import * as t from "../interfaces.ts"

export async function filterStudents(param: string){
	const q = `${param}%`
	const res = await query(`
		SELECT * FROM students
		WHERE
			name LIKE ?
			OR lastname LIKE ?
			OR CAST(studentsidentification AS CHAR) LIKE ?
	`, [q, q, q])
	return res;
}

export async function registerStudents(user: t.newStudent){
        const name = user.name
        const lastName = user.lastName
        const identification = user.identification
        const birthDate = user.birthDate
        const email = user.email
        const phone = user.phone
        const address = user.address
        const instructionGrade = user.instructionGrade

    const _res = await execute(`
        INSERT INTO students(name, lastName, studentsidentification, birthDate, email, phone, address, instructionGrade)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?)	
    `, [name, lastName, identification, birthDate, email, phone, address, instructionGrade])
}

export async function getStudentById(id: number){
    const res = await query(`
        SELECT * FROM students
        WHERE studentsIdentification = ?
    `, [id])
    return res
}
export async function getStudents(page: number){
    const res = await query(`
        SELECT * FROM students
        LIMIT 10 OFFSET ?
    `, [(page-1)*10])
    return res
}

export async function getEnrolledStudentsByModule(moduleId: number){
	const res = await query(`
		SELECT 
            s.name,
            s.lastName,
            s.studentsIdentification,
            s.email,
            s.phone,
            s.address,
            s.instructionGrade,
            e.dateEnrollments,
            e.state
		FROM enrollments e
		JOIN enrollments_modules em ON e.id = em.enrollmentId
		JOIN students s ON e.studentId = s.id
		WHERE em.moduleId = ?
	`, [moduleId])
	return res
}

export async function studentExist(studentIdentification: number){
    console.log(studentIdentification)
    const res = await query(`
        SELECT id FROM students WHERE studentsIdentification = ?    
    `, [studentIdentification])

    if (res.length > 0){
        return true
    } else{
        return false
    }
}