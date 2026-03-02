import { query, execute } from "../dbConnection.ts"

export async function getLogs(page: number) {
    const res = await query(`
        SELECT
            changelogs.dateTime,
            changelogs.changeType,
            modificated.name AS modificatedName,
            modificated.lastname AS modificatedLastname,
            modificator.name AS modificatorName,
            modificator.lastname AS modificatorLastname
        FROM changelogs
        JOIN users AS modificated ON changelogs.userModificatedId = modificated.id
        JOIN users AS modificator ON changelogs.userModificatorId = modificator.id
        ORDER BY changelogs.dateTime DESC
        LIMIT 10 OFFSET ?
    `, [(page-1)*10])
    return res
}