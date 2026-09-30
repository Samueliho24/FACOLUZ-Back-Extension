import { failure } from './validators.ts'

// ---------------------------------------------------------------------------
//  Tasa de cambio del dia
// ---------------------------------------------------------------------------
//
//  ANTES, este archivo pegaba a `/v1/euros/oficial` y devolvia `dolar.promedio`.
//  Tres problemas:
//
//  1. La ruta es de EUROS. `ve.dolarapi.com` responde 404 en esa ruta, asi que
//     `getDolarPrice()` devolvia `undefined` y ese `undefined` terminaba en la
//     columna `invoices.exchangeRate` (float). El frontend, en cambio, si pide
//     `/v1/dolares/oficial`: los dos leian tasas distintas, y solo una era la
//     del dolar. La del back estaba rota y no se notaba porque casi nadie la
//     miraba: solo la usaba `cancelInvoice`.
//
//  2. No manejaba el fallo. Si la API externa caia, la peticion entera reventaba
//     con el error crudo de `fetch` y el usuario veia un 500.
//
//  3. No distinguia "tasa 0" de "tasa valida". Con 0, cualquier conversion
//     Bs<->$ da Infinity o NaN contra una columna float NOT NULL.
//
//  Ahora `getDolarPrice()` es a prueba de fallos (nunca lanza) y la politica de
//  que hacer cuando la API no responde vive en `resolveExchangeRate`.
// ---------------------------------------------------------------------------

const DOLAR_API = 'https://ve.dolarapi.com/v1/dolares/oficial'

/**
 * Tasa de dolar oficial de hoy. Devuelve 0 si la API no esta disponible.
 *
 * No lanza a proposito: llamarla no debe tumbar una operacion de caja. Quien
 * necesita una tasa de verdad usa `resolveExchangeRate`, que si falla con un
 * mensaje util.
 */
export async function getDolarPrice(): Promise<number> {
	try {
		const res = await fetch(DOLAR_API)
		if (!res.ok) return 0
		const dolar = await res.json()
		const rate = Number(dolar?.promedio)
		// La API puede devolver un numero, un string, o un cuerpo de error con
		// status 200. Solo pasa el chequeo si es un numero usable.
		return Number.isFinite(rate) && rate > 0 ? rate : 0
	} catch {
		return 0
	}
}

/**
 * Tasa con la que se va a registrar la operacion.
 *
 * Prioridad: la del servidor (fuente unica para toda la facultad), y si no se
 * puede obtener, la que envio el cliente. El fallback existe porque la tasa se
 * pide a una API de terceros y esa API se cae; que el cajero no pueda facturar
 * por culpa de un tercero es peor que aceptar la tasa que ya tiene en pantalla.
 *
 * La tasa del cliente no es libre: la ruta la valida con `v.amount(..., {min:
 * 0.000001})` ANTES de llamar aqui, asi que nunca llega un numero inventado ni
 * un cero. Aun asi se vuelve a validar, porque la funcion es exportada y podria
 * llamar desde otro lado.
 *
 * Si ninguna de las dos sirve, se lanza: facturar con tasa 0 rompe en silencio.
 */
export async function resolveExchangeRate(clientRate: unknown): Promise<number> {
	const delServidor = await getDolarPrice()
	if (delServidor > 0) return delServidor

	const delCliente = Number(clientRate)
	if (Number.isFinite(delCliente) && delCliente > 0) return delCliente

	throw failure(
		'exchangeRate',
		'No se pudo obtener la tasa de cambio del dia. No se puede facturar sin tasa.'
	)
}