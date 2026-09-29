import { query, execute } from "../dbConnection.ts"
import * as t from "../interfaces.ts"
import { toISODate } from "../functions/validators.ts"

export async function openPeriod(data: t.newPeriod){
    // Antes ambas fechas salian de `data.startDate`, asi que un periodo duraba
    // 0 dias. `toISODate` ademas hace zero-padding: el formato a mano producia
    // `2026-2-4`, que MariaDB guardaba como texto.
    const startDate = toISODate(data.startDate)
    const endDate = toISODate(data.endDate)
    const values = [
        data.year,
        data.period,
        data.modality,
        startDate,
        endDate
    ]
    const res = await execute(`
        INSERT INTO periods(year, period, modality,startDate, endDate)
        VALUES (?, ?, ?, ?, ?)
    `, values)
    return res
}


export async function getPeriods(){
    const res = await query(`
        SELECT id, year, period, modality, startDate, endDate, status FROM periods
        ORDER BY year DESC, period DESC
    `,
    )
    return res
}

export async function getActivePeriods(){
    const res = await query(`
        SELECT id, year, period, modality, startDate, endDate, status FROM periods WHERE status = 'En curso'
        ORDER BY year DESC, period DESC
    `)
    return res
}

export async function getCurrentPeriod(){
    const res = await query(`
        SELECT id, year, period, startDate, endDate FROM periods
        WHERE status = 'En curso'
    `)
    return res
}

/**
 * Un solo periodo `En curso` a la vez.
 *
 * Sin esto `getCurrentPeriod` puede devolver varias filas y cualquier JOIN que
 * lo use se multiplica. `modality` es parte de la clave: Intensivo y Sabatino
 * pueden coexistir.
 */
export async function runningPeriodExists(year: number, period: number, modality: string) {
    const res = await query(`
        SELECT id FROM periods
        WHERE year = ? AND period = ? AND modality = ? AND status = 'En curso'
    `, [year, period, modality])
    return res.length > 0
}

export async function periodExists(year: number, period: number, modality?: string) {
    if (modality === undefined) {
        const res = await query(`SELECT id FROM periods WHERE year = ? AND period = ?`, [year, period])
        return res.length > 0
    }
    const res = await query(`SELECT id FROM periods WHERE year = ? AND period = ? AND modality = ?`, [year, period, modality])
    return res.length > 0
}

/** El periodo existe y sigue abierto. Una seccion no puede abrirse en uno cerrado. */
export async function openPeriodExists(periodId: string) {
    const res = await query(`
        SELECT id FROM periods WHERE id = ? AND status = 'En curso'
    `, [periodId])
    return res.length > 0
}

/**
 * Desambigua `closePeriod` y `changeEndDatePeriod` por modalidad.
 *
 * Sin `modality` el UPDATE cierra o modifica las dos modalidades de una vez.
 */
export async function changeEndDatePeriod(year: number, period: number, newEndDate: Date | string, modality?: string){
    const newEndDateISO = toISODate(newEndDate)
    if (modality === undefined) {
        const res = await execute(`
            UPDATE periods 
            SET endDate = ?
            WHERE year = ? AND period = ?	
        `, [newEndDateISO, year, period])
        return res
    }
    const res = await execute(`
        UPDATE periods 
        SET endDate = ?
        WHERE year = ? AND period = ? AND modality = ?
    `, [newEndDateISO, year, period, modality])
    return res
}

/** Propaga el cierre a las secciones y a los cohortes del periodo. */
export async function closePeriod(year: number, period: number, modality?: string){
    const where = modality === undefined
        ? 'year = ? AND period = ?'
        : 'year = ? AND period = ? AND modality = ?'
    const params = modality === undefined ? [year, period] : [year, period, modality]

    const res = await execute(`
        UPDATE periods 
        SET status = 'Finalizado'
        WHERE ${where}
    `, params)

    await execute(`
        UPDATE sections s
        JOIN periods p ON s.periodId = p.id
        SET s.status = 'Cerrada'
        WHERE p.year = ? AND p.period = ?${modality === undefined ? '' : ' AND p.modality = ?'}
    `, params)

    await execute(`
        UPDATE student_cohorts sc
        JOIN periods p ON sc.periodId = p.id
        SET sc.status = 'Finalizado'
        WHERE p.year = ? AND p.period = ?${modality === undefined ? '' : ' AND p.modality = ?'}
    `, params)

    return res
}

export async function getPeriodById(periodId: string) {
    const res = await query(`SELECT * FROM periods WHERE id = ?`, [periodId]);
    return res[0] || null;
}

/** Localiza el periodo por (anio, periodo) y, si viene, por modalidad. */
export async function getPeriodByYearAndNumber(year: number, period: number, modality?: string) {
    const res = await query(`
        SELECT id, year, period, modality, startDate, endDate, status
        FROM periods
        WHERE year = ? AND period = ?${modality === undefined ? '' : ' AND modality = ?'}
        LIMIT 1
    `, modality === undefined ? [year, period] : [year, period, modality])
    return res[0] || null;
}
