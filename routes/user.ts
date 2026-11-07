import express from "npm:express@4.18.2";
import * as mw from '../middlewares.ts'
import { IFilterUsers } from "../types/filterObjects/IFilterUsers.ts";
import { createNewUser, deactivateUser, getAllUsers, getUserById, reactivateUser, updatePassword, updateUser, updateUserType } from "../dbConnection/users.ts";
import { hash } from "node:crypto";
import { encrypt } from "../functions/hash.ts";

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

// Reactivar un usuario
userRoutes.post('/:userId/reactivate', mw.systemAdmin, async (req, res) => {
	try{
		const userId = req.params.userId;
		const _dbResponse = await reactivateUser(userId)
		res.status(200).send()
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

userRoutes.delete("/:userId", mw.systemAdmin, async (req, res) => {
	try{
		const userId: number = req.params.userId;
		const _dbResponse = await deactivateUser(userId)
		res.status(201).send()
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

userRoutes.patch('/updatePassword', mw.systemAdmin, async (req, res) => {
	try{
		const { userId, newPassword } = req.body
		const _dbResponse = await updatePassword(userId, await encrypt(newPassword))
		res.status(200).send()
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

userRoutes.patch('/userType', mw.systemAdmin, async (req, res) => {
	try{
		const { userId, newType } = req.body
		const _dbResponse = await updateUserType(userId, newType)
		res.status(200).send()
	}catch(err){
		console.log(err)
		res.status(500).send(err)
	}
})

export default userRoutes;
