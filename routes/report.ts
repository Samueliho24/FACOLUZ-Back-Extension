import express, { type Response, type Request } from "npm:express@4.18.2";
import { permissionsList } from "../functions/PermissionHelper.ts";
import { getReportInfo } from "../dbConnection/reports.ts";
import { BuildReport } from "../PdfModels/DailyReport.ts";
import * as mw from '../middlewares.ts';

const reportRoutes = express.Router();

//Emitir reporte diario
reportRoutes.get('/daily', mw.singlePermission(permissionsList.emitirReportes), async (_req: Request, res: Response) => {
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