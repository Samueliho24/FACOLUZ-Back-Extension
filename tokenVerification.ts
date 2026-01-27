import jwt from 'npm:jsonwebtoken'
const secret = Deno.env.get("SECRET")


export function forTeachOrStud(req, res, next){
	try{
		const token = req.headers.authorization.split(" ")[1]
		const payload = jwt.verify(token, secret)
		if(Date().now > payload.exp){
			res.status(401).send('Sesion expirada')
		}else if(payload.type != 1 || payload.type != 2){
            res.status(401).send('Usted no se encuentra registrado como estudiante o profesor')
        }
		next()
	}catch(err){
		return res.status(401).send('Token no válido');
	}
}

export function forTeachers(req, res, next){
	try{
		const token = req.headers.authorization.split(" ")[1]
		const payload = jwt.verify(token, secret)
		if(Date().now > payload.exp){
			res.status(401).send('Sesion expirada')
		}else if(payload.type != 1){
            res.status(401).send('Usted no se encuentra registrado como profesor')
        }
		next()
	}catch(err){
		return res.status(401).send('Token no válido');
	}
}

export function forSysAdmins(req, res, next){
	try{
		const token = req.headers.authorization.split(" ")[1]
		const payload = jwt.verify(token, secret)
		if(Date().now > payload.exp){
			res.status(401).send('Sesion expirada')
		}else if(payload.type != 0){
			res.status(401).send('Usted no es un administrador de sistemas')
		}else{
			next()
		}
	}catch(err){
		return res.status(401).send('Token no válido');
	}
}

export function forStudyControl(req, res, next){
	try{
		const token = req.headers.authorization.split(" ")[1]
		const payload = jwt.verify(token, secret)
		if(Date().now > payload.exp){
			res.status(401).send('Sesion expirada')
		}else if(payload.type != 3){
			res.status(401).send('Usted no es un trabajador de control de estudios')
		}
		next()
	}catch(err){
		return res.status(401).send('Token no válido');
	}
}

export function forAdmins(req, res, next){
	try{
		const token = req.headers.authorization.split(" ")[1]
		const payload = jwt.verify(token, secret)
		if(Date().now > payload.exp){
			res.status(401).send('Sesion expirada')
		}else if(payload.type != 5){
			res.status(401).send('Usted no es un administrador de sistemas')
		}else{
			next()
		}
	}catch(err){
		return res.status(401).send('Token no válido');
	}
}