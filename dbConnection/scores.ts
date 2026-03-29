import {execute, query} from '../dbConnection.ts'



export async function setLoadScores(data: string) {
    const scores = data
    let resp
    //scores.map(item => {
    //    const res =await execute(`UPDATE enrollments_grade SET score = ?, dateScore = NOW() WHERE enrollmentId = ?`, [item.score, item.enrollmentId])
    //})
    return resp
}