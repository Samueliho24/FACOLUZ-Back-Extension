import exp from "node:constants";
import { query, execute } from "../dbConnection.ts"
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

    // Validar cupo de la sección
    const cupoRes = await query(`
        SELECT s.quota, COUNT(e.id) as enrolled 
        FROM sections s 
        LEFT JOIN enrollments e ON e.sectionId = s.id 
        WHERE s.id = ?
        GROUP BY s.id
    `, [sectionId]);
    
    if (cupoRes[0] && cupoRes[0].enrolled >= cupoRes[0].quota) {
        throw new Error('Sección sin cupo disponible');
    }

    const res1 = await execute(`
        INSERT INTO enrollments(id, studentId, sectionId, cohortId, enrollmentType, parentEnrollmentId, dateEnrollment, status)
        VALUES(?, ?, ?, ?, ?, ?, NOW(), ?)
    `, [enrollmentId, studentId, sectionId, cohortId, enrollmentType, parentEnrollmentId, 'Deuda']);

    await execute(`
        INSERT INTO enrollments_grade(enrollmentId, status)
        VALUES (?, ?)
    `, [enrollmentId, 'Inscrito']);

    return { enrollmentId, ...res1 };
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

export async function verifyAndUpdateEnrollment(invoiceId: string){
    interface ires0{
        studentsId: string,
        billable: string
    }

    const res0: ires0 = (await query(`
        SELECT 
            b.name AS billable,
            s.Id AS studentsId
        FROM invoices i
        JOIN billables b ON i.billableid = b.id
        JOIN students s ON i.StudentIdentification = s.studentsIdentification
        WHERE i.id = ?
    `, [invoiceId]))[0]

    console.log(res0);
    console.log(res0.billable == "Inscripcion")
    console.log(res0.billable === "Inscripcion")

    if(res0.billable == "Inscripcion"){
        const enrrollment = await execute(`
            UPDATE enrollments SET status = 'Pagada' WHERE studentId = ?
        `, [res0.studentsId])

        return;
    }else{
        return;
    }
}