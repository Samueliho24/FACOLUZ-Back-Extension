import exp from "node:constants";
import { query, execute } from "../dbConnection.ts"

export async function registerEnrollment(studentId: string, sectionId: string) {
	const enrollmentId = crypto.randomUUID()
	const res1 =await execute(`
		INSERT INTO enrollments(id, studentId, sectionId, dateEnrollment, status)
		VALUES(?, ?, ?, NOW(), ?)
	`, [enrollmentId, studentId, sectionId, 'Deuda'])

		await execute(`
			INSERT INTO enrollments_grade(enrollmentId, status)
			VALUES (?, ?)
		`, [enrollmentId,'Inscripto'])
	return res1
}

export async function getLastEnrollmentByStudentId(id: number) {
	const res = await query(`
		SELECT e.status AS enrollmentStatus, s.id, s.name, s.lastname, s.studentsIdentification, s.email, s.phone, s.photo, s.status AS studentStatus, sec.code, p.year, p.period, p.modality, m.id AS moduleId, m.description, eg.score, eg.status AS gradeStatus
		FROM enrollments e
		JOIN students s ON e.studentId = s.id
		JOIN enrollments_grade eg ON e.id = eg.enrollmentId
		JOIN sections sec ON e.sectionId = sec.id
		JOIN periods p ON sec.periodId = p.id
		JOIN modules m ON sec.moduleId = m.id
		WHERE s.studentsIdentification = ?
		ORDER BY e.dateEnrollment DESC
		LIMIT 1
	`, [id])
	return res
}

export async function updateEnrollmentState(enrollmentId: string, newState: string){
	const res = await execute(`
		UPDATE enrollments 
		SET status = ?
		WHERE id = ?	
	`, [newState, enrollmentId])
	return res
}