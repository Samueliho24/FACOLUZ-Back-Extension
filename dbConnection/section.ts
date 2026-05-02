import { query, execute } from "../dbConnection.ts"
import * as t from "../interfaces.ts"

export async function openSection(data: t.newSection) {
    const sectionId = crypto.randomUUID()
    const values = [
        sectionId,
        data.periodId,
        data.moduleId,
        data.code,
        data.quota,
    ]
    const res = await execute(`
        INSERT INTO sections(id, periodId, moduleId, code, quota)
        VALUES (?, ?, ?, ?, ?)
    `, values)

    // NUEVO: Asignar profesores a la sección
    if (data.teachers && data.teachers.length > 0) {
        for (let i = 0; i < data.teachers.length; i++) {
            const teacher = data.teachers[i]
            await execute(`
                INSERT INTO sections_teachers(sectionId, teacherId, evaluationOrder)
                VALUES (?, ?, ?)
            `, [sectionId, teacher.id, i + 1])
        }
    }

    return { sectionId, ...res }
}

export async function getSections(id: string) {
    const res = await query(`
        SELECT s.id, s.periodId, m.description, s.moduleId, s.code, 
                s.quota, s.status,
                GROUP_CONCAT(DISTINCT CONCAT(t.name, ' ', t.lastName) 
                ORDER BY st.evaluationOrder SEPARATOR ' / ') AS teachers
        FROM sections s 
        JOIN modules m ON s.moduleId = m.id 
        LEFT JOIN sections_teachers st ON s.id = st.sectionId
        LEFT JOIN teachers t ON st.teacherId = t.id
        WHERE s.periodId = ?
        GROUP BY s.id
        ORDER BY s.code ASC
    `, [id])
    return res
}

export async function getCurrentSection() {
    const res = await query(`
        SELECT id, periodId, moduleId, teacherId, code, quota, status FROM sections
        WHERE status = 'Activa'
    `)
    return res
}

export async function closeSection(sectionId: string) {
    const res = await execute(`
        UPDATE sections
        SET status = 'Cerrada'
        WHERE id = ?
    `, [sectionId])
    return res
}

/*export async function getSectionByModule(moduleId: string) {
    const res = await query(`
        SELECT s.id, s.periodId,s.moduleId, s.code, s.quota, s.status, p.period, p.year, p.modality FROM sections s JOIN periods p ON s.periodId = p.id WHERE s.moduleId = ? AND s.status = 'Activa'
        ORDER BY s.code ASC
    `, [moduleId])
    return res
}*/

export async function getSectionByModule(moduleId: string, sectionCode?: string, periodId?: string) {
    let sql = `
        SELECT s.id, s.periodId, s.moduleId, s.code, s.quota, s.status, 
                p.period, p.year, p.modality, p.status AS periodStatus
        FROM sections s 
        JOIN periods p ON s.periodId = p.id 
        WHERE s.moduleId = ? AND s.status = 'Activa'
    `;
    const params: any[] = [moduleId];

    if (sectionCode) {
        sql += ` AND s.code = ?`;
        params.push(sectionCode);
    }
    if (periodId) {
        sql += ` AND s.periodId = ?`;
        params.push(periodId);
    }

    sql += ` ORDER BY p.year DESC, p.period DESC, s.code ASC`;
    
    const res = await query(sql, params);
    console.log(res)
    return res;
}

export async function getStudentsInSection(sectionId: string) {
    const res = await query(`
        SELECT 
            s.id, 
            s.name, 
            s.lastname, 
            s.studentsIdentification, 
            e.id AS enrollmentId,
            e.dateEnrollment, 
            e.status, 
            eg.id AS enrollmentGradeId,
            eg.status AS gradeStatus,
            m.evaluationMode
        FROM enrollments e 
        JOIN students s ON e.studentId = s.id 
        JOIN sections sec ON e.sectionId = sec.id
        JOIN modules m ON sec.moduleId = m.id
        LEFT JOIN enrollments_grade eg ON e.id = eg.enrollmentId 
        WHERE e.sectionId = ? AND (eg.status = 'Inscrito' OR eg.status IS NULL)
    `, [sectionId])
    
    return res
}
/*export async function getStudentsInSection(sectionId: string) {
    const res = await query(`
        SELECT s.id, s.name, s.lastname, s.studentsIdentification, e.dateEnrollment, e.status, eg.status As gradeStatus
        FROM enrollments e 
        JOIN students s ON e.studentId = s.id JOIN enrollments_grade eg ON e.id = eg.enrollmentId 
        WHERE e.sectionId = ? AND eg.status = 'Inscrito'
    `, [sectionId])
    console.log(res)
    return res
}*/

export async function getSectionByPeriod(periodId: string) {
    const res = await query(`
        SELECT s.id, s.periodId, m.description,s.moduleId, s.code FROM sections s JOIN modules m ON s.moduleId = m.id WHERE s.status = 'Activa' AND s.periodId = ?
        ORDER BY s.code ASC
    `, [periodId])
    console.log(res)
    return res
}