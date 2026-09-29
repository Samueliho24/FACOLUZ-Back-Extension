import {execute, query, withTransaction} from '../dbConnection.ts'
import type { PoolConnection } from 'npm:mariadb'

/**
 * El registro de nota existe y pertenece al alumno indicado.
 *
 * Sin esto, un `enrollmentGradeId` inexistente hacia un UPDATE de 0 filas y la
 * ruta respondia 200: el usuario creia que habia guardado.
 */
export async function enrollmentGradeBelongsTo(enrollmentGradeId: string, studentIdentification?: number | string, sectionCode?: string) {
    const conditions = ['eg.id = ?']
    const params: any[] = [enrollmentGradeId]

    if (studentIdentification !== undefined) {
        conditions.push('s.studentsIdentification = ?')
        params.push(Number(studentIdentification))
    }
    if (sectionCode !== undefined) {
        conditions.push('sec.code = ?')
        params.push(sectionCode)
    }

    const res = await query(`
        SELECT eg.id
        FROM enrollments_grade eg
        JOIN enrollments e ON eg.enrollmentId = e.id
        JOIN students s ON e.studentId = s.id
        JOIN sections sec ON e.sectionId = sec.id
        WHERE ${conditions.join(' AND ')}
        LIMIT 1
    `, params)
    return res.length > 0
}

/**
 * Nota actual de un registro. La auditoria de `modify_scores` la lee de aca,
 * no del cliente.
 *
 * Acepta una conexion para poder leerla dentro de una transaccion: si se
 * usara `query()` suelta, la lectura saldria de otra conexion y no del mismo
 * contexto que las escrituras posteriores.
 */
export async function getCurrentScore(enrollmentGradeId: string, conn?: PoolConnection) {
    const res = await (conn ?? { query }).query(`
        SELECT score, status FROM enrollments_grade WHERE id = ?
    `, [enrollmentGradeId])
    return res[0] || null
}

/*export async function loadScores(data: string) {
	console.log(data)
	const dataParsed = JSON.parse(JSON.stringify(data))
	const updateScoreQuery = `UPDATE enrollments_grade AS eg JOIN enrollments AS e ON eg.enrollmentId = e.id SET eg.score = ?, eg.dateScore = NOW(), eg.status = CASE WHEN ? >= 10 THEN 'Aprobado' ELSE 'Reprobado' END
	WHERE e.studentId = ?`;
	const promises = dataParsed.map(({ studentId, score }) => execute(updateScoreQuery, [score, score, studentId]));
	await Promise.all(promises);
	return { message: 'Scores updated successfully'}
}*/

/**
 * Carga las notas de varios alumnos a la vez.
 *
 * Va en una transaccion porque es una operacion en lote: si el alumno 7 de 20
 * falla, sin transaccion quedan los otros 6 guardados y la nota final
 * recalculada de algunos y de otros no, con el docente creyendo que no se
 * guardo nada.
 */
export async function loadScores(data: any) {
    const { evaluationMode, grades } = data

    return await withTransaction(async (conn) => {
        if (evaluationMode === 'Promedio') {
            for (const studentGrade of grades) {
                const { enrollmentGradeId, scores } = studentGrade

                for (const partial of scores) {
                    await conn.execute(`
                        INSERT INTO enrollment_partial_scores (id, enrollmentGradeId, evaluationOrder, score, weight, dateScore)
                        VALUES (?, ?, ?, ?, ?, NOW())
                        ON DUPLICATE KEY UPDATE
                            score = VALUES(score),
                            dateScore = NOW()
                    `, [crypto.randomUUID(), enrollmentGradeId, partial.evaluationOrder, partial.score, 50.00])
                }

                // Se promedia lo enviado en vez de asumir dos parciales.
                // Con `scores[0] + scores[1]` una lista de un solo elemento
                // daba NaN y se guardaba como nota.
                const totalWeighted = scores.reduce((acc: number, p: any) => acc + p.score * 50.00, 0)
                const totalWeight = scores.length * 50.00
                const finalScore = totalWeight > 0 ? Math.round((totalWeighted / totalWeight) * 100) / 100 : 0
                const status = finalScore >= 10 ? 'Aprobado' : 'Reprobado'

                await conn.execute(`
                    UPDATE enrollments_grade
                    SET score = ?, dateScore = NOW(), status = ?
                    WHERE id = ?
                `, [finalScore, status, enrollmentGradeId])
            }
        } else {
            for (const studentGrade of grades) {
                const { enrollmentGradeId, score } = studentGrade

                // score llega en null cuando el docente marco "SI": en ese
                // caso se limpia la nota y se vuelve a "Inscrito", en vez de
                // dejar el alumno con la nota anterior y estado "Aprobado".
                if (score === null || score === undefined) {
                    await conn.execute(`
                        UPDATE enrollments_grade
                        SET score = NULL, dateScore = NOW(), status = 'Inscrito'
                        WHERE id = ?
                    `, [enrollmentGradeId])
                    continue
                }

                await conn.execute(`
                    UPDATE enrollments_grade
                    SET score = ?, dateScore = NOW(), status = CASE WHEN ? >= 10 THEN 'Aprobado' ELSE 'Reprobado' END
                    WHERE id = ?
                `, [score, score, enrollmentGradeId])
            }
        }

        return { message: 'Scores updated successfully' }
    })
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
        // 1. Iniciamos una transacciÃƒÂ³n para asegurar integridad
        await query('START TRANSACTION');

        // 2. Actualizamos la nota en la tabla enrollments_grade
        // Usamos el gradeId (que es el ID de la tabla enrollments_grade)
        await query(`
            UPDATE enrollments_grade 
            SET score = ?, 
                dateScore = NOW(),
                status = IF(? >= 10, 'Aprobado', 'Reprobado') -- Ejemplo de lÃƒÂ³gica de estado
            WHERE id = ?
        `, [Number(newScore), Number(newScore), gradeId]);

        // 3. Insertamos el registro de auditorÃƒÂ­a en modify_scores
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
    // `lastScore` no forma parte del contrato de entrada a proposito: se lee
    // de la base mas abajo. Si lo aceptara del cliente, modify_scores seria
    // falsificable y la auditoria no tendria valor.
    finalScore?: { newScore: number };
    partials?: Array<{ partialId: string; evaluationOrder: number; newScore: number }>;
    reason: string;
}) {
    // El bloque entero necesita una sola conexion. Antes se emitia
    // `START TRANSACTION` con `query()`, que tomaba una conexion del pool y la
    // devolvia al terminar esa llamada, de modo que los UPDATE y el COMMIT
    // iban por conexiones distintas: no habia transaccion real, la nota se
    // actualizaba y la fila de modify_scores podia no insertarse, dejando el
    // cambio de nota sin auditar.
    return await withTransaction(async (conn) => {
        if (data.evaluationMode === 'Simple' && data.finalScore) {
            // `lastscore` se lee de la base: si viene del cliente, la auditoria
            // de modify_scores es falsificable y no sirve para nada.
            const current = await getCurrentScore(data.gradeId, conn)
            const lastScore = current ? (current.score ?? 0) : 0

            await conn.execute(`
                UPDATE enrollments_grade
                SET score = ?,
                    dateScore = NOW(),
                    status = CASE WHEN ? >= 10 THEN 'Aprobado' ELSE 'Reprobado' END
                WHERE id = ?
            `, [data.finalScore.newScore, data.finalScore.newScore, data.gradeId]);

            await conn.execute(`
                INSERT INTO modify_scores (enrollmentGradeId, partialScoreId, lastscore, newscore, reason, date)
                VALUES (?, NULL, ?, ?, ?, NOW())
            `, [data.gradeId, lastScore, data.finalScore.newScore, data.reason]);

        } else if (data.evaluationMode === 'Promedio' && data.partials && data.partials.length > 0) {
            const currentPartials = await conn.query(`
                SELECT id, score, weight, evaluationOrder
                FROM enrollment_partial_scores
                WHERE enrollmentGradeId = ?
            `, [data.gradeId]);

            const partialMap = new Map();
            currentPartials.forEach(p => partialMap.set(p.id, p));

            for (const partial of data.partials) {
                // Igual que arriba: la nota anterior sale de la fila actual.
                const current = partialMap.get(partial.partialId)
                const lastScore = current ? (current.score ?? 0) : 0

                await conn.execute(`
                    UPDATE enrollment_partial_scores
                    SET score = ?, dateScore = NOW()
                    WHERE id = ?
                `, [partial.newScore, partial.partialId]);

                await conn.execute(`
                    INSERT INTO modify_scores (enrollmentGradeId, partialScoreId, lastscore, newscore, reason, date)
                    VALUES (?, ?, ?, ?, ?, NOW())
                `, [data.gradeId, partial.partialId, lastScore, partial.newScore, data.reason]);

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

            await conn.execute(`
                UPDATE enrollments_grade
                SET score = ?,
                    dateScore = NOW(),
                    status = ?
                WHERE id = ?
            `, [newFinalScore, status, data.gradeId]);
        }

        return {
            success: true,
            message: 'Nota actualizada y cambio registrada en el historial.'
        };
    });
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
