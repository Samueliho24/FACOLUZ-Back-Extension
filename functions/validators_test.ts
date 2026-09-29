// Pruebas de functions/validators.ts
// Ejecutar:  deno test -A functions/validators_test.ts
//
// Cubren las primitivas, las compuestas y el colector del paso 1 de la
// seccion 9.6 de Docs/GUIA-EXTENSION.md. Cada prueba corresponde a una regla
// de la tabla 9.1, para que un fallo apunte directo a la regla que se rompio.

import { assert, assertEquals, assertThrows } from '@std/assert'
import {
	MESSAGES,
	toISODate,
	isInEnum,
	isValidIdentification,
	isInteger,
	isEmail,
	escapeLike,
	isISODate,
	isValidDate,
	isFailure,
	isUuid,
	isInRange,
	failure,
	todayISO,
	instructionGradeIndex,
	isMaxLength,
	normalizeInstructionGrade,
	normalizePaymentMethod,
	isNotEmpty,
	newValidator,
	isBalanceAllowed,
	validateAmount,
	validateGrade,
	validatePage,
	validatePeriod,
	validateText,
	INSTRUCTION_GRADES,
	PAYMENT_METHODS,
	ROLES,
} from './validators.ts'

// --- isValidIdentification: students.studentsIdentification, teachers.identification ----

Deno.test('isValidIdentification acepta 6 a 8 digitos', () => {
	assert(isValidIdentification('123456'))
	assert(isValidIdentification('12345678'))
	assert(isValidIdentification(12345678))
})

Deno.test('isValidIdentification rechaza negativos, cero, decimales y texto', () => {
	assertEquals(isValidIdentification('12345'), false)
	assertEquals(isValidIdentification('123456789'), false)
	assertEquals(isValidIdentification(-12345678), false)
	assertEquals(isValidIdentification(0), false)
	assertEquals(isValidIdentification('12.5'), false)
	assertEquals(isValidIdentification('V1234567'), false)
	assertEquals(isValidIdentification('1234567 '), true, 'el trim debe aplicarse')
})

// --- isEmail: students.email, teachers.email -------------------------------

Deno.test('isEmail acepta y rechaza correctamente', () => {
	assert(isEmail('jjd@o.c'), 'la semilla usa el dominio o.c')
	assert(isEmail('nombre.apellido@correo.edu.ve'))
	assertEquals(isEmail('jjd@'), false)
	assertEquals(isEmail('sin arroba'), false)
	assertEquals(isEmail('a@b'), false, 'sin punto en el dominio')
	assertEquals(isEmail(`${'a'.repeat(100)}@o.c`), false, 'supera 100 caracteres')
})

// --- isUuid: params de las 16 rutas por id ----------------------------------

Deno.test('isUuid acepta UUID canonico y rechaza basura', () => {
	assert(isUuid('0c3db495-09d0-11f1-a6b1-106530499799'))
	assert(isUuid('0C3DB495-09D0-11F1-A6B1-106530499799'))
	assertEquals(isUuid('not-a-uuid'), false)
	assertEquals(isUuid('0c3db49509d011f1a6b1106530499799'), false, 'sin guiones')
	assertEquals(isUuid('0c3db495-09d0-11f1-a6b1-10653049979'), false, 'truncado')
	assertEquals(isUuid('0c3db495-09d0-11f1-a6b1-1065304997999'), false, 'un caracter de mas')
})

// --- isInRange / isInteger ---------------------------------------------------

Deno.test('isInRange respeta los limites', () => {
	assert(isInRange(5, 1, 10))
	assert(isInRange('5', 1, 10))
	assertEquals(isInRange(0, 1, 10), false)
	assertEquals(isInRange(11, 1, 10), false)
	assertEquals(isInRange('abc', 1, 10), false)
	assertEquals(isInRange(Infinity, 1, 10), false)
	assertEquals(isInRange(NaN, 1, 10), false)
})

Deno.test('isInteger rechaza decimales y no numeros', () => {
	assert(isInteger(10))
	assert(isIntegerBetween(10, 1, 20))
	assertEquals(isInteger(10.5, 1, 20), false)
	assertEquals(isInteger('', 1, 20), false)
	assertEquals(isInteger(null, 1, 20), false)
	assertEquals(isInteger(true, 1, 20), false, 'true no es un numero')
	assertEquals(isInteger('10abc', 1, 20), false)
})

function isIntegerBetween(v: unknown, min: number, max: number) {
	return isInteger(v, min, max)
}

// --- isInEnum / isNotEmpty / isMaxLength --------------------------------------

Deno.test('isInEnum y las listas de dominio', () => {
	assert(isInEnum('Efectivo', PAYMENT_METHODS))
	assertEquals(isInEnum('Bitcoin', PAYMENT_METHODS), false)
	assert(isInEnum(100, ROLES))
	assertEquals(isInEnum(5, ROLES), false, 'el rol 5 no existe en userTypeList')
	assert(isInEnum('Bachillerato', INSTRUCTION_GRADES))
})

Deno.test('isNotEmpty y isMaxLength ignoran espacios', () => {
	assert(isNotEmpty('  hola  '))
	assertEquals(isNotEmpty('    '), false)
	assertEquals(isNotEmpty(undefined), false)
	assert(isMaxLength('12345678901234567890', 20))
	assertEquals(isMaxLength('123456789012345678901', 20), false)
})

// --- Fechas ---------------------------------------------------------------

Deno.test('isISODate exige AAAA-MM-DD', () => {
	assert(isISODate('2026-02-14'))
	assertEquals(isISODate('2026-2-14'), false)
	assertEquals(isISODate('14/02/2026'), false)
})

Deno.test('isValidDate rechaza fechas imposibles', () => {
	assert(isValidDate('2026-02-14'))
	assert(isValidDate(new Date(2026, 1, 14)))
	assertEquals(isValidDate('2025-02-31'), false, '31 de febrero no existe')
	assertEquals(isValidDate('2026-13-01'), false, 'mes 13')
	assertEquals(isValidDate('no-es-fecha'), false)
	assertEquals(isValidDate(''), false)
})

Deno.test('toISODate hace zero-padding', () => {
	assertEquals(toISODate(new Date(2026, 1, 4)), '2026-02-04')
	assertEquals(toISODate('2026-02-14'), '2026-02-14')
	assertEquals(toISODate('basura'), '')
})

Deno.test('todayISO devuelve hoy con padding', () => {
	assert(/^\d{4}-\d{2}-\d{2}$/.test(todayISO()))
})

// --- validatePage: las 9 rutas paginadas ---------------------------------

Deno.test('validatePage acepta 1 y corrige 0 y negativos', () => {
	assertEquals(validatePage('1'), 1)
	assertEquals(validatePage(3), 3)
	assertEquals(validatePage(0), 1, '0 debe cair a la primera pagina')
	assertEquals(validatePage(-10), 1)
})

Deno.test('validatePage lanza con no numeros', () => {
	assertThrows(() => validatePage('abc'))
	assertThrows(() => validatePage(''))
	assertThrows(() => validatePage('1.5'))
	assertThrows(() => validatePage(NaN))
})

// --- validateAmount: facturas y pagos ---------------------------------------

Deno.test('validateAmount acepta montos validos', () => {
	assertEquals(validateAmount(5), 5)
	assertEquals(validateAmount('12.50'), 12.5)
	assertEquals(validateAmount(0.01), 0.01)
	assertEquals(validateAmount(10.005), 10.01, 'redondea a 2 decimales')
})

Deno.test('validateAmount rechaza 0, negativos, NaN e Infinity', () => {
	assertThrows(() => validateAmount(0), '0 hace la factura nascida Pagada')
	assertThrows(() => validateAmount(-50))
	assertThrows(() => validateAmount('Infinity'))
	assertThrows(() => validateAmount('NaN'))
	assertThrows(() => validateAmount(''))
	assertThrows(() => validateAmount('abc'))
	assertThrows(() => validateAmount(1e9), 'supera AMOUNT_MAX')
})

Deno.test('validateAmount redondea a 2 decimales en vez de rechazar', () => {
	assertEquals(validateAmount(10.005), 10.01, 'el resto del codigo ya hace .toFixed(2)')
	assertEquals(validateAmount(10.004), 10.0)
})

// --- validateText --------------------------------------------------------

Deno.test('validateText recorta y colapsa espacios', () => {
	assertEquals(validateText('  Juan   Perez  '), 'Juan Perez')
	assertEquals(validateText('Ana', { min: 1, max: 20 }), 'Ana')
})

Deno.test('validateText aplica min y max', () => {
	assertThrows(() => validateText('   '), 'solo espacios')
	assertThrows(() => validateText('   '), 'no cumple min 1')
	assertThrows(() => validateText('a'.repeat(21), { max: 20 }), 'supera varchar(20)')
	assertThrows(() => validateText(123), 'no es string')
})

// --- validatePeriod: periods.startDate / endDate -------------------------

Deno.test('validatePeriod exige fin > inicio', () => {
	assertEquals(validatePeriod({ startDate: '2026-01-01', endDate: '2026-06-30' }), {
		start: '2026-01-01',
		end: '2026-06-30',
	})
})

Deno.test('validatePeriod rechaza fin <= inicio', () => {
	assertThrows(() => validatePeriod({ startDate: '2026-06-30', endDate: '2026-01-01' }))
	assertThrows(() => validatePeriod({ startDate: '2026-06-30', endDate: '2026-06-30' }), 'un periodo de 0 dias')
	assertThrows(() => validatePeriod({ startDate: 'basura', endDate: '2026-01-01' }))
})

// --- validateGrade: enrollments_grade.score ---------------------------------

Deno.test('validateGrade acepta enteros de 1 a 20', () => {
	assertEquals(validateGrade(10), 10)
	assertEquals(validateGrade('20'), 20)
	assertEquals(validateGrade('1'), 1)
})

Deno.test('validateGrade convierte SI y vacio en NULL', () => {
	assertEquals(validateGrade('SI'), null, 'SI es el centinela de sin nota')
	assertEquals(validateGrade('si'), null)
	assertEquals(validateGrade(''), null)
	assertEquals(validateGrade(null), null)
})

Deno.test('validateGrade rechaza fuera de rango', () => {
	assertThrows(() => validateGrade(0))
	assertThrows(() => validateGrade(21))
	assertThrows(() => validateGrade(10.5))
	assertThrows(() => validateGrade('NaN'))
	assertThrows(() => validateGrade('A'))
})

// --- fallo / isFailure -----------------------------------------------------

Deno.test('failure produce el body que consume el frontend', () => {
	assertEquals(failure('name', 'El nombre es obligatorio'), {
		error: 'Validation',
		field: 'name',
		message: 'El nombre es obligatorio',
	})
	assert(isFailure(failure('x', 'y')))
	assertEquals(isFailure({ error: 'Otro' }), false)
	assertEquals(isFailure(null), false)
	assertEquals(isFailure('texto'), false)
})

// --- newValidator (colector) -------------------------------------------

Deno.test('newValidator devuelve null cuando todo pasa', () => {
	const v = newValidator()
	v.text('name', '  Juan  Perez ', 'Nombre', { max: 20 })
	v.identification('identification', '12345678', 'La cedula')
	v.email('email', 'jjd@o.c')
	assertEquals(v.firstError(), null)
	assertEquals(v.cleaned().name, 'Juan Perez')
	assertEquals(v.cleaned().email, 'jjd@o.c')
})

Deno.test('newValidator acumula el primer error por campo', () => {
	const v = newValidator()
	v.identification('identification', '123', 'La cedula')
	v.identification('identification', '456', 'La cedula')
	const err = v.firstError()
	assertEquals(err?.field, 'identification')
	assertEquals(err?.message, MESSAGES.identification)
})

Deno.test('newValidator: texto con max mayor a varchar(20)', () => {
	const v = newValidator()
	v.text('name', 'x'.repeat(30), 'Nombre', { max: 20 })
	assertEquals(v.firstError()?.message, 'Nombre no puede superar 20 caracteres')
})

Deno.test('newValidator: enum, entero y nota', () => {
	const v = newValidator()
	v.enum('type', 5, 'El tipo de usuario', ROLES)
	assertEquals(v.firstError()?.message, 'El tipo de usuario tiene un valor no permitido')

	const v2 = newValidator()
	v2.integer('quota', 0, 'El cupo', 1, 99)
	assertEquals(v2.firstError()?.message, 'El cupo debe estar entre 1 y 99')

	const v3 = newValidator()
	v3.grade('score', 25)
	assertEquals(v3.firstError()?.message, 'La calificacion debe ser un numero entre 1 y 20, o SI')
})

Deno.test('newValidator: fecha no futura', () => {
	const v = newValidator()
	v.date('birthDate', '2099-01-01', 'La fecha de nacimiento', { noFuture: true })
	assertEquals(v.firstError()?.message, 'La fecha de nacimiento no puede ser una fecha futura')

	const v2 = newValidator()
	v2.date('birthDate', '1990-05-04', 'La fecha de nacimiento', { noFuture: true })
	assertEquals(v2.firstError(), null)
	assertEquals(v2.cleaned().birthDate, '1990-05-04')
})

Deno.test('newValidator: listas y duplicados', () => {
	const v = newValidator()
	v.nonEmptyList('teachers', 'no-es-array', 'Los docentes')
	assertEquals(v.firstError()?.message, 'Los docentes debe ser una lista')

	const v2 = newValidator()
	v2.noDuplicates('teachers', ['a', 'b', 'a'], 'Los docentes')
	assertEquals(v2.firstError()?.message, 'Los docentes no puede tener elementos repetidos')
})

// --- Enums: instruccionGrade y metodos de pago ---------------------------

Deno.test('normalizeInstructionGrade traduce el indice del Select', () => {
	assertEquals(normalizeInstructionGrade(1), 'Ninguno')
	assertEquals(normalizeInstructionGrade(2), 'Bachillerato')
	assertEquals(normalizeInstructionGrade(3), 'Universitario')
	assertEquals(normalizeInstructionGrade(4), 'Postgrado')
	assertEquals(normalizeInstructionGrade('Universitario'), 'Universitario', 'ya texto')
	assertEquals(instructionGradeIndex('Postgrado'), 4, 'vuelta para lecturas')
})

Deno.test('normalizeInstructionGrade rechaza lo que no esta en la lista', () => {
	assertThrows(() => normalizeInstructionGrade(0))
	assertThrows(() => normalizeInstructionGrade(5))
	assertThrows(() => normalizeInstructionGrade('Licenciado'))
	assertThrows(() => normalizeInstructionGrade(null))
})

Deno.test('normalizePaymentMethod acepta nombre del ENUM y valor del Select', () => {
	assertEquals(normalizePaymentMethod('Transferencia'), 'Transferencia')
	assertEquals(normalizePaymentMethod(1), 'Efectivo')
	assertEquals(normalizePaymentMethod(2), 'Transferencia')
	assertEquals(normalizePaymentMethod(3), 'Dolares')
	assertEquals(normalizePaymentMethod(4), 'Exoneracion')
	assertEquals(normalizePaymentMethod('Exoneración'), 'Exoneracion', 'con acento a nombre del ENUM sin acento')
})

Deno.test('normalizePaymentMethod rechaza lo que no existe', () => {
	assertThrows(() => normalizePaymentMethod('Bitcoin'))
	assertThrows(() => normalizePaymentMethod(0))
	assertThrows(() => normalizePaymentMethod(undefined))
})

// --- isBalanceAllowed: payments.returnedAmount ------------------------------

Deno.test('isBalanceAllowed tolera 1 centimo de redondeo', () => {
	assert(isBalanceAllowed(100, 100))
	assert(isBalanceAllowed(100.01, 100), 'tolerancia de redondeo en float')
	assertEquals(isBalanceAllowed(100.02, 100), false)
	assertEquals(isBalanceAllowed(-0.01, 100), true, 'devolucion dentro de rango')
})

// --- escapeLike: los cuatro filtros /api/filter* -------------------------

Deno.test('escapeLike neutraliza los comodines de LIKE', () => {
	// Sin esto, GET /api/filterStudents/% devolvia todos los alumnos.
	assertEquals(escapeLike('%'), '\\%')
	assertEquals(escapeLike('_'), '\\_')
	// La barra invertida va primero: si se escapara despues, un `\%` del
	// usuario terminaria en `\\%`, que LIKE lee como backslash + comodin.
	assertEquals(escapeLike('\\%'), '\\\\\\%')
	assertEquals(escapeLike('100%'), '100\\%')
	assertEquals(escapeLike('a_b'), 'a\\_b')
})

Deno.test('escapeLike no toca el texto normal', () => {
	assertEquals(escapeLike('Juan'), 'Juan')
	assertEquals(escapeLike('Pérez'), 'Pérez')
	assertEquals(escapeLike('  '), '  ')
	assertEquals(escapeLike(''), '')
	assertEquals(escapeLike(undefined), '')
	assertEquals(escapeLike(null), '')
})
