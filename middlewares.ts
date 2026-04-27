import jwt from 'npm:jsonwebtoken'
import { secret } from "./main.ts"
import multer from 'npm:multer'

export function forAdmins(req, res, next){
	try{
		const token = req.headers.authorization.split(" ")[1]
		const payload = jwt.verify(token, secret)
		if(Math.floor(Date.now() / 1000) > payload.exp){
			res.status(401).send('Sesion expirada')
		}else{
			next()
		}
	}catch(err){
		console.log(err)
		return res.status(401).send('Token no válido');
	}
}

const upload = multer({dest: './data/profilePics', })
export const parseFormData = upload.single("file")

const uploadFile = multer({dest: './data/documents'})
export const saveDoc = uploadFile.single("file")