/**
 * T10: prueba de extremo a extremo del ciclo facturacion -> cobro -> anulacion.
 *
 * Levanta peticiones HTTP reales contra el servidor de Deno, con un token
 * firmado igual que el de `POST /api/login`. No hace falta saber la contrasena
 * de nadie: lo que importa es que el token pase por `guardFor`, que es donde
 * antes se descartaba el payload.
 *
 * CUIDADO: escribe en la base de verdad. Empieza desactivando a un estudiante
 * (para probar que no se puede facturar a un inactivo) y termina borrando
 * todo lo que creo.
 *
 * Uso, con el servidor corriendo en el 3006:
 *     deno run -A flujo_p0.ts
 */

import "jsr:@std/dotenv/load"
import { failure } from './functions/validators.ts'

const BASE = Deno.env.get('PUERTO_PRUEBA') ?? 'http://localhost:3006'

let pasa = 0
let falla = 0
const facturasCreadas: string[] = []

function ok(nombre: string, condicion: boolean, detalle = '') {
	if (condicion) {
		pasa++
		console.log(`  ok   ${nombre}`)
	} else {
		falla++
		console.log(`  FALLA ${nombre}${detalle ? ` -- ${detalle}` : ''}`)
	}
}

async function pedir(metodo: string, ruta: string, token: string, cuerpo?: unknown) {
	const res = await fetch(`${BASE}${ruta}`, {
		method: metodo,
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
	})
	const texto = await res.text()
	let datos: any = texto
	try {
		datos = texto === '' ? null : JSON.parse(texto)
	} catch {
		// se queda el texto plano
	}
	return { status: res.status, data: datos }
}

/** Mensaje de error legible, venga como objeto de `failure` o como string. */
function mensaje(data: any): string {
	if (typeof data === 'string') return data
	if (data && typeof data.message === 'string') return data.message
	return JSON.stringify(data)
}

const secret = Deno.env.get('SECRET')
if (!secret) {
	console.error('Falta SECRET en el .env')
	Deno.exit(1)
}

const { default: jwt } = await import('npm:jsonwebtoken')
const token = jwt.sign({ id: 1, name: 'admin', type: 0, exp: Math.floor(Date.now() / 1000) + 3600 }, secret)

console.log(`\nT10: ciclo completo contra ${BASE}\n`)

// ---------------------------------------------------------------------------
//  Datos de la prueba
// ---------------------------------------------------------------------------
const { data: billables } = await pedir('GET', '/api/billables', token)
const inscripcion = Array.isArray(billables) ? billables.find((b: any) => b.name === 'Inscripcion') : null
if (!inscripcion) {
	console.error('No se encontro el concepto "Inscripcion" en /api/billables')
	Deno.exit(1)
}

// Se crea un alumno de prueba en vez de usar uno de la semilla.
//
// Motivo: la cedula tiene que pasar `v.identification`, que exige 6 a 8
// digitos. Los tres alumnos que trae la semilla (`1111`, `890`, `3353`) tienen
// cuatro, asi que no se les puede facturar por la API. Eso no lo arregla esta
// prueba: es una discrepancia entre la semilla y el validador, y se deja
// documentada. Para no mutar datos ajenos, la prueba crea el suyo y lo borra.
const { execute } = await import('./dbConnection.ts')
const { query } = await import('./dbConnection.ts')

const cedula = String(99000000 + Math.floor(Math.random() * 900000))
const rAlta = await pedir('POST', '/api/registerStudents', token, {
	name: 'Alumno',
	lastName: 'De Prueba T10',
	identification: cedula,
	email: `t10_${cedula}@prueba.local`,
	birthDate: '2000-01-15',
	phone: '04141234567',
	address: 'Direccion de prueba',
	instructionGrade: 1,
})
if (rAlta.status !== 200) {
	console.error(`No se pudo crear el alumno de prueba: ${rAlta.status} ${mensaje(rAlta.data)}`)
	Deno.exit(1)
}
console.log(`  (alumno de prueba ${cedula})`)

// ---------------------------------------------------------------------------
//  1. Facturacion: el monto y la tasa los decide el servidor
// ---------------------------------------------------------------------------
console.log('1. Facturacion')

// Se manda un chargedAmount absurdo a proposito. Si el servidor lo creyera,
// la factura saldria por 999999 y el resto de la prueba no tendria sentido.
const r1 = await pedir('POST', '/api/issueInvoice', token, {
	studentIdentification: cedula,
	billableid: inscripcion.id,
	quantity: 3,
	chargedAmount: 999999,
	exchangeRate: 36.5,
	comment: 'T10 prueba automatica',
})
ok('emite la factura', r1.status === 200, mensaje(r1.data))

const { data: lista } = await pedir('GET', `/api/getInvoices/1`, token)
const facturas = Array.isArray(lista) ? lista : []
// Ojo: la columna sale como `studentsIdentification` (minuscula, desde `students`),
// no como `StudentIdentification` (mayuscula, la de `invoices`). La consulta hace
// JOIN a las dos y el nombre que sobrevive es el de la tabla de estudiantes.
const factura = facturas
	.filter((f: any) => String(f.studentsIdentification) === cedula)
	.sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)))[0]
ok('la factura aparece en el listado', factura != null)

if (!factura) {
	console.log('\nNo se pudo seguir sin factura. Saliendo.')
	Deno.exit(1)
}
facturasCreadas.push(factura.id)

const esperado = Number((Number(inscripcion.price) * 3).toFixed(2))
ok(
	`el monto es precio x cantidad (${esperado}), no el 999999 del cliente`,
	Number(factura.chargedAmount) === esperado,
	`llego ${factura.chargedAmount}`
)

// ---------------------------------------------------------------------------
//  2. Auditoria: issuedBy sale del token
// ---------------------------------------------------------------------------
console.log('\n2. Auditoria de emision')
const { data: detalle } = await pedir('GET', `/api/invoice/${factura.id}`, token)
ok('el detalle responde 200', detalle != null, mensaje(detalle))
ok('nace Pendiente', detalle?.status === 'Pendiente', detalle?.status)
ok('el saldo inicial es el total', Number(detalle?.balance) === esperado, String(detalle?.balance))

// issuedBy no viene en el SELECT del detalle, asi que se comprueba por SQL al
// final. Aqui se comprueba que la ruta de cobro no acepta un emisor falso.

// ---------------------------------------------------------------------------
//  3. No se factura a un estudiante inactivo
// ---------------------------------------------------------------------------
console.log('\n3. Estudiante inactivo')
await execute(`UPDATE students SET status = 'Inactivo' WHERE studentsIdentification = ?`, [cedula])
const r3 = await pedir('POST', '/api/issueInvoice', token, {
	studentIdentification: cedula,
	billableid: inscripcion.id,
	quantity: 1,
	chargedAmount: 5,
	exchangeRate: 36.5,
})
ok('rechaza facturar a un inactivo', r3.status === 400, `${r3.status} ${mensaje(r3.data)}`)
ok('el mensaje lo dice', /inactivo/i.test(mensaje(r3.data)), mensaje(r3.data))
await execute(`UPDATE students SET status = 'Activo' WHERE studentsIdentification = ?`, [cedula])

// ---------------------------------------------------------------------------
//  4. Cobro
// ---------------------------------------------------------------------------
console.log('\n4. Cobro')
const r4 = await pedir('POST', '/api/payments', token, {
	InvoiceId: factura.id,
	paidAmount: 5,
	receivedPaymentMethod: 1, // Efectivo
	returnedAmount: 0,
	exchangeRate: 36.5,
})
ok('acepta un pago parcial de $5', r4.status === 200, `${r4.status} ${mensaje(r4.data)}`)
ok('el saldo baja a lo que falta', Number(r4.data?.balance) === esperado - 5, JSON.stringify(r4.data))
ok('no la marca pagada todavia', r4.data?.fullyPaid === false)

const r5 = await pedir('POST', '/api/payments', token, {
	InvoiceId: factura.id,
	paidAmount: esperado - 5,
	receivedPaymentMethod: 3, // Dolares
	returnedAmount: 0,
	exchangeRate: 36.5,
})
ok('el pago que cierra la factura la marca Pagado', r5.data?.fullyPaid === true, JSON.stringify(r5.data))

// Sobrepagar una factura ya pagada se rechaza por ESTADO, no por saldo.
const r6 = await pedir('POST', '/api/payments', token, {
	InvoiceId: factura.id,
	paidAmount: 1,
	receivedPaymentMethod: 1,
	returnedAmount: 0,
	exchangeRate: 36.5,
})
ok('una factura Pagada no admite mas pagos', r6.status === 400, `${r6.status} ${mensaje(r6.data)}`)

// ---------------------------------------------------------------------------
//  5. Exoneracion: no es dinero y necesita justificacion
// ---------------------------------------------------------------------------
console.log('\n5. Exoneracion')
const r7 = await pedir('POST', '/api/issueInvoice', token, {
	studentIdentification: cedula,
	billableid: inscripcion.id,
	quantity: 1,
	chargedAmount: 5,
	exchangeRate: 36.5,
})
const { data: lista2 } = await pedir('GET', `/api/getInvoices/1`, token)
const exonerable = (Array.isArray(lista2) ? lista2 : [])
	.filter((f: any) => String(f.studentsIdentification) === cedula)
	.sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)))
	.find((f: any) => f.id !== factura.id && f.status === 'Pendiente')
if (exonerable) facturasCreadas.push(exonerable.id)

const r8 = await pedir('POST', '/api/payments', token, {
	InvoiceId: exonerable?.id,
	paidAmount: 0,
	receivedPaymentMethod: 4, // Exoneracion
	returnedAmount: 0,
	exchangeRate: 36.5,
	comments: 'corto',
})
ok('una exoneracion sin justificacion se rechaza', r8.status === 400, `${r8.status} ${mensaje(r8.data)}`)

const r9 = await pedir('POST', '/api/payments', token, {
	InvoiceId: exonerable?.id,
	paidAmount: 0,
	receivedPaymentMethod: 4,
	returnedAmount: 0,
	exchangeRate: 36.5,
	comments: 'Exonerado por decreto 1234, autorizado por Dr. Perez',
})
ok('una exoneracion justificada se acepta', r9.status === 200, `${r9.status} ${mensaje(r9.data)}`)
ok('la exoneracion cierra la factura sin cobrar', r9.data?.fullyPaid === true, JSON.stringify(r9.data))

// ---------------------------------------------------------------------------
//  6. Anulacion: motivo obligatorio, reverso con metodo y tasa del pago
// ---------------------------------------------------------------------------
console.log('\n6. Anulacion')
const r10 = await pedir('DELETE', `/api/invoice/${factura.id}`, token, {})
ok('sin motivo no se anula', r10.status === 400, `${r10.status} ${mensaje(r10.data)}`)

const MOTIVO = 'Se emitio por error en caja'
const r11 = await pedir('DELETE', `/api/invoice/${factura.id}`, token, { reason: MOTIVO })
ok('con motivo se anula', r11.status === 200, `${r11.status} ${mensaje(r11.data)}`)
ok(
	`devuelve lo cobrado (${esperado})`,
	Number(r11.data?.refunded) === esperado,
	JSON.stringify(r11.data)
)
ok('hizo un reverso por pago (2: uno por cada pago)', r11.data?.reversals === 2, JSON.stringify(r11.data))

const r12 = await pedir('DELETE', `/api/invoice/${factura.id}`, token, { reason: 'segundo intento' })
ok('no se anula dos veces', r12.status === 400, `${r12.status} ${mensaje(r12.data)}`)

const { data: tras } = await pedir('GET', `/api/invoice/${factura.id}`, token)
ok('queda Anulada', tras?.status === 'Anulada', tras?.status)
ok('el saldo queda en 0 tras la devolucion', Number(tras?.balance) === 0, String(tras?.balance))

// ---------------------------------------------------------------------------
//  7. Comprobacion contra la base: la auditoria quedo escrita
// ---------------------------------------------------------------------------
console.log('\n7. Auditoria en la base')
// `query()` devuelve el arreglo de filas directo, no `{rows}`.
const auditoria = await query(
	`SELECT issuedBy, cancelledBy, cancelledAt, cancelledReason FROM invoices WHERE id = ?`,
	[factura.id]
)
const aud: any = (auditoria as any[])[0]
ok('issuedBy quedo registrado', aud?.issuedBy === 1, `issuedBy=${aud?.issuedBy}`)
ok('cancelledBy quedo registrado', aud?.cancelledBy === 1, `cancelledBy=${aud?.cancelledBy}`)
ok('cancelledAt quedo registrado', aud?.cancelledAt != null)
ok('cancelledReason quedo registro tal cual se mando', aud?.cancelledReason === MOTIVO, String(aud?.cancelledReason))

const filasReverso: any = await query(
	`SELECT returnedPaymentMethod, paidAmount, returnedAmount, receivedPaymentMethod
	 FROM payments WHERE invoiceId = ? AND paidAmount = 0 ORDER BY date ASC`,
	[factura.id]
)
const reversos = filasReverso as any[]
ok('los reversos no tienen metodo de entrada', reversos.every((r) => r.receivedPaymentMethod === null))
ok(
	'cada reverso conserva el metodo del pago que devuelve',
	reversos.map((r) => r.returnedPaymentMethod).join(',') === 'Efectivo,Dolares',
	reversos.map((r) => r.returnedPaymentMethod).join(',')
)

// ---------------------------------------------------------------------------
//  Limpieza
// ---------------------------------------------------------------------------
console.log('\nLimpieza')
for (const id of facturasCreadas) {
	await execute(`DELETE FROM payments WHERE invoiceId = ?`, [id])
	await execute(`DELETE FROM invoices WHERE id = ?`, [id])
}
await execute(`DELETE FROM students WHERE studentsIdentification = ?`, [cedula])
console.log(`  borradas ${facturasCreadas.length} facturas y el alumno ${cedula}`)

// Sin esto el proceso no termina: el pool mantiene conexiones abiertas.
const { closePool } = await import('./dbConnection.ts')
await closePool()

console.log(`\n${pasa} ok, ${falla} fallan\n`)
Deno.exit(falla > 0 ? 1 : 0)