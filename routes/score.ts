import { getScoreByStudent, loadScores, updateScore } from "../dbConnection/scores.ts";
import express, { type Request, type Response } from "npm:express@4.18.2";
import * as mw from '../middlewares.ts'
import { permissionsList } from "../functions/PermissionHelper.ts";

const scoreRoutes = express.Router();

// Subir notas
scoreRoutes.post('/', mw.singlePermission(permissionsList.subirNotas), async (req: Request, res: Response) => {
    const data = req.body
    try{
        const dbResponse = await loadScores(data)
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

//Obtener notas de un modulo para un estudiante 
scoreRoutes.get('/module/:moduleId/:studentIdentification', mw.singlePermission(permissionsList.listarNotas), async (req: Request, res: Response) => {
    try{
        const moduleId = req.params.moduleId
        const studentIdentification = req.params.studentIdentification
        const dbResponse = await getScoreByStudent(studentIdentification, moduleId)
        if (dbResponse.length == 0){
            res.status(404).send('No se han encontrado notas para este estudiante')
            return
        }
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

scoreRoutes.patch('/', mw.singlePermission(permissionsList.manejarModificacionNotas), async (req: Request, res: Response) => {
    const { gradeId, evaluationMode, finalScore, partials, reason } = req.body
    
    try {
        const dbResponse = await updateScore({
            gradeId,
            evaluationMode,
            finalScore,
            partials,
            reason
        })
        res.status(200).send(dbResponse)
    } catch (err) {
        console.log(err)
        res.status(500).send(err)
    }
})

/*scoreRoutes.post('/api/setUpdateScore',mw.departmentWorker, async (req,res) => {
    const {studentId,moduleId, gradeId, lastScore,newScore,reason} = req.body
    try{
        const dbResponse = await updateScore(studentId,moduleId,gradeId,lastScore,newScore,reason)
        console.log(dbResponse)
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})*/

export default scoreRoutes;