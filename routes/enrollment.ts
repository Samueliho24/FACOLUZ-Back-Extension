import express from "npm:express@4.18.2";
import * as mw from '../middlewares.ts'
import { getEnrollmentCountBySection, getEnrollmentHistory, registerEnrollment, updateEnrollmentState } from "../dbConnection/enrollments.ts";

const enrollmentRoute = express.Router();

//Inscribir
enrollmentRoute.post('/', mw.departmentWorker, async (req, res) => {
    const {studentId, sectionId} = req.body
    try{
        const dbResponse = await registerEnrollment({studentId, sectionId})
        res.status(200).send(dbResponse)		
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

//Actualizar inscripcion
enrollmentRoute.patch('/', mw.departmentWorker, async (req, res) => {
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
// enrollmentRoute.post('/api/registerEnrollment', mw.departmentWorker, async (req, res) => {
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