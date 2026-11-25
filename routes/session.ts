import express, { type Request, type Response } from "npm:express@4.18.2";
import { ITokenPayload } from "../types/ITokenPayload.ts";
import { login } from "../dbConnection/system.ts";
import { secret } from "../main.ts";
import jwt from 'npm:jsonwebtoken'

const sessionRoutes = express.Router();

sessionRoutes.post('/login', async (req: Request, res: Response) => {
    const { passwordHash } = req.body
    let dbResponse
    try{
        dbResponse = await login(req.body)
        if(dbResponse.length == 0){
            res.status(404).send('Usuario no encontrado')
        }else if(dbResponse[0].passwordSHA256 != passwordHash){
            res.status(401).send('Contraseña Incorrecta')
        }else if(dbResponse[0].active == false){
            res.status(404).send('Este usuario se encuentra inactivo')
        }else{
            const token: ITokenPayload = jwt.sign({
                id: dbResponse[0].id,
                name: dbResponse[0].name,
                type: dbResponse[0].type,
                exp: Math.floor(Date.now() / 1000) + 60000,
                permissions: dbResponse[0].permissions
            }, secret)
            res.status(200).send({...dbResponse[0], jwt: token})
        }
    }catch(err){
        console.log(err)
        res.status(500).send('error del servidor')
    }
})

export default sessionRoutes;