import mariadb from 'npm:mariadb'
import * as t from './interfaces.ts'
import "jsr:@std/dotenv/load";
import { UUID } from "node:crypto";


const db = mariadb.createPool({
	host: Deno.env.get("BDD_HOST"),
	user: Deno.env.get("BDD_USER"),
	password: Deno.env.get("BDD_PASSWORD"),
	database: Deno.env.get("BDD_DATABASE"),
	port: Number(Deno.env.get("BDD_PORT")),
	acquireTimeout: Number(Deno.env.get("BDD_TIMEOUT")),
	connectionLimit: Number(Deno.env.get("BDD_CONECTION_LIMITS"))
})

export async function query(query: string, params?: object): Promise<any[]>{
	let connection
	try{
		connection = await db.getConnection()
		const res = await connection.query(query, params)
		return res
	}catch(err){
		console.log(err)
		throw err
	}finally{
		connection?.release()
	}
}

export async function execute(query: string, params?: object) {
	let connection
	try{
		connection = await db.getConnection()
		const _res = await connection.execute(query, params)
	}catch(err){
		console.log(err)
		throw err
	}finally{
		connection?.release()
	}
}

export async function transaction(queries: string[], params?: any[]){
	let connection
	try{
		connection = await db.getConnection()
		await connection.beginTransaction()

		for(let i = 0; i <= queries.length - 1; i++){
			await connection.execute(queries[i], params[i] ?? [])
		}

		await connection.commit()
	}catch(err){
		console.log(err)
		await connection?.rollback()
		throw err
	}finally{
		await connection?.release()
	}
}