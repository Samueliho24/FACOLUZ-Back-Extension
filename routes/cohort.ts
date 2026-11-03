import express from "npm:express@4.18.2";
import * as mw from '../middlewares.ts'
import { createStudentCohort } from "../dbConnection/enrollments.ts";

const cohortRoutes = express.Router();

cohortRoutes.post('/', mw.departmentWorker, async (req, res) => {
    const { studentId, periodId, sectionCode, courseId } = req.body;
    try {
        const cohortId = await createStudentCohort({ studentId, periodId, sectionCode, courseId });
        res.status(200).send({ cohortId, success: true });
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
});

export default cohortRoutes;
