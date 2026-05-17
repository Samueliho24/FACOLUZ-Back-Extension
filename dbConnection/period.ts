import { query, execute } from "../dbConnection.ts"
import * as t from "../interfaces.ts"

export async function openPeriod(data: t.newPeriod){
    const values = [
        data.year,
        data.period,
        data.modality,
        data.startDate,
        data.endDate
    ]
    const res = await execute(`
        INSERT INTO periods(year, period, modality,startDate, endDate)
        VALUES (?, ?, ?, ?, ?)
    `, values)
    return res
}


export async function getPeriods(){
    const res = await query(`
        SELECT id, year, period, modality, startDate, endDate, state FROM periods
        ORDER BY year DESC, period DESC
    `,
    )
    return res
}

export async function getActivePeriods(){
    const res = await query(`
        SELECT id, year, period, modality, startDate, endDate, state FROM periods WHERE state = 'En curso'
        ORDER BY year DESC, period DESC
    `)
    return res
}

export async function getCurrentPeriod(){
    const res = await query(`
        SELECT id, year, period, startDate, endDate FROM periods
        WHERE state = 'En curso'
    `)
    return res
}

export async function changeEndDatePeriod(year: number, period: number, newEndDate: Date){
    const res = await execute(`
        UPDATE periods 
        SET endDate = ?
        WHERE year = ? AND period = ?	
    `, [newEndDate, year, period])
    return res
}

export async function closePeriod(year: number, period: number){
    const res = await execute(`
        UPDATE periods 
        SET state = 'Finalizado'
        WHERE year = ? AND period = ?	
    `, [year, period])
    return res
}

export async function getPeriodById(periodId: string) {
    const res = await query(`SELECT * FROM periods WHERE id = ?`, [periodId]);
    return res[0] || null;
}