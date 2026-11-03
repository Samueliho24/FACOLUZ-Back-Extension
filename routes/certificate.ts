import express from "npm:express@4.18.2";
import * as mw from '../middlewares.ts'
import { getCertificateInfo, getCertificateList, getCertificatesByStudent } from "../dbConnection/certificates.ts";
import { buildCertificate } from "../PdfModels/certificate.ts";

const certificateRoutes = express.Router();

certificateRoutes.get("/:certificateId", mw.departmentWorker, async(req, res) => {
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

certificateRoutes.get("/", mw.departmentWorker, async(req, res) => {
    try{
        const dbResponse = await getCertificateList();
        res.status(200).send(dbResponse)
    }catch(err){
        console.log(err)
        res.status(500).send(err)
    }
})

certificateRoutes.get("/student/:studentId", mw.departmentWorker, async(req, res) => {
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