import {execute, query} from '../dbConnection.ts'

/*export async function loadScores(data: string) {
	console.log(data)
	const dataParsed = JSON.parse(JSON.stringify(data))
	const updateScoreQuery = `UPDATE enrollments_grade AS eg JOIN enrollments AS e ON eg.enrollmentId = e.id SET eg.score = ?, eg.dateScore = NOW(), eg.status = CASE WHEN ? >= 10 THEN 'Aprobado' ELSE 'Reprobado' END
	WHERE e.studentId = ?`;
	const promises = dataParsed.map(({ studentId, score }) => execute(updateScoreQuery, [score, score, studentId]));
	await Promise.all(promises);
	return { message: 'Scores updated successfully'}
}*/

export async function loadScores(data: any) {
    const { evaluationMode, grades } = data
    
    if (evaluationMode === 'Promedio') {
        for (const studentGrade of grades) {
            const { enrollmentGradeId, scores } = studentGrade
            
            for (const partial of scores) {
                await execute(`
                    INSERT INTO enrollment_partial_scores (id, enrollmentGradeId, evaluationOrder, score, weight, dateScore)
                    VALUES (?, ?, ?, ?, ?, NOW())
                    ON DUPLICATE KEY UPDATE 
                        score = VALUES(score),
                        dateScore = NOW()
                `, [crypto.randomUUID(), enrollmentGradeId, partial.evaluationOrder, partial.score, partial.evaluationOrder === 1 ? 50.00 : 50.00])
            }

            const finalScore = Math.round((scores[0].score + scores[1].score) / 2)
            const status = finalScore >= 10 ? 'Aprobado' : 'Reprobado'
            
            await execute(`
                UPDATE enrollments_grade 
                SET score = ?, dateScore = NOW(), status = ?
                WHERE id = ?
            `, [finalScore, status, enrollmentGradeId])
        }
    } else {
        for (const studentGrade of grades) {
            const { enrollmentGradeId, score } = studentGrade
            
            await execute(`
                UPDATE enrollments_grade 
                SET score = ?, dateScore = NOW(), status = CASE WHEN ? >= 10 THEN 'Aprobado' ELSE 'Reprobado' END
                WHERE id = ?
            `, [score, score, enrollmentGradeId])
        }
    }

    return { message: 'Scores updated successfully' }
}
/*
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
*/

export async function getScoreByStudent(studentIdentification: string, moduleId: string ) {
    const res = await query(`
        SELECT 
            s.id,
            s.name, 
            s.lastname, 
            s.studentsIdentification, 
            eg.id AS gradeId, 
            eg.score AS finalScore, 
            eg.status,
            m.evaluationMode,
            eps1.id AS partialId1,
            eps1.score AS partialScore1,
            eps1.weight AS partialWeight1,
            eps2.id AS partialId2,
            eps2.score AS partialScore2,
            eps2.weight AS partialWeight2
        FROM students AS s
        JOIN enrollments AS e ON e.studentId = s.id
        JOIN sections AS sec ON e.sectionId = sec.id
        JOIN modules AS m ON sec.moduleId = m.id
        LEFT JOIN enrollments_grade AS eg ON eg.enrollmentId = e.id 
        LEFT JOIN enrollment_partial_scores AS eps1 ON eps1.enrollmentGradeId = eg.id AND eps1.evaluationOrder = 1
        LEFT JOIN enrollment_partial_scores AS eps2 ON eps2.enrollmentGradeId = eg.id AND eps2.evaluationOrder = 2
        WHERE s.studentsIdentification = ? AND m.id = ?
        ORDER BY eg.dateScore DESC
        LIMIT 1
    `, [Number(studentIdentification), moduleId])
    return res
}

export async function updateScore(data: {
    gradeId: string;
    evaluationMode: 'Simple' | 'Promedio';
    finalScore?: { lastScore: number; newScore: number };
    partials?: Array<{ partialId: string; evaluationOrder: number; lastScore: number; newScore: number }>;
    reason: string;
}) {
    try {
        await query('START TRANSACTION');

        if (data.evaluationMode === 'Simple' && data.finalScore) {
            await query(`
                UPDATE enrollments_grade 
                SET score = ?, 
                    dateScore = NOW(),
                    status = CASE WHEN ? >= 10 THEN 'Aprobado' ELSE 'Reprobado' END
                WHERE id = ?
            `, [data.finalScore.newScore, data.finalScore.newScore, data.gradeId]);

            await query(`
                INSERT INTO modify_scores (enrollmentGradeId, partialScoreId, lastscore, newscore, reason, date)
                VALUES (?, NULL, ?, ?, ?, NOW())
            `, [data.gradeId, data.finalScore.lastScore, data.finalScore.newScore, data.reason]);

        } else if (data.evaluationMode === 'Promedio' && data.partials && data.partials.length > 0) {
            const currentPartials = await query(`
                SELECT id, score, weight, evaluationOrder 
                FROM enrollment_partial_scores 
                WHERE enrollmentGradeId = ?
            `, [data.gradeId]);

            const partialMap = new Map();
            currentPartials.forEach(p => partialMap.set(p.id, p));

            for (const partial of data.partials) {
                await query(`
                    UPDATE enrollment_partial_scores 
                    SET score = ?, dateScore = NOW()
                    WHERE id = ?
                `, [partial.newScore, partial.partialId]);

                await query(`
                    INSERT INTO modify_scores (enrollmentGradeId, partialScoreId, lastscore, newscore, reason, date)
                    VALUES (?, ?, ?, ?, ?, NOW())
                `, [data.gradeId, partial.partialId, partial.lastScore, partial.newScore, data.reason]);

                const current = partialMap.get(partial.partialId);
                if (current) {
                    current.score = partial.newScore;
                }
            }

            let totalWeighted = 0;
            let totalWeight = 0;
            for (const p of currentPartials) {
                totalWeighted += p.score * p.weight;
                totalWeight += p.weight;
            }

            const newFinalScore = totalWeight > 0 ? Math.round((totalWeighted / totalWeight) * 100) / 100 : 0;
            const status = newFinalScore >= 10 ? 'Aprobado' : 'Reprobado';

            await query(`
                UPDATE enrollments_grade 
                SET score = ?, 
                    dateScore = NOW(),
                    status = ?
                WHERE id = ?
            `, [newFinalScore, status, data.gradeId]);
        }

        await query('COMMIT');

        return { 
            success: true, 
            message: 'Nota actualizada y cambio registrado en el historial.' 
        };

    } catch (error) {
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
