import mariadb from 'npm:mariadb'
import type { PoolConnection } from 'npm:mariadb'
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

export async function transaction(queries: string[], params: any[] = []){
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

/**
 * Ejecuta un bloque dentro de una transaccion sobre una unica conexion.
 *
 * Es la unica forma correcta cuando hay que LEER y luego ESCRIBIR de forma
 * consistente, por ejemplo comprobar el cupo de una seccion con
 * `SELECT ... FOR UPDATE` y despues insertar la inscripcion.
 *
 * `transaction()` no sirve para eso: no devuelve resultados, y ademas
 * `query()` y `execute()` sacan una conexion distinta del pool en cada
 * llamada, asi que un `START TRANSACTION` emitido por `query()` se aplica a
 * una conexion que se devuelve al pool de inmediato y las consultas
 * siguientes no comparten el mismo contexto transaccional. Por eso el
 * `FOR UPDATE` no bloqueaba nada y dos inscripciones simultaneas podian
 * superar el cupo.
 *
 * Si `fn` lanza, se hace rollback y el error se propaga sin tocar.
 */
export async function withTransaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T>{
	const connection = await db.getConnection()
	try{
		await connection.beginTransaction()
		const res = await fn(connection)
		await connection.commit()
		return res
	}catch(err){
		try{
			await connection.rollback()
		}catch(rollbackErr){
			// Si falla el rollback la conexion queda en estado dudoso: se
			// descarta en lugar de devolverla al pool.
			console.log('rollback fallido', rollbackErr)
			connection.destroy()
		}
		throw err
	}finally{
		connection.release()
	}
}