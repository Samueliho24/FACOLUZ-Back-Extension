import { query, execute } from "../dbConnection.ts"

export async function registerEnrollment(studentId: string, periodId: string, moduleIds: number[], state: 'Pagada' | 'Deuda' = 'Deuda') {
	const enrollmentId = crypto.randomUUID()
	const res1 =await execute(`
		INSERT INTO enrollments(id, studentId, periodId, dateEnrollments, state)
		VALUES(?, ?, ?, NOW(), ?)
	`, [enrollmentId, studentId, periodId, state])
	if (moduleIds && moduleIds.length > 0) {
		const values = moduleIds.map((m) => [enrollmentId, m])
		await execute(`
			INSERT INTO enrollments_modules(enrollmentId, moduleId)
			VALUES ?
		`, [values])
	}
	return res1
}

export async function updateEnrollmentState(enrollmentId: string, newState: string){
	const res = await execute(`
		UPDATE enrollments 
		SET state = ?
		WHERE id = ?	
	`, [newState, enrollmentId])
	return res
}