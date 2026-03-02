import { query, execute } from "../dbConnection.ts"

export async function getCertificateInfo(certificateId: string){
	const res = await query(`
		select
			s.name,
			s.lastname,
			s.studentsIdentification,
			c2.description as course_name,
			c.id as certificate_id,
			c.date 
		from certificates c join courses c2 on c2.id = c.courseId join students s on c.studentId = s.id 
		where c.id = ?	
	`, [certificateId])
	return res[0];
}

export async function getCertificateList(){
	const res = await query(`
		select
			s.name,
			s.lastname,
			s.studentsIdentification,
			c2.description as course_name,
			c.id as certificate_id,
			c.date 
		from certificates c join courses c2 on c2.id = c.courseId join students s on c.studentId = s.id 
	`)
	return res;
}