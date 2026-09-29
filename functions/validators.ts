export const MESSAGES = {
	required: (field: string) => `${field} es obligatorio`,
	textTooShort: (field: string, min: number) => `${field} debe tener al menos ${min} caracter${min === 1 ? '' : 'es'}`,
	textTooLong: (field: string, max: number) => `${field} no puede superar ${max} caracteres`,
	textOutOfRange: (field: string, min: number, max: number) => `${field} debe tener entre ${min} y ${max} caracteres`,
	identification: 'La cedula debe tener entre 6 y 8 digitos, sin letras ni signos',
	email: 'El correo electronico no tiene un formato valido',
	emailTooLong: 'El correo electronico no puede superar 100 caracteres',
	uuid: 'El identificador no tiene un formato valido',
	integer: (field: string) => `${field} debe ser un numero entero`,
	integerOutOfRange: (field: string, min: number, max: number) => `${field} debe estar entre ${min} y ${max}`,
	outOfRange: (field: string, min: number, max: number) => `${field} debe estar entre ${min} y ${max}`,
	enum: (field: string) => `${field} tiene un valor no permitido`,
	amount: (field: string) => `${field} debe ser un monto mayor a 0`,
	amountTooHigh: (field: string, max: number) => `${field} no puede superar ${max}`,
	decimals: (field: string) => `${field} admite maximo 2 decimales`,
	invalidDate: (field: string) => `${field} no es una fecha valida`,
	isoDate: (field: string) => `${field} debe tener el formato AAAA-MM-DD`,
	futureDate: (field: string) => `${field} no puede ser una fecha futura`,
	period: 'La fecha de fin debe ser posterior a la fecha de inicio',
	periodStart: 'La fecha de inicio no puede ser anterior a hoy',
	page: 'El numero de pagina debe ser un entero mayor o igual a 1',
	grade: 'La calificacion debe ser un numero entre 1 y 20, o SI',
	duplicate: (what: string) => `Ya existe ${what}`,
	nonexistent: (what: string) => `${what} no existe`,
	inactive: (what: string) => `${what} esta inactivo`,
	arrayRequired: (field: string) => `${field} debe ser una lista`,
	duplicatesInList: (field: string) => `${field} no puede tener elementos repetidos`,
	reference: 'La referencia es obligatoria para pagos por transferencia',
	exceedsBalance: 'El monto a pagar no puede superar el saldo de la factura',
	refundAmount: 'El monto de devolucion debe estar entre 0 y el monto pagado',
	invoiceCancelled: 'No se puede operar sobre una factura anulada',
	refundMethod: 'El metodo de devolucion es obligatorio si hay monto a devolver',
	notFound: (what: string) => `No se encontro ${what}`,
} as const

// ---------------------------------------------------------------------------
//  Constantes de dominio, derivadas de dbscript.sql
//
//  Los valores si van en espanol: son los literales que guardan las columnas
//  ENUM. Cambiarlos exigiria migrar la base.
// ---------------------------------------------------------------------------

export const INSTRUCTION_GRADES = ['Ninguno', 'Bachillerato', 'Universitario', 'Postgrado']
export const MODALITIES = ['Intensivo', 'Sabatino']
export const ENROLLMENT_TYPES = ['Regular', 'Repitiente']
export const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Dolares', 'Exoneracion']
export const MODULE_STATUSES = ['Activo', 'Inactivo']
export const TEACHER_STATUSES = ['Activo', 'Inactivo']
export const EVALUATIONS = ['Simple', 'Promedio']

// users.type - ver src/context/lists.js (userTypeList) en el frontend
export const ROLES = [0, 1, 2, 3, 4, 100]

// "SI" significa "sin nota": la columna enrollments_grade.score es nullable,
// asi que el centinela en la base de datos es NULL, nunca NaN.
export const NO_GRADE_MARK = 'SI'

export const ID_MIN = 6
export const ID_MAX = 8
export const ID_MAX_NUMBER = 99999999
export const PHONE_MIN = 6
export const PHONE_MAX = 11
export const NAME_MAX = 20
export const EMAIL_MAX = 100
export const REFERENCE_MAX = 20
export const GRADE_MIN = 1
export const GRADE_MAX = 20
export const WEIGHT_MIN = 1
export const WEIGHT_MAX = 100
export const QUOTA_MIN = 1
export const QUOTA_MAX = 99
export const QUANTITY_MIN = 1
export const QUANTITY_MAX = 1000000
export const YEAR_MIN = 2020
export const YEAR_MAX = 2100
export const TERM_MIN = 1
export const TERM_MAX = 3
export const AMOUNT_MIN = 0.01
export const AMOUNT_MAX = 100000000

// ---------------------------------------------------------------------------
//  Formato de respuesta de error
// ---------------------------------------------------------------------------

export interface Failure {
	error: 'Validation'
	field: string
	message: string
}

/** Body de error que devuelve un 400. El frontend muestra `message` en el toast. */
export function failure(field: string, message: string): Failure {
	return { error: 'Validation', field, message }
}

/** true si el valor es un body de error generado por este modulo. */
export function isFailure(v: unknown): v is Failure {
	return !!v && typeof v === 'object' && (v as Failure).error === 'Validation'
}

// ---------------------------------------------------------------------------
//  Primitivas
// ---------------------------------------------------------------------------

/** Cedula venezolana: 6 a 8 digitos, sin letras, signos ni negativos. */
export function isValidIdentification(v: unknown): boolean {
	if (typeof v === 'number') return Number.isInteger(v) && v > 0 && String(v).length >= ID_MIN && String(v).length <= ID_MAX
	return typeof v === 'string' && new RegExp(`^\\d{${ID_MIN},${ID_MAX}}$`).test(v.trim())
}

// El TLD acepta 1 o mas letras a proposito: la semilla de dbscript.sql ya
// trae usuarios con dominio "o.c" y un TLD de 2 letras los dejaria fuera.
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[A-Za-z]+$/

export function isEmail(v: unknown): boolean {
	return typeof v === 'string' && v.length <= EMAIL_MAX && RE_EMAIL.test(v.trim())
}

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(v: unknown): boolean {
	return typeof v === 'string' && RE_UUID.test(v.trim())
}

export function isInRange(v: unknown, min: number, max: number): boolean {
	const n = typeof v === 'number' ? v : Number(v)
	return typeof v !== 'boolean' && v !== '' && v !== null && Number.isFinite(n) && n >= min && n <= max
}

export function isInteger(v: unknown, min?: number, max?: number): boolean {
	const n = typeof v === 'number' ? v : Number(v)
	if (typeof v === 'boolean' || v === '' || v === null || v === undefined) return false
	if (!Number.isFinite(n) || !Number.isInteger(n)) return false
	if (min !== undefined && n < min) return false
	if (max !== undefined && n > max) return false
	return true
}

export function isInEnum<T>(v: unknown, values: readonly T[]): boolean {
	return values.includes(v as T)
}

export function isMaxLength(v: unknown, limit: number): boolean {
	return typeof v === 'string' && v.trim().length <= limit
}

export function isNotEmpty(v: unknown): boolean {
	return typeof v === 'string' && v.trim().length > 0
}

/** Acepta Date, `YYYY-MM-DD` o `YYYY-MM-DDTHH:mm:ss`. Rechaza fechas imposibles. */
export function isValidDate(v: unknown): boolean {
	if (v instanceof Date) return !Number.isNaN(v.getTime())
	if (typeof v === 'number') return Number.isFinite(v)
	if (typeof v !== 'string' || v.trim() === '') return false
	const s = v.trim()
	if (isISODate(s)) {
		// Rechaza 2025-02-31: Date lo normaliza a marzo en vez de fallar
		const [y, m, d] = s.split('-').map(Number)
		const dt = new Date(Date.UTC(y, m - 1, d))
		return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
	}
	return !Number.isNaN(new Date(s).getTime())
}

export function isISODate(v: unknown): boolean {
	return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.trim())
}

// ---------------------------------------------------------------------------
//  Compuestas
// ---------------------------------------------------------------------------

/**
 * Normaliza a `YYYY-MM-DD` con zero-padding.
 *
 * El codigo anterior armaba la fecha a mano y producia `2026-2-4`, que
 * MariaDB guarda como texto y no como date.
 *
 * Cuidado con la zona horaria: `new Date('2026-02-14')` se interpreta como
 * UTC midnight, y con el UTC-3 de Venezuela `getDate()` devuelve 13. Por eso
 * una cadena ISO se devuelve tal cual, sin pasar por Date.
 */
export function toISODate(v: unknown): string {
	if (v instanceof Date) {
		if (Number.isNaN(v.getTime())) return ''
		const month = String(v.getMonth() + 1).padStart(2, '0')
		const day = String(v.getDate()).padStart(2, '0')
		return `${v.getFullYear()}-${month}-${day}`
	}
	if (typeof v === 'string') {
		const s = v.trim()
		// `YYYY-MM-DD` o `YYYY-MM-DDTHH:mm:ss`: se devuelve literal
		const m = /^(\d{4}-\d{2}-\d{2})(?:[T ]|$)/.exec(s)
		if (m) return m[1]
		return toISODate(new Date(s))
	}
	if (typeof v === 'number') return toISODate(new Date(v))
	return ''
}

/** Devuelve la fecha de hoy en `YYYY-MM-DD`, en hora local. */
export function todayISO(): string {
	return toISODate(new Date())
}

/** El campo `page` de las rutas paginadas. 0 y negativos se corrigen a 1. */
export function validatePage(v: unknown): number {
	if (typeof v === 'boolean' || v === '' || v === null || v === undefined) {
		throw failure('page', MESSAGES.page)
	}
	const n = typeof v === 'number' ? v : Number(v)
	if (!Number.isFinite(n) || !Number.isInteger(n)) {
		throw failure('page', MESSAGES.page)
	}
	return Math.max(1, n)
}

/**
 * Monto de dinero: finito y dentro del rango.
 *
 * Los decimales de mas se redondean en vez de rechazarse: el resto de la
 * aplicacion ya hace `.toFixed(2)`, y rechazar el pago porque el usuario
 * escribio 10.005 seria una regresion de usabilidad sin ganancia real.
 */
export function validateAmount(v: unknown, options: { min?: number; max?: number } = {}): number {
	const min = options.min ?? AMOUNT_MIN
	const max = options.max ?? AMOUNT_MAX
	if (typeof v === 'boolean' || v === '' || v === null || v === undefined) {
		throw failure('amount', MESSAGES.amount('El monto'))
	}
	const n = typeof v === 'number' ? v : Number(v)
	if (!Number.isFinite(n)) throw failure('amount', MESSAGES.amount('El monto'))
	if (n < min) throw failure('amount', MESSAGES.amount('El monto'))
	if (n > max) throw failure('amount', MESSAGES.amountTooHigh('El monto', max))
	return Math.round(n * 100) / 100
}

/** Texto: recorta, colapsa espacios internos y vuelve a recortar. */
export function validateText(v: unknown, options: { min?: number; max?: number } = {}): string {
	const min = options.min ?? 1
	const max = options.max ?? NAME_MAX
	if (typeof v !== 'string') throw failure('text', MESSAGES.required('El texto'))
	const clean = v.replace(/\s+/g, ' ').trim()
	if (clean.length < min) throw failure('text', min === 1 ? MESSAGES.required('El texto') : MESSAGES.textTooShort('El texto', min))
	if (clean.length > max) throw failure('text', MESSAGES.textTooLong('El texto', max))
	return clean
}

/** Exige que el periodo tenga fin > inicio. Devuelve ambas en ISO. */
export function validatePeriod(v: { startDate?: unknown; endDate?: unknown }): { start: string; end: string } {
	const start = toISODate(v.startDate)
	const end = toISODate(v.endDate)
	if (!start) throw failure('startDate', MESSAGES.invalidDate('La fecha de inicio'))
	if (!end) throw failure('endDate', MESSAGES.invalidDate('La fecha de fin'))
	if (end <= start) throw failure('endDate', MESSAGES.period)
	return { start, end }
}

/**
 * Calificacion: entero de 1 a 20, o "SI" (sin nota) que se guarda como NULL.
 * Devuelve number | null.
 */
export function validateGrade(v: unknown): number | null {
	if (v === null || v === undefined) return null
	if (typeof v === 'string') {
		const s = v.trim()
		if (s === '' || s.toUpperCase() === NO_GRADE_MARK) return null
	}
	const n = typeof v === 'number' ? v : Number(v)
	if (typeof v === 'boolean' || !Number.isFinite(n) || !Number.isInteger(n) || n < GRADE_MIN || n > GRADE_MAX) {
		throw failure('score', MESSAGES.grade)
	}
	return n
}

/**
 * Escapa los comodines de LIKE para que un filtro no se convierta en comodin.
 *
 * Sin esto `GET /api/filterStudents/%` devuelve todos los alumnos con sus
 * datos personales, y `/api/filterStudents/_` tambien. Hay que pasar el
 * resultado como `LIKE ? ESCAPE '\\'`.
 */
export function escapeLike(v: unknown): string {
	return String(v ?? '')
		.replace(/\\/g, '\\\\')
		.replace(/%/g, '\\%')
		.replace(/_/g, '\\_')
}

// ---------------------------------------------------------------------------
//  Colector: ergonomicidad al validar un body completo dentro de un handler
// ---------------------------------------------------------------------------
//
//  const v = newValidator()
//  v.text('name', body.name, 'Nombre', { max: 20 })
//  v.identification('identification', body.identification, 'La cedula')
//  const err = v.firstError()
//  if (err) return res.status(400).send(err)
//
//  Cada metodo devuelve `this` para encadenar, y no lanza: acumula el primer
//  error por campo y deja seguir. `firstError()` devuelve el primer error o null.

type TextOptions = { min?: number; max?: number }

export interface Validator {
	required(field: string, value: unknown, label?: string): Validator
	text(field: string, value: unknown, label?: string, options?: TextOptions): Validator
	identification(field: string, value: unknown, label?: string): Validator
	email(field: string, value: unknown, label?: string): Validator
	uuid(field: string, value: unknown, label?: string): Validator
	integer(field: string, value: unknown, label?: string, min?: number, max?: number): Validator
	number(field: string, value: unknown, label?: string, min?: number, max?: number): Validator
	enum(field: string, value: unknown, label?: string, values?: readonly unknown[]): Validator
	date(field: string, value: unknown, label?: string, options?: { noFuture?: boolean }): Validator
	amount(field: string, value: unknown, label?: string, options?: { min?: number; max?: number }): Validator
	grade(field: string, value: unknown, label?: string): Validator
	longText(field: string, value: unknown, label?: string, max?: number): Validator
	nonEmptyList(field: string, value: unknown, label?: string, max?: number): Validator
	noDuplicates(field: string, value: unknown, label?: string): Validator
	add(error: Failure): Validator
	/** Primer error acumulado, o null si todo paso. */
	firstError(): Failure | null
	/**
	 * Valores ya normalizados, listos para pasar a la capa de datos.
	 *
	 * `any` y no `unknown` a proposito: el mapa es heterogeneo (cadenas,
	 * numeros, fechas) y el destino final es una consulta SQL parametrizada,
	 * que ya no necesita que TypeScript narrowing por clave. Anadir un
	 * tipado estricto aqui solo obligaria a castear en cada ruta.
	 */
	cleaned(): Record<string, any>
}

export function newValidator(): Validator {
	const errors: Failure[] = []
	const seen = new Set<string>()
	const cleanedValues: Record<string, any> = {}

	function register(field: string, label: string, test: () => unknown, originalValue: unknown) {
		if (seen.has(field)) return
		try {
			cleanedValues[field] = test()
		} catch (err) {
			seen.add(field)
			errors.push(isFailure(err) ? failure(field, err.message) : failure(field, `Revise ${label.toLowerCase()}`))
		}
		if (!(field in cleanedValues)) cleanedValues[field] = originalValue
	}

	const v: Validator = {
		required(field, value, label = field) {
			register(field, label, () => {
				if (!isNotEmpty(value) && (typeof value !== 'number' || Number.isNaN(value))) {
					throw failure(field, MESSAGES.required(label))
				}
				return value
			}, value)
			return v
		},
		text(field, value, label = field, options = {}) {
			register(field, label, () => {
				const min = options.min ?? 1
				const max = options.max ?? NAME_MAX
				if (typeof value !== 'string') throw failure(field, MESSAGES.required(label))
				const clean = value.replace(/\s+/g, ' ').trim()
				if (clean.length < min) {
					throw failure(field, min === 1 ? MESSAGES.required(label) : MESSAGES.textTooShort(label, min))
				}
				if (clean.length > max) throw failure(field, MESSAGES.textTooLong(label, max))
				return clean
			}, value)
			return v
		},
		identification(field, value, label = 'La cedula') {
			register(field, label, () => {
				if (!isValidIdentification(value)) throw failure(field, MESSAGES.identification)
				return typeof value === 'number' ? value : Number(String(value).trim())
			}, value)
			return v
		},
		email(field, value, label = 'El correo') {
			register(field, label, () => {
				if (typeof value !== 'string' || !RE_EMAIL.test(value.trim())) throw failure(field, MESSAGES.email)
				if (value.trim().length > EMAIL_MAX) throw failure(field, MESSAGES.emailTooLong)
				return value.trim().toLowerCase()
			}, value)
			return v
		},
		uuid(field, value, label = 'El identificador') {
			register(field, label, () => {
				if (!isUuid(value)) throw failure(field, MESSAGES.uuid)
				return String(value).trim()
			}, value)
			return v
		},
		integer(field, value, label = field, min?: number, max?: number) {
			register(field, label, () => {
				if (value === undefined || value === null || value === '') throw failure(field, MESSAGES.required(label))
				if (!isInteger(value, min, max)) {
					const hasRange = min !== undefined && max !== undefined
					throw failure(field, hasRange ? MESSAGES.integerOutOfRange(label, min, max) : MESSAGES.integer(label))
				}
				return Number(value)
			}, value)
			return v
		},
		number(field, value, label = field, min?: number, max?: number) {
			register(field, label, () => {
				if (value === undefined || value === null || value === '') throw failure(field, MESSAGES.required(label))
				if (!isInRange(value, min ?? -Infinity, max ?? Infinity)) {
					const hasRange = min !== undefined && max !== undefined
					throw failure(field, hasRange ? MESSAGES.outOfRange(label, min, max) : MESSAGES.integer(label))
				}
				return Number(value)
			}, value)
			return v
		},
		enum(field, value, label = field, values?: readonly unknown[]) {
			register(field, label, () => {
				const list = values ?? []
				if (!isInEnum(value, list)) throw failure(field, MESSAGES.enum(label))
				return value
			}, value)
			return v
		},
		date(field, value, label = 'La fecha', options = {}) {
			register(field, label, () => {
				if (!isValidDate(value)) throw failure(field, MESSAGES.invalidDate(label))
				const iso = toISODate(value)
				if (options.noFuture && iso > todayISO()) throw failure(field, MESSAGES.futureDate(label))
				return iso
			}, value)
			return v
		},
		amount(field, value, label = 'El monto', options = {}) {
			register(field, label, () => validateAmount(value, options), value)
			return v
		},
		grade(field, value, label = 'La calificacion') {
			register(field, label, () => validateGrade(value), value)
			return v
		},
		longText(field, value, label = field, max = REFERENCE_MAX) {
			register(field, label, () => {
				if (value === undefined || value === null || value === '') return ''
				if (typeof value !== 'string') throw failure(field, MESSAGES.required(label))
				const clean = value.replace(/\s+/g, ' ').trim()
				if (clean.length > max) throw failure(field, MESSAGES.textTooLong(label, max))
				return clean
			}, value)
			return v
		},
		nonEmptyList(field, value, label = 'La lista') {
			register(field, label, () => {
				if (!Array.isArray(value)) throw failure(field, MESSAGES.arrayRequired(label))
				return value
			}, value)
			return v
		},
		noDuplicates(field, value, label = 'La lista') {
			register(field, label, () => {
				if (!Array.isArray(value)) return value
				const unique = new Set(value.map((x) => String(x)))
				if (unique.size !== value.length) throw failure(field, MESSAGES.duplicatesInList(label))
				return value
			}, value)
			return v
		},
		add(error) {
			if (!seen.has(error.field)) {
				seen.add(error.field)
				errors.push(error)
			}
			return v
		},
		firstError() {
			return errors.length > 0 ? errors[0] : null
		},
		cleaned() {
			return cleanedValues
		},
	}

	return v
}

// ---------------------------------------------------------------------------
//  Reglas de negocio reutilizables
// ---------------------------------------------------------------------------

/** Normaliza el metodo de pago: acepta el nombre del ENUM o el valor del <Select>. */
export function normalizePaymentMethod(v: unknown): string {
	const byName: Record<string, string> = {
		'Efectivo': 'Efectivo',
		'Transferencia': 'Transferencia',
		'Dolares': 'Dolares',
		'Exoneracion': 'Exoneracion',
		'Exoneración': 'Exoneracion',
		'1': 'Efectivo',
		'2': 'Transferencia',
		'3': 'Dolares',
		'4': 'Exoneracion',
	}
	const key = typeof v === 'string' ? v.trim() : String(v)
	const result = byName[key]
	if (!result) throw failure('paymentMethod', MESSAGES.enum('El metodo de pago'))
	return result
}

/**
 * InstructionGrade viaja como 1..4 desde el <Select> y se guarda como texto en
 * el ENUM. Sin esta traduccion el INSERT falla con "Data truncated".
 */
export function normalizeInstructionGrade(v: unknown): string {
	const byIndex: Record<string, string> = {
		'1': 'Ninguno',
		'2': 'Bachillerato',
		'3': 'Universitario',
		'4': 'Postgrado',
	}
	if (typeof v === 'string' && INSTRUCTION_GRADES.includes(v)) return v
	const key = String(v)
	const result = byIndex[key]
	if (!result) throw failure('instructionGrade', MESSAGES.enum('El nivel de instruccion'))
	return result
}

/** El indice del ENUM, util para las lecturas que lo necesitan como numero. */
export function instructionGradeIndex(v: unknown): number {
	const text = normalizeInstructionGrade(v)
	return INSTRUCTION_GRADES.indexOf(text) + 1
}

/**
 * El saldo de una factura nunca puede quedar negativo.
 * Se permite una tolerancia de 1 centavo por el redondeo de los float.
 */
export function isBalanceAllowed(paid: number, total: number): boolean {
	return paid <= total + 0.01
}
