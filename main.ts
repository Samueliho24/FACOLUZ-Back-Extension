import express from "npm:express@4.18.2";
import cors from 'npm:cors'
import "jsr:@std/dotenv/load";

import invoiceRoutes from "./routes/invoices.ts";
import paymentRoutes from "./routes/payments.ts"
import listsRoutes from './routes/lists.ts'
import periodRoutes from './routes/periods.ts'
import sessionRoutes from './routes/session.ts'
import reportRoutes from './routes/report.ts'
import sectionRoutes from './routes/section.ts'
import courseRoutes from "./routes/course.ts";
import moduleRouter from './routes/module.ts'
import studentRoutes from "./routes/student.ts";
import enrollmentRoute from "./routes/enrollment.ts";
import scoreRoutes from "./routes/score.ts";
import certificateRoutes from "./routes/certificate.ts"
import teacherRoutes from './routes/teacher.ts'
import documentRoutes from "./routes/document.ts";
import cohortRoutes from './routes/cohort.ts'
import userRoutes from './routes/user.ts'

const port = Deno.env.get("PORT")
export const secret = Deno.env.get("SECRET")

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: true}))

app.use('/invoice', invoiceRoutes)
app.use('/payment', paymentRoutes)
app.use('/lists', listsRoutes)
app.use('/period', periodRoutes)
app.use('/session', sessionRoutes)
app.use('/report', reportRoutes)
app.use('/section', sectionRoutes)
app.use('/course', courseRoutes)
app.use('/module', moduleRouter)
app.use('/student', studentRoutes)
app.use('/enrollment', enrollmentRoute)
app.use('/score', scoreRoutes)
app.use('/certificate', certificateRoutes)
app.use('/teacher', teacherRoutes)
app.use('/document', documentRoutes)
app.use('/cohort', cohortRoutes)
app.use('/user', userRoutes)

app.listen(port, "0.0.0.0", () => {
	console.log(`Puerto: ${port}`)
})


//Pendientes

// import { loadScores, getScoreByStudent, updateScore, getGradeStudentsBySection } from "./dbConnection/scores.ts";

// app.get('/api/getGradeStudentsBySection/:periodId/:sectionCode', mw.departmentWorker, async (req, res) => {
// 	try{
// 		const periodId = req.params.periodId
// 		const sectionCode = req.params.sectionCode
// 		const dbResponse = await getGradeStudentsBySection(periodId, sectionCode)
// 		res.status(200).send(dbResponse)
// 	}catch(err){
// 		console.log(err)
// 		res.status(500).send(err)
// 	}
// })