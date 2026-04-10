import {execute, query} from '../dbConnection.ts'

export async function setLoadScores(data: string) {
    const dataParsed = JSON.parse(data);
    const updateScoreQuery = `UPDATE enrollments_grade AS eg JOIN enrollments AS e ON eg.enrollmentId = e.id SET eg.score = ?, eg.dateScore = NOW(), status = CASE WHEN eg.score ? >= 10 THEN 'Aprobado' ELSE 'Reprobado' END
    WHERE e.studentId = ?`;
    const promises = dataParsed.map(({ studentId, score }) => execute(updateScoreQuery, [score, score, studentId]));
    await Promise.all(promises);
    return { message: 'Scores updated successfully'}
}

export async function updateScores(scores: any[]) {
  const updateScoreQuery = `UPDATE enrollments_grade SET score = ?, dateScore = NOW() WHERE enrollmentId = ?`;
  const promises = scores.map(({ score, enrollmentId }) => execute(updateScoreQuery, [score, enrollmentId]));
  await Promise.all(promises);
}