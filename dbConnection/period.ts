import { query, execute } from "../dbConnection.ts"
import * as t from "../interfaces.ts"

export async function openPeriods(data: t.newPeriod[]){
    const values = data.map((period) => [
        period.year,
        period.period,
        period.startDate,
        period.endDate //Confirmar si esta fecha se dicta al iniciar el periodo o al finalizarlo
    ])
    const res = await execute(`
        INSERT INTO periods(year, period, startDate, endDate)
        VALUES ?	
    `, [values])
    return res
}

export async function getCurrentPeriod(){
    const res = await query(`
        SELECT id, year, period, startDate, endDate FROM periods
        WHERE state = 'En curso'
    `)
    return res
}

export async function changeEndDatePeriod(year: number, periodId: number, newEndDate: Date){
    const res = await execute(`
        UPDATE periods 
        SET endDate = ?
        WHERE year = ? AND period = ?	
    `, [newEndDate, year, periodId])
    return res
}

export async function closePeriod(year: number, periodId: number){
    const res = await execute(`
        UPDATE periods 
        SET status = 'Finalizado'
        WHERE year = ? AND period = ?	
    `, [year, periodId])
    return res
}