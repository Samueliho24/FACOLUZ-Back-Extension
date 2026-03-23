import { query, execute } from "../dbConnection.ts"
import * as t from "../interfaces.ts"

export async function openSection(data: t.newSection) {
    const values = [
        data.periodId,
        data.moduleId,
        data.teacherId,
        data.code,
        data.modality,
        data.quota,
    ]
    const res = await execute(`
        INSERT INTO sections(periodId, moduleId, teacherId, code, modality, quota, status)
        VALUES (?, ?, ?, ?, ?, ?, 'Activa')
    `, values)
    return res
}

export async function getSections(id: string) {
    const res = await query(`
        SELECT id, periodId, moduleId, teacherId, code, modality, quota, status FROM sections
        WHERE periodId = ?
        ORDER BY code ASC
    `, [id])
    return res
}

export async function getCurrentSection() {
    const res = await query(`
        SELECT id, periodId, moduleId, teacherId, code, modality, quota, status FROM sections
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
        SELECT id, periodId, moduleId, teacherId, code, modality, quota, status FROM sections
        WHERE moduleId = ? AND status = 'Activa'
        ORDER BY code ASC
    `, [moduleId])
    return res
}
