import { getCertificateInfo, getCertificateList, getCertificatesByStudent } from "../dbConnection/certificates.ts";
import { permissionsList } from "../functions/PermissionHelper.ts";
import { buildCertificate } from "../PdfModels/certificate.ts";
import express, { type Request, type Response } from "npm:express@4.18.2";
import * as mw from '../middlewares.ts'

const certificateRoutes = express.Router();

const anyPermissionList = [
    permissionsList.listarCertificados,
    permissionsList.emitirCertificado,
    permissionsList.reimprimirCertificado
]

certificateRoutes.get("/:certificateId", mw.singlePermission(permissionsList.reimprimirCertificado), async(req: Request, res: Response) => {
    try{
        const certificateId = req.params.certificateId;
        const dbResponse = await getCertificateInfo(certificateId)
        const fileTitle = `Certificado de ${dbResponse.course_name} a ${dbResponse.name} ${dbResponse.lastname}`
        const stream = res.writeHead(200, {
            "Content-Type": "aplication/pdf",
            "Content-Disposition": `attachment; filename=${fileTitle}.pdf`
        })
        res.status(200)

        buildCertificate(
            (data) => stream.write(data),
            () => stream.end(),
            dbResponse
        )
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

certificateRoutes.get("/", mw.multiplePermission(anyPermissionList), async(_req: Request, res: Response) => {
    try{
        const dbResponse = await getCertificateList();
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

certificateRoutes.get("/student/:studentId", mw.multiplePermission(anyPermissionList), async(req: Request, res: Response) => {
    try{
        const studentId: number = req.params.studentId;
        const dbResponse = await getCertificatesByStudent(studentId);
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

export default certificateRoutes;