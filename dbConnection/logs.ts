import { query, execute } from "../dbConnection.ts"

// Adaptación a la nueva estructura de changelogs (create_at en lugar de dateTime, userId único)
export async function getLogs(page: number) {
    const res = await query(`
        SELECT
            create_at,
            changeType,
            description
        FROM changelogs
        ORDER BY create_at DESC
        LIMIT 10 OFFSET ?
    `, [(page-1)*10])
    return res
}
