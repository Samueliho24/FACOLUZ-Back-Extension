import { query, execute } from "../dbConnection.ts"
import * as t from "../interfaces.ts"
import { escapeLike } from "../functions/validators.ts"

export async function filterStudents(param: string){
	// `escapeLike` evita que `%` o `_` se interpreten como comodines y
	// devuelvan todos los alumnos con su informacion personal.
	const q = `${escapeLike(param)}%`
	const res = await query(`
		SELECT * FROM students
		WHERE
			name LIKE ? ESCAPE '\\'
			OR lastname LIKE ? ESCAPE '\\'
			OR CAST(studentsidentification AS CHAR) LIKE ? ESCAPE '\\'
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
        INSERT INTO students(name, lastName, studentsIdentification, birthDate, email, phone, address, instructionGrade)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?) 	
    `, [name, lastName, identification, birthDate, email, phone, address, instructionGrade])
}

export async function getStudentById(id: number){
    const res = await query(`
        SELECT *, status AS studentStatus FROM students
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
            e.status
		FROM enrollments e
		JOIN enrollments_modules em ON e.id = em.enrollmentId
		JOIN students s ON e.studentId = s.id
		WHERE em.moduleId = ?
	`, [moduleId])
	return res
}

/** true si la cedula ya esta registrada. La usaba el emitter de facturas. */
export async function studentExist(studentIdentification: number | string){
    const res = await query(`
        SELECT id FROM students WHERE studentsIdentification = ?    
    `, [studentIdentification])

    return res.length > 0
}

/** Datos minimos del alumno, para validar existencia y mostrar el nombre. */
export async function getStudentSummary(studentIdentification: number | string){
    const res = await query(`
        SELECT id, name, lastname, email, studentsIdentification, status
        FROM students
        WHERE studentsIdentification = ?
    `, [studentIdentification])
    return res[0] || null
}

/**
 * Estudiante que se puede facturar (T3).
 *
 * `studentExist` solo mira que haya fila, asi que un alumno desactivado
 * (`status = 'Inactivo'`) pasaba el filtro y se le emitian facturas igual. Que un
 * estudiante inactivo no se factura es una regla del negocio, no del cliente:
 * el cliente puede estar desactualizado, el servidor no.
 *
 * Se separa de `studentExist` a proposito. `studentExist` sigue usandose donde
 * lo que se pregunta es "esta el registro", no "se le puede facturar", para no
 * cambiar de golpe el comportamiento de las consultas historicas.
 */
export async function getBillableStudent(studentIdentification: number | string){
    const res = await query(`
        SELECT id, name, lastname, status
        FROM students
        WHERE studentsIdentification = ? AND status = 'Activo'
    `, [studentIdentification])
    return res[0] || null
}

/** Cedulas ya usadas por otro alumno. Excluye `exceptId` para las ediciones. */
export async function isStudentIdTaken(studentIdentification: number | string, exceptId?: number | string){
    const res = await query(`
        SELECT id FROM students
        WHERE studentsIdentification = ? AND (? IS NULL OR id <> ?)
    `, [studentIdentification, exceptId ?? null, exceptId ?? null])
    return res.length > 0
}

/** Correos ya usados por otro alumno. */
export async function isStudentEmailTaken(email: string, exceptId?: number | string){
    const res = await query(`
        SELECT id FROM students
        WHERE LOWER(email) = LOWER(?) AND (? IS NULL OR id <> ?)
    `, [email, exceptId ?? null, exceptId ?? null])
    return res.length > 0
}

export async function deactivateStudent(id: string) {
    const res = await execute(`
        UPDATE students SET status = 'Inactivo' WHERE id = ?
    `, [id]);
    return res;
}

export async function getStudentCardInfo(studentId: string){
    const res = await query(`
        SELECT
            id,
            name,
            lastname,
            studentsIdentification
        FROM students
        WHERE id = ?
    `, [studentId])
    return res[0];
}
