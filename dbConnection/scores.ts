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
		JOIN sections AS sec ON e.sectionId = sec.id
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

export async function getGradeStudentsBySection(periodId: string, sectionCode: string) {
    try {
        const querySQL = `
            WITH LatestGrades AS (
                SELECT 
                    e.studentId,
                    s.studentsIdentification AS identification,
                    CONCAT(s.name, ' ', s.lastname) AS fullName,
                    m.description AS module,
                    eg.score AS finalScore,
                    eg.status AS gradeStatus,
                    ROW_NUMBER() OVER(PARTITION BY e.studentId, m.id ORDER BY eg.dateScore DESC, eg.id DESC) AS rn
                FROM enrollments e
                JOIN students s ON e.studentId = s.id
                JOIN sections sec ON e.sectionId = sec.id
                JOIN modules m ON sec.moduleId = m.id
                LEFT JOIN enrollments_grade eg ON e.id = eg.enrollmentId
                WHERE sec.periodId = ? AND sec.code = ?
            )
            SELECT 
                identification,
                fullName,
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'module', module,
                        'finalScore', finalScore,
                        'status', COALESCE(gradeStatus, 'Inscrito')
                    )
                ) AS grades
            FROM LatestGrades
            WHERE rn = 1
            GROUP BY studentId, identification, fullName
            ORDER BY fullName;
        `;

        const results = await query(querySQL, [periodId, sectionCode]);
        
        const formattedResults = results.map((row: any) => ({
            ...row,
            grades: typeof row.grades === 'string' ? JSON.parse(row.grades) : row.grades
        }));
        console.log(formattedResults);
        return formattedResults;

    } catch (error) {
        console.error("Error getting grades:", error);
        throw new Error('Could not get section grades.');
    }
}
