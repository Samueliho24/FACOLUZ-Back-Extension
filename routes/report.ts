import express from "npm:express@4.18.2";
import * as mw from '../middlewares.ts'
import { getReportInfo } from "../dbConnection/reports.ts";
import { BuildReport } from "../PdfModels/DailyReport.ts";

const reportRoutes = express.Router();

//Emitir reporte diario
reportRoutes.get('/daily', mw.departmentWorker, async (req, res) => {
    try{

        const currentDate = new Date
        const roofLimit = new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 28)
        const floorLimit = new Date(currentDate.getFullYear(), currentDate.getMonth()-1, currentDate.getDate())

        const stream = res.writeHead(200, {
            "Content-Type": "aplication/pdf",
            "Content-Disposition": `attachment; filename=Reporte del ${floorLimit.toDateString()}.pdf`
        })

        const dbResponse = await getReportInfo(floorLimit, roofLimit)

        res.status(200)

        BuildReport(
            (data) => stream.write(data),
            () => stream.end(),
            dbResponse
        )
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

export default reportRoutes;