import {execute, query} from '../dbConnection.ts'

export async function loadScores(data: string) {
	console.log(data)
	const dataParsed = JSON.parse(JSON.stringify(data))
	const updateScoreQuery = `UPDATE enrollments_grade AS eg JOIN enrollments AS e ON eg.enrollmentId = e.id SET eg.score = ?, eg.dateScore = NOW(), eg.status = CASE WHEN ? >= 10 THEN 'Aprobado' ELSE 'Reprobado' END
	WHERE e.studentId = ?`;
	const promises = dataParsed.map(({ studentId, score }) => execute(updateScoreQuery, [score, score, studentId]));
	await Promise.all(promises);
	return { message: 'Scores updated successfully'}
}

export async function getScoreByStudent(studentIdentification: string, moduleId: string) {
	const res = await query(`SELECT s.id,s.name, s.lastname, s.studentsIdentification, eg.score, eg.status 
		FROM enrollments AS e 
		JOIN enrollments_grade AS eg ON eg.enrollmentId = e.id 
		JOIN students AS s ON e.studentId = s.id
		JoIN sections AS sec ON e.sectionId = sec.id
		WHERE s.studentsIdentification = ? AND sec.moduleId = ?`, [Number(studentIdentification), moduleId])
	return res
}

export async function updateScore(studentId: string, score: string, moduleId: string, reason: string) {
	console.log(studentId, score, moduleId, reason)
	const res = await query(`UPDATE enrollments AS e 
		JOIN enrollments_grade AS eg ON eg.enrollmentId = e.id 
		JOIN sections AS sec ON e.sectionId = sec.id 
		SET eg.score = ?, eg.dateScore = NOW() WHERE e.studentId = ? AND sec.moduleId = ?`, [Number(score), studentId, moduleId])
	return { message: 'Scores updated successfully'}
}