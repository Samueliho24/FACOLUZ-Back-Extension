// ============================================================================
//  Prueba del guard REAL, sin base de datos.
//
//  No se importa middlewares.ts a proposito: ese archivo hace
//  `import { secret } from "./main.ts"` y main.ts arranca el servidor, que
//  necesita MariaDB. En vez de eso se extrae el bloque function guardFor
//  del fuente y se ejecuta contra el archivo real, con tokens firmados de
//  verdad por jsonwebtoken. Si alguien edita el guard, esta prueba lo ve.
// ============================================================================
import jwt from "npm:jsonwebtoken"
import { assert, assertEquals } from "@std/assert"

const source = await Deno.readTextFile("./middlewares.ts")

// Secreto de prueba. No es el de .env: este archivo no debe depender de la
// configuracion local para poder correr.
const SECRET = 'secreto-de-prueba'

/** Firma un token como lo hace main.ts, con el payload que espera el guard. */
const signToken = (type: number, expOffset = 600) => jwt.sign(
	{ id: 1, name: 'x', type, exp: Math.floor(Date.now() / 1000) + expOffset }, SECRET)

// --- extraer guardFor tal cual esta en el fuente --------------------------
const start = source.indexOf('function guardFor(')
assert(start !== -1, 'no se encontro guardFor en middlewares.ts')
// El cierre de la funcion es una llave al inicio de linea. Se buscan los dos
// finales de linea porque el archivo puede estar en LF o en CRLF segun quien
// lo haya escrito por ultima vez.
const endLf = source.indexOf('\n}\n', start)
const endCrlf = source.indexOf('\r\n}\r\n', start)
const end = endLf === -1 ? endCrlf : (endCrlf === -1 ? endLf : Math.min(endLf, endCrlf))
assert(end !== -1, 'no se pudo delimitar el cuerpo de guardFor')
const body = source.slice(start, end + 3)

// El secreto de prueba. Se inyecta como parametro en vez de leerlo de
// main.ts para no arrastrar el arranque del servidor.
// El `maxType: number` de la firma es anotacion de TypeScript, y `new Function`
// compila JavaScript plano: hay que borrarla antes de evaluar.
// ElReplace va por expresion regular y no por cadena literal: middlewares.ts
// usa comillas simples en header.split(' ')[1], y un replace de texto plano
// con comillas dobles no encuentra nada. Cuando eso pasa, `secret` queda
// sin definir dentro del codigo evaluado, jwt.verify lanza por secreto
// invalido, y TODOS los casos devuelven 401: la prueba pasa por el motivo
// equivocado.
const plain = body
	.replace(/function guardFor\(maxType: number\)/, 'function guardFor(maxType)')
	.replace(/jwt\.verify\(header\.split\(\s*(['"])\s*\1\s*\)\[1\]\s*,\s*secret\s*\)/,
		'jwt.verify(header.split(" ")[1], maxType_secret)')

assert(plain !== body, 'el replace no cambio nada: la extraccion del fuente no coincide')
assert(plain.includes('maxType_secret'), 'el secreto de prueba no se inyecto')
assert(!/\bsecret\b/.test(plain), 'quedo una referencia a `secret` sin definir')

// Los parentesis no son cosmeticos: sin ellos, `return function guardFor(){...}`
// se interpreta como una declaracion de funcion y devuelve undefined, que es
// exactamente el fallo que hacia pasar la comprobacion de cordura sin avisar.
const guardFactory = new Function('jwt', 'maxType_secret', `return (${plain})`)(jwt, SECRET)

// Comprobacion de cordura: si la extraccion del fuente salio mal, la
// prueba pasaria por aparecer errores en todas partes. Se verifica primero
// que un token valido con el rol permitido SI avanza.
{
	const probe = fakeRes()
	let reached = false
	guardFactory(2)({ headers: { authorization: `Bearer ${signToken(0)}` } }, probe, () => { reached = true })
	assert(reached, 'extraccion fallida: un token valido de type 0 no avanza con maxType 2')
	assertEquals(probe.statusCode, null, 'extraccion fallida: respondio cuando deberia avanzar')
}

console.log('guardFor extraido de middlewares.ts, %d caracteres\n', body.length)

// --- Double de respuesta --------------------------------------------------
// Double de respuesta de Express: registra el status y el cuerpo, y marca
// que se cerro. Lo que importa es `ended`, porque un `send` sin return
// seguido de next() es justamente lo que hacia el guard viejo.
interface FakeRes {
	statusCode: number | null
	body: unknown
	ended: boolean
	status(code: number): FakeRes
	send(body: unknown): FakeRes
}

function fakeRes(): FakeRes {
	const r = {
		statusCode: null as number | null,
		body: null as unknown,
		ended: false,
		status(code: number) { r.statusCode = code; return r },
		send(body: unknown) { r.body = body; r.ended = true; return r },
	}
	return r
}

const run = (guard: (req: unknown, res: FakeRes, next: () => void) => void, req: unknown) => {
	const res = fakeRes()
	let next = false
	guard(req, res, () => { next = true })
	return { res, next }
}

// --- 1. el 401 ya NO ejecuta el handler ----------------------------------
// Este es el bug que se corrigio. Con el codigo viejo, un type prohibido
// devolvia 401 y aun asi llamaba a next(), con lo que el handler corria y
// las escrituras se confirmaban.
console.log('1. el 401 corta la ejecucion (el bug corregido)')
// La politica esperada, escrita de forma explicita. No se deriva del codigo
// bajo prueba: si se derivara, la comprobacion no probaria nada.
const POLICY: Array<[string, number, number, boolean]> = [
	['systemAdmin  / type 0', 0, 0, true],
	['systemAdmin  / type 1', 0, 1, false],
	['systemAdmin  / type 2', 0, 2, false],
	['chief        / type 0', 1, 0, true],
	['chief        / type 1', 1, 1, true],
	['chief        / type 2', 1, 2, false],
	['worker       / type 0', 2, 0, true],
	['worker       / type 2', 2, 2, true],
	['worker       / type 3', 2, 3, false],
	['worker       / type 4', 2, 4, false],
	['worker       / type 100', 2, 100, false],
]
for (const [name, max, type, allowed] of POLICY) {
	const { res, next } = run(guardFactory(max), {
		headers: { authorization: `Bearer ${signToken(type)}` },
	})
	const label = `${name} -> ${allowed ? 'pasa' : '401 sin ejecutar'}`
	if (allowed) {
		assert(next, `${label}: se esperaba que avanzara`)
		assertEquals(res.statusCode, null, `${label}: no deberia haber respondido`)
	} else {
		assert(!next, `${label}: el guard SIGIO ejecutando tras el 401`)
		assertEquals(res.statusCode, 401, `${label}: status inesperado`)
	}
	console.log('  ok   ', label)
}

// --- 2. token vencido ------------------------------------------------------
// jwt.verify ya lanza cuando exp paso. Se comprueba que el catch lo
// traduzca a 401 y no a un 500.
console.log('\n2. token vencido -> 401, no 500')
{
	const { res, next } = run(guardFactory(2), {
		headers: { authorization: `Bearer ${signToken(2, -10)}` },
	})
	assert(!next, 'un token vencido no debe avanzar')
	assertEquals(res.statusCode, 401)
	console.log('  ok    vencido -> 401, sin avanzar')
}

// --- 3. token manipulado ---------------------------------------------------
console.log('\n3. token manipulado -> 401')
{
	// Firma con otra clave: la estructura del token sigue siendo valida,
	// asi que un parseo ingenuo lo dejaria pasar.
	const forged = jwt.sign({ id: 1, name: 'x', type: 0, exp: Math.floor(Date.now() / 1000) + 600 },
		'CLAVE-DEL-ATACANTE')
	const { res, next } = run(guardFactory(0), {
		headers: { authorization: `Bearer ${forged}` },
	})
	assert(!next, 'un token firmado con otra clave no debe avanzar')
	assertEquals(res.statusCode, 401)
	console.log('  ok    firmado con otra clave -> 401')
}

// --- 4. cabeceras ausentes o mal formadas ---------------------------------
// Antes `req.headers.authorization.split(" ")[1]` reventaba con
// TypeError cuando no habia cabecera. El catch lo traducía a 401 por
// accidente; ahora la ausencia se comprueba de forma explicita.
console.log('\n4. cabecera ausente o mal formada -> 401, sin excepcion')
for (const [label, headers] of [
	['sin cabecera', {}],
	['sinBearer', { authorization: 'abc' }],
	['Bearer solo', { authorization: 'Bearer ' }],
	['token basura', { authorization: 'Bearer no-es-un-jwt' }],
]) {
	const { res, next } = run(guardFactory(0), { headers })
	assert(!next, `${label}: no debe avanzar`)
	assertEquals(res.statusCode, 401, `${label}: status inesperado`)
	console.log('  ok   ', label, '-> 401')
}

// --- 5. la eliminacion de la comprobacion manual de expiracion -------------
// Se revisa el codigo ejecutable, no el archivo entero: guardFor arrastra
// arriba el bloque comentado que documenta el bug anterior, y `currentTime`
// aparece ahi a proposito. Contarlo seria un falso positivo.
console.log('\n5. el codigo muerto de expiracion se elimino')
const code = source
	.split('\n')
	.map((l) => l.replace(/^\s*\/\/.*$/, ''))   // fuera los comentarios de linea
	.join('\n')
	.split('\n').filter((l) => !l.trimStart().startsWith('*') && !l.trimStart().startsWith('/*'))
	.join('\n')
assert(!code.includes('currentTime'), 'sigue el currentTime = Date.now()... en codigo')
assert(!code.includes('Sesion expirada'), 'sigue el mensaje "Sesion expirada" en codigo')
console.log('  ok    sin currentTime, sin "Sesion expirada" en codigo')

// --- 6. ningun 401 sin return ---------------------------------------------
// El defecto original era un `res.status(401).send(...)` sin return. Se
// comprueba que ningun 401 del guard deje la expresion sin terminar en
// return, que es lo que permitiria seguir hacia next().
console.log('\n6. todo 401 del guard va precedido de return')
const guardSource = body
	.split('\n')
	.filter((l) => l.includes('.status(401)'))
	.map((l) => l.trim())
for (const line of guardSource) {
	// El 401 tiene que ser el retorno de la rama, no la sentencia completa.
	// Se busca el `return` que precede al status(401) dentro de la misma
	// linea: `if (!header) return res.status(401)...` es correcto, y
	// `res.status(401)...` a secas es exactamente el bug original.
	const returnIndex = line.indexOf('return')
	const statusIndex = line.indexOf('.status(401)')
	assert(returnIndex !== -1, `un 401 no tiene return: ${line}`)
	assert(returnIndex < statusIndex, `el return no precede al 401: ${line}`)
}
assert(guardSource.length >= 2, `se esperaban al menos 2 respuestas 401, hay ${guardSource.length}`)
console.log(`  ok    ${guardSource.length} respuestas 401, todas con return`)

console.log('\nOK: las 25 comprobaciones del guard pasaron\n')
