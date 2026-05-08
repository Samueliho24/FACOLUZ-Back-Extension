import { query, execute } from "../dbConnection.ts";
import { IUser } from "../types/IUser.ts"

export async function getAllUsers(){
    const res = await query(`
        SELECT 
            id,
            name,
            lastname,
            type,
            active
        FROM users	
    `)

    return res;
}

export async function createNewUser(user: IUser){
    const _res = await execute(`
        INSERT INTO users(id, name, lastname, passwordSHA256, type, active)
        VALUES(?, ?, ?, ?, ?, ?, ?);
    `, [user.id, user.name, user.lastname, user.passwordSHA256, user.type, user.active])
}

export async function updateUser(user: IUser){
    const _res = await execute(`
        UPDATE users 
        SET
            name = ?,
            lastname = ?,
            type = ?,
            active = ?
        WHERE id = ?;
    `, [user.name, user.lastname, user.type, user.active, user.id])
}

export async function updatePassword(userId: string, newPassword: string){
    const _res = await execute(`
        UPDATE users SET passwordSHA256 = ? WHERE id = ?	
    `, [newPassword, userId])
}