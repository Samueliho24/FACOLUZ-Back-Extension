import jwt from 'npm:jsonwebtoken'
import { secret } from "./main.ts"
import multer from 'npm:multer'

// ---------------------------------------------------------------------------
//  Guardas de autorizacion
// ---------------------------------------------------------------------------
//
//  users.type, segun src/context/lists.js del frontend:
//     0 = Administrador de sistemas
//     1 = Jefe de departamento
//     2 = Administracion de caja
//     3 = Administracion academica
//     4 = Katy
//     100 = Autoridades
//
//  Cada guarda deja pasar los tipos de 0 hasta maxType, inclusive.
//
//  ANTES, estas tres funciones estaban escritas por separado y las tres
//  compartian el mismo defecto:
//
//      if(currentTime > payload.exp){
//          res.status(401).send('Sesion expirada')     <- sin return
//      }else if(payload.type >= 1){
//          res.status(401).send('Restringido')          <- sin return
//      }
//      next()
//
//  El 401 se enviaba y despues se llamaba a next(), asi que el handler
//  continuaba ejecutandose. El cliente recibia 401 y creia que la peticion
//  estaba rechazada, pero el trabajo ya se habia hecho: las lecturas se
//  descartaban al fallar el segundo res.send(), y las ESCRITURAS ya se
//  habian confirmado. La autorizacion se aplicaba a la respuesta, no a la
//  ejecucion. De las 29 rutas de escritura, 25 estaban bajo departmentWorker
//  (bloquea type >= 3), entre ellas issueInvoice, openPeriod, closePeriod y
//  openSection.
//
//  Tambien se elimino la comprobacion manual de expiracion. Era codigo muerto:
//  jwt.verify ya lanza cuando exp paso, y ese lanzamiento caia al catch.
//  La comprobacion jamas se cumplia dentro del try. Poner las tres guardas
//  en una sola funcion evita que vuelvan a divergir entre si.
// ---------------------------------------------------------------------------

function guardFor(maxType: number) {
	return function (req, res, next) {
		try {
			const header = req.headers.authorization
			if (!header) return res.status(401).send('Token no válido')

			// Lanza si el token esta vencido, mal firmado o manipulado.
			const payload = jwt.verify(header.split(' ')[1], secret)

			if (payload.type > maxType) return res.status(401).send('Restringido')

			next()
		} catch (err) {
			return res.status(401).send('Token no válido')
		}
	}
}

export const systemAdmin = guardFor(0)
export const departmentChief = guardFor(1)
export const departmentWorker = guardFor(2)

// ---------------------------------------------------------------------------
//  Multer
//  Sin limits ni fileFilter: la Fase 1 los dejo fuera de alcance. Ver la
//  seccion de deuda pendiente de GUIA-EXTENSION.md.
// ---------------------------------------------------------------------------

const upload = multer({dest: '/data/profilePics', })
export const parseFormData = upload.single("file")

const uploadFile = multer({dest: '/data/documents'})
export const saveDoc = uploadFile.single("file")
