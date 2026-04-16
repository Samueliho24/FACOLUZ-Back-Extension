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
	const res = await query(`SELECT s.id,s.name, s.lastname, s.studentsIdentification, eg.id AS gradeId, eg.score, eg.status 
		FROM enrollments AS e 
		JOIN enrollments_grade AS eg ON eg.enrollmentId = e.id 
		JOIN students AS s ON e.studentId = s.id
		JoIN sections AS sec ON e.sectionId = sec.id
		WHERE s.studentsIdentification = ? AND sec.moduleId = ?`, [Number(studentIdentification), moduleId])
	return res
}

export async function updateScore(studentId: string, moduleId: string, gradeId: string, lastScore: string,newScore: string, reason: string) {
	try {
        // 1. Iniciamos una transacción para asegurar integridad
        await query('START TRANSACTION');

        // 2. Actualizamos la nota en la tabla enrollments_grade
        // Usamos el gradeId (que es el ID de la tabla enrollments_grade)
        await query(`
            UPDATE enrollments_grade 
            SET score = ?, 
                dateScore = NOW(),
                status = IF(? >= 10, 'Aprobado', 'Reprobado') -- Ejemplo de lógica de estado
            WHERE id = ?
        `, [Number(newScore), Number(newScore), gradeId]);

        // 3. Insertamos el registro de auditoría en modify_scores
        // El ID de modify_scores se genera solo mediante uuid() en la DB
        await query(`
            INSERT INTO modify_scores (enrollmentGradeId, lastscore, newscore, reason, date)
            VALUES (?, ?, ?, ?, NOW())
        `, [gradeId, Number(lastScore), Number(newScore), reason]);

        // 4. Confirmamos los cambios
        await query('COMMIT');

        return { 
            success: true, 
            message: 'Nota actualizada y cambio registrado en el historial.' 
        };

    } catch (error) {
        // Si algo sale mal, revertimos los cambios
        await query('ROLLBACK');
        console.error("Error en updateScore:", error);
        throw error;
    }
}
