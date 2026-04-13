import { query, execute } from "../dbConnection.ts"
import * as t from "../interfaces.ts"

export async function openSection(data: t.newSection) {
    const values = [
        data.periodId,
        data.moduleId,
        data.teacherId,
        data.code,
        data.quota,
    ]
    const res = await execute(`
        INSERT INTO sections(periodId, moduleId, teacherId, code, quota)
        VALUES (?, ?, ?, ?, ?)
    `, values)
    return res
}

export async function getSections(id: string) {
    const res = await query(`
        SELECT s.id, s.periodId, m.description,s.moduleId, s.teacherId, s.code, s.quota, s.status FROM sections s JOIN modules m ON s.moduleId = m.id WHERE s.periodId = ?
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

export async function getSectionByModule(moduleId: string) {
    const res = await query(`
        SELECT s.id, s.periodId,s.moduleId, s.teacherId, s.code, s.quota, s.status, p.period, p.year, p.modality FROM sections s JOIN periods p ON s.periodId = p.id WHERE s.moduleId = ? AND s.status = 'Activa'
        ORDER BY s.code ASC
    `, [moduleId])
    return res
}

export async function getStudentsInSection(sectionId: string) {
    const res = await query(`
        SELECT s.id, s.name, s.lastname, s.studentsIdentification, e.dateEnrollment, e.status, eg.status As gradeStatus
        FROM enrollments e 
        JOIN students s ON e.studentId = s.id JOIN enrollments_grade eg ON e.id = eg.enrollmentId 
        WHERE e.sectionId = ? AND eg.status = 'Inscrito'
    `, [sectionId])
    console.log(res)
    return res
}

export async function getSectionByPeriod(periodId: string) {
    const res = await query(`
        SELECT s.id, s.periodId, m.description,s.moduleId, s.code FROM sections s JOIN modules m ON s.moduleId = m.id WHERE s.status = 'Activa' AND s.periodId = ?
        ORDER BY s.code ASC
    `, [periodId])
    console.log(res)
    return res
}