import jwt from 'npm:jsonwebtoken'
import { secret } from "./main.ts"
import multer from 'npm:multer'

export function systemAdmin(req, res, next){
	try{
		const token = req.headers.authorization.split(" ")[1]
		const payload = jwt.verify(token, secret)
		const currentTime = Math.floor(Date.now() / 1000)
		if(currentTime > payload.exp){
			res.status(401).send('Sesion expirada')
		}else if(payload.type >= 1){
			res.status(401).send('Restringido')
		}
		next()
	}catch(err){
		return res.status(401).send('Token no válido');
	}
}

export function departmentChief(req, res, next){
	try{
		const token = req.headers.authorization.split(" ")[1]
		const payload = jwt.verify(token, secret)
		const currentTime = Math.floor(Date.now() / 1000)
		if(currentTime > payload.exp){
			res.status(401).send('Sesion expirada')
		}else if(payload.type >= 2){
			res.status(401).send('Restringido')
		}
		next()
	}catch(err){
		return res.status(401).send('Token no válido');
	}
}

export function departmentWorker(req, res, next){
	try{
		const token = req.headers.authorization.split(" ")[1]
		const payload = jwt.verify(token, secret)
		const currentTime = Math.floor(Date.now() / 1000)
		if(currentTime > payload.exp){
			res.status(401).send('Sesion expirada')
		}else if(payload.type >= 3){
			res.status(401).send('Restringido')
		}
		next()
	}catch(err){
		console.log(err)
		return res.status(401).send('Token no válido');
	}
}

const upload = multer({dest: '/data/profilePics', })
export const parseFormData = upload.single("file")

const uploadFile = multer({dest: '/data/documents'})
export const saveDoc = uploadFile.single("file")