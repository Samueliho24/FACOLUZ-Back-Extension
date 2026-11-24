import { registerEnrollment, updateEnrollmentState } from "../dbConnection/enrollments.ts";
import express, { type Request, type Response } from "npm:express@4.18.2";
import { IRegisterEnrollment } from "../types/IRegisterEnrollment.ts";
import * as mw from '../middlewares.ts'
import { permissionsList } from "../functions/PermissionHelper.ts";

const enrollmentRoute = express.Router();

//Inscribir
enrollmentRoute.post('/', mw.singlePermission(permissionsList.inscribir), async (req: Request, res: Response) => {
    const enrollmentData: IRegisterEnrollment = req.body
    try{
        const dbResponse = await registerEnrollment(enrollmentData)
        res.status(200).send(dbResponse)		
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

//Actualizar inscripcion
enrollmentRoute.patch('/', mw.singlePermission(permissionsList.retirarInscripcion), async (req: Request, res: Response) => {
    const {enrollmentId, newState} = req.body
    try{
        const dbResponse = await updateEnrollmentState(enrollmentId, newState)
        res.status(200).send(dbResponse)		
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

//Estaba marcada como end point de prueba
// enrollmentRoute.post('/api/registerEnrollment', mw.departmentWorker, async (req: Request, res: Response) => {
//     const { studentId, sectionId, cohortId, enrollmentType, parentEnrollmentId } = req.body;
//     try {
//         const dbResponse = await registerEnrollment({
//             studentId,
//             sectionId,
//             cohortId,
//             enrollmentType,
//             parentEnrollmentId
//         });
//         res.status(200).send(dbResponse);
//     } catch (err) {
//         console.log(err);
//         res.status(500).send(err);
//     }
// });

export default enrollmentRoute;