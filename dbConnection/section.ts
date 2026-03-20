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

export async function getSections() {
    const res = await query(`
        SELECT id, periodId, moduleId, teacherId, code, modality, quota, status FROM sections
        ORDER BY periodId DESC, code ASC
    `)
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
