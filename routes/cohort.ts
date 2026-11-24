import { createStudentCohort } from "../dbConnection/enrollments.ts";
import { permissionsList } from "../functions/PermissionHelper.ts";
import express, { type Request, type Response} from "npm:express@4.18.2";
import * as mw from '../middlewares.ts'

const cohortRoutes = express.Router();

cohortRoutes.post('/', mw.singlePermission(permissionsList.agregarEstudiante), async (req: Request, res: Response) => {
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
