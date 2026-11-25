import { type Request, type Response, type NextFunction } from 'npm:express@4.18.2'
import { verifyPermission } from "./functions/PermissionHelper.ts";
import { isExpired } from "./functions/middlewareHelper.ts";
import { ITokenPayload } from "./types/ITokenPayload.ts";
import { secret } from "./main.ts"
import jwt from 'npm:jsonwebtoken'
import multer from 'npm:multer'

export function singlePermission(permission: number){
	return function(req: Request, res: Response, next: NextFunction){
		try{
			const token = req.headers.authorization.split(" ")[1]
			const payload: ITokenPayload = jwt.verify(token, secret)
			if(isExpired(payload.exp)){
				res.status(401).send('Sesion expirada')
			}
			if(verifyPermission(BigInt(payload.permissions), permission)){
				next()
			}else{
				res.status(403).send("Consulte permisos con su superior")
			}
		}catch(err){
			console.log(err)
			return res.status(400).send('Token no válido');
		}
	}
}

export function multiplePermission(permissions: number[]){
	return function(req: Request, res: Response, next: NextFunction){
		try{
			const token = req.headers.authorization.split(" ")[1]
			const payload: ITokenPayload = jwt.verify(token, secret)
			if(isExpired(payload.exp)){
				res.status(401).send('Sesion expirada')
			}
			
			let passing = false

			for(let i = 0; i <= permissions.length; i++){
				if((verifyPermission(BigInt(payload.permissions), permissions[i])) && (passing == false)){
					passing = true
				}
			}

			if(passing){
				next()
			}else{
				res.status(403).send("Consulte permisos con su superior")
			}

		}catch(err){
			console.log(err)
			return res.status(400).send('Token no válido');
		}
	}
}

export function anyValidToken(req: Request, res: Response, next: NextFunction){
	try{
		const token = req.headers.authorization.split(" ")[1]
		const payload: ITokenPayload = jwt.verify(token, secret)
		if(isExpired(payload.exp)){
			res.status(401).send('Sesion expirada')
		}else{
			next()
		}

	}catch(err){
		console.log(err)
		return res.status(400).send('Token no válido');
	}
}

const upload = multer({dest: '/data/profilePics', })
export const parseFormData = upload.single("file")

const uploadFile = multer({dest: '/data/documents'})
export const saveDoc = uploadFile.single("file")