import exp from "node:constants";
import { query, execute, withTransaction } from "../dbConnection.ts"
/*
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
*/

export async function registerEnrollment(data: any) {
    const enrollmentId = crypto.randomUUID();
    const {
        studentId,
        sectionId,
        cohortId,
        enrollmentType = 'Regular',
        parentEnrollmentId = null
    } = data;

    // Todo el bloque va en una transaccion sobre una sola conexion. Con
    // `query()` suelta, el `FOR UPDATE` se emitia sobre una conexion que
    // se devolvia al pool al instante: el bloqueo no duraba nada y las
    // consultas siguientes no veian el mismo contexto, asi que dos
    // inscripciones simultaneas podian leer el mismo COUNT y las dos pasar
    // el cupo. Aqui el `FOR UPDATE` sobre la fila de `sections` serializa
    // de verdad a quien compita por la ultima plaza.
    return await withTransaction(async (conn) => {
        // Seccion, periodo y modulo tienen que existir y estar vigentes. Antes solo
        // los protegia la FK, con un 500 crudo, y se podia inscribir en una
        // seccion cerrada o en un periodo finalizado.
        const section = await conn.query(`
            SELECT s.id, s.quota, s.status AS sectionStatus,
                   p.id AS periodId, p.status AS periodStatus,
                   m.id AS moduleId, m.status AS moduleStatus,
                   (SELECT COUNT(*) FROM enrollments e WHERE e.sectionId = s.id) AS enrolled
            FROM sections s
            JOIN periods p ON s.periodId = p.id
            JOIN modules m ON s.moduleId = m.id
            WHERE s.id = ?
            FOR UPDATE
        `, [sectionId]);

        if (section.length === 0) throw new Error('La seccion no existe')
        if (section[0].sectionStatus !== 'Activa') throw new Error('La seccion no esta activa')
        if (section[0].periodStatus !== 'En curso') throw new Error('El periodo no esta en curso')
        if (section[0].moduleStatus !== 'Activo') throw new Error('El modulo esta suspendido')

        // El COUNT se relee dentro de la transaccion, ya con la fila de la
        // seccion bloqueada: el valor de arriba es valido para decidir.
        if (section[0].enrolled >= section[0].quota) {
            throw new Error('SecciÃ³n sin cupo disponible');
        }

        // No inscribir dos veces al mismo alumno en la misma seccion. Hoy no hay
        // UNIQUE en la tabla, asi que el duplicado pasaba y duplicaba notas.
        const duplicate = await conn.query(`
            SELECT id FROM enrollments WHERE studentId = ? AND sectionId = ?
        `, [studentId, sectionId])
        if (duplicate.length > 0) throw new Error('El estudiante ya esta inscrito en esta seccion')

        // No reinscribir un modulo ya aprobado. getApprovedModulesByStudent ya
        // existia y no se estaba usando: el check vivia solo en el cliente.
        const alreadyApproved = await conn.query(`
            SELECT sec.moduleId
            FROM enrollments e
            JOIN sections sec ON e.sectionId = sec.id
            JOIN enrollments_grade eg ON e.id = eg.enrollmentId
            WHERE e.studentId = ? AND sec.moduleId = ? AND eg.status = 'Aprobado'
            LIMIT 1
        `, [studentId, section[0].moduleId])
        if (alreadyApproved.length > 0) throw new Error('El estudiante ya aprobo este modulo')

        // El modulo debe pertenecer al curso del cohorte.
        const courseModule = await conn.query(`
            SELECT mc.moduleid FROM modules_courses mc
            JOIN student_cohorts sc ON sc.courseId = mc.courseid
            WHERE sc.id = ? AND mc.moduleid = ?
            LIMIT 1
        `, [cohortId, section[0].moduleId])
        if (courseModule.length === 0) throw new Error('El modulo no pertenece al curso del cohorte')

        // Si es Repitiente tiene que venir la inscripcion original, ser del mismo
        // alumno y estar Reprobada. Antes solo el cliente lo deducia.
        if (enrollmentType === 'Repitiente') {
            if (!parentEnrollmentId) throw new Error('Una inscripcion Repitiente requiere la inscripcion original')
            const parent = await conn.query(`
                SELECT e.id, e.studentId, eg.status AS gradeStatus
                FROM enrollments e
                LEFT JOIN enrollments_grade eg ON e.id = eg.enrollmentId
                WHERE e.id = ?
            `, [parentEnrollmentId])
            if (parent.length === 0) throw new Error('La inscripcion original no existe')
            if (parent[0].studentId !== studentId) throw new Error('La inscripcion original pertenece a otro estudiante')
            if (parent[0].gradeStatus !== 'Reprobado') throw new Error('La inscripcion original no esta reprobada')
        }

        await conn.execute(`
            INSERT INTO enrollments(id, studentId, sectionId, cohortId, enrollmentType, parentEnrollmentId, dateEnrollment, status)
            VALUES(?, ?, ?, ?, ?, ?, NOW(), ?)
        `, [enrollmentId, studentId, sectionId, cohortId, enrollmentType, parentEnrollmentId, 'Deuda']);

        await conn.execute(`
            INSERT INTO enrollments_grade(enrollmentId, status)
            VALUES (?, ?)
        `, [enrollmentId, 'Inscrito']);

        return { enrollmentId };
    });
}

export async function getLastEnrollmentByStudentId(studentIdentification: number) {
    const res = await query(`
        SELECT 
            e.id AS enrollmentId,
            e.status AS enrollmentStatus,
            e.enrollmentType,
            e.parentEnrollmentId,
            s.id AS studentId,
            s.name,
            s.lastname,
            s.studentsIdentification,
            s.email,
            s.phone,
            s.photo,
            s.status AS studentStatus,
            sec.code AS sectionCode,
            sec.id AS sectionId,
            p.id AS periodId,
            p.year,
            p.period,
            p.modality,
            p.status AS periodStatus,
            m.id AS moduleId,
            m.description AS moduleDescription,
            m.evaluationMode,
            eg.score,
            eg.status AS gradeStatus,
            sc.id AS cohortId,
            c.id AS courseId,
            c.description AS courseDescription
        FROM enrollments e
        JOIN students s ON e.studentId = s.id
        JOIN enrollments_grade eg ON e.id = eg.enrollmentId
        JOIN sections sec ON e.sectionId = sec.id
        JOIN periods p ON sec.periodId = p.id
        JOIN modules m ON sec.moduleId = m.id
        LEFT JOIN student_cohorts sc ON e.cohortId = sc.id
        LEFT JOIN courses c ON sc.courseId = c.id
        WHERE s.studentsIdentification = ?
        ORDER BY e.dateEnrollment DESC
        LIMIT 1
    `, [studentIdentification]);
    return res;
}

export async function getStudentCohorts(studentId: string) {
    const res = await query(`
        SELECT sc.*, c.description AS courseDescription, p.year, p.period, p.modality
        FROM student_cohorts sc
        JOIN courses c ON sc.courseId = c.id
        JOIN periods p ON sc.periodId = p.id
        WHERE sc.studentId = ?
        ORDER BY sc.enrollmentDate DESC
    `, [studentId]);
    return res;
}

export async function updateEnrollmentState(enrollmentId: string, newState: string){
	const res = await execute(`
		UPDATE enrollments 
		SET status = ?
		WHERE id = ?	
	`, [newState, enrollmentId])
	return res
}

export async function getApprovedModulesByStudent(studentId: string, courseId: string) {
    const res = await query(`
        SELECT DISTINCT sec.moduleId, eg.status
        FROM enrollments e
        JOIN sections sec ON e.sectionId = sec.id
        JOIN enrollments_grade eg ON e.id = eg.enrollmentId
        JOIN student_cohorts sc ON e.cohortId = sc.id
        WHERE e.studentId = ? 
          AND sc.courseId = ?
          AND eg.status = 'Aprobado'
    `, [studentId, courseId]);
    return res.map((r: any) => r.moduleId);
}

export async function getEnrollmentHistory(studentId: string) {
    const res = await query(`
        SELECT 
            e.id AS enrollmentId,
            e.enrollmentType,
            e.parentEnrollmentId,
            eg.status AS gradeStatus,
            eg.score,
            sec.moduleId,
            m.description AS moduleDescription,
            sec.code AS sectionCode,
            p.id AS periodId,
            p.year,
            p.period,
            p.modality
        FROM enrollments e
        JOIN enrollments_grade eg ON e.id = eg.enrollmentId
        JOIN sections sec ON e.sectionId = sec.id
        JOIN modules m ON sec.moduleId = m.id
        JOIN periods p ON sec.periodId = p.id
        WHERE e.studentId = ?
        ORDER BY e.dateEnrollment DESC
    `, [studentId]);
    return res;
}

export async function createStudentCohort(data: {
    studentId: string;
    periodId: string;
    sectionCode: string;
    courseId: string;
}) {
    const cohortId = crypto.randomUUID();
    await execute(`
        INSERT INTO student_cohorts (id, studentId, periodId, sectionCode, courseId, enrollmentDate, status)
        VALUES (?, ?, ?, ?, ?, NOW(), 'En curso')
    `, [cohortId, data.studentId, data.periodId, data.sectionCode, data.courseId]);
    return cohortId;
}

export async function getEnrollmentCountBySection(sectionId: string) {
    const res = await query(`
        SELECT COUNT(*) as enrolledCount 
        FROM enrollments 
        WHERE sectionId = ?
    `, [sectionId]);
    return res[0]?.enrolledCount || 0;
}

// verifyAndUpdateEnrollment (aqui) se elimino en T4 del P0.
//
// Hacia `UPDATE enrollments SET status = 'Pagada' WHERE studentId = ?` sin
// filtrar por estado ni por seccion: marcaba como pagadas TODAS las inscripciones
// del alumno, incluidas las que ya estaban saldadas. Ademas se llamaba FUERA de la
// transaccion del pago y sin await, asi que su error se perdia en silencio.
//
// Ahora la regla vive en `settleEnrollmentsForInvoice` (dbConnection/payments.ts),
// dentro de la transaccion y con `AND status = 'Deuda'`.
// El problema de fondo sigue abierto: el esquema no relaciona una factura con las
// inscripciones que salda. Ver PLAN-P0-FACTURACION.md.
