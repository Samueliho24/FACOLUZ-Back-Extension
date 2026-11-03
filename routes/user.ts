import express from "npm:express@4.18.2";
import * as mw from '../middlewares.ts'
import { IFilterUsers } from "../types/filterObjects/IFilterUsers.ts";
import { createNewUser, getAllUsers, getUserById, updateUser } from "../dbConnection/users.ts";

const userRoutes = express.Router();

//Lista de usuarios
userRoutes.get('/list/:page', mw.systemAdmin, async(req, res) => {
	
	//Si se esta filtrando u obteniendo un elemento concreto
	//se usa este objeto, si es null se devuelven todos
	const _searchObject: IFilterUsers = req.body	//falta imprementar filtrado, por ahora devuelve todos
	const page = Number(req.params.page)

	try{
		const dbResponse = await getAllUsers(page)
		res.status(200).send(dbResponse)
	}catch(err){
		console.log(err)
		res.status(500).send()
	}
})

//Obtener un usuario determinado
userRoutes.get('/:id', mw.systemAdmin, async(req, res) => {
	try{
		const id: number = req.params.id;
		const dbResponse = await getUserById(id);
		res.status(200).send(dbResponse);
	}catch(err){
		console.log(err)
		res.status(500).send();
	}
})

// Crear nuevo usuario
userRoutes.post('/', mw.systemAdmin, async (req, res) => {
	try{
		const user = req.body;
		const _dbResponse = await createNewUser(user)
		res.status(201).send()
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

//Actualzar un usuario
userRoutes.patch('/', mw.systemAdmin, async (req, res) => {
	try{
		const user = req.body;
		const _dbResponse = await updateUser(user)
		res.status(201).send()
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

export default userRoutes;
