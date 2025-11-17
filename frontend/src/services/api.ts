import { http } from './http'
import type {
	CourseGraphResponse,
	CreditsRequest,
	CreditsResponse,
	PrerequisiteResponse,
	SpecializationResponse,
	ExamHelperResponse,
	CareerPathResponse,
} from '../types/analysis'

type ChatResponse = {
	answer: string
	sources: string[]
}

export async function chatWithSyllabus(message: string): Promise<ChatResponse> {
	const res = await http.post(`/chat`, { message })
	return res.data
}

export async function askQuestion(question: string, sessionId?: string) {
	const res = await http.post(`/chat/ask`, { question, session_id: sessionId })
	return res.data
}

export async function listSessions() {
	const res = await http.get(`/chat/sessions`)
	return res.data
}

export async function createSession() {
	const res = await http.post(`/chat/sessions`)
	return res.data
}

export async function listDocuments() {
	const res = await http.get(`/documents/list`)
	return res.data
}

export async function getDocumentStatus(docId?: string) {
	const res = await http.get(`/documents/status`, { params: { doc_id: docId } })
	return res.data
}

export async function uploadPdf(file: File, onProgress?: (pct: number) => void) {
	const form = new FormData()
	form.append('file', file)
	const res = await http.post(`/documents/upload`, form, {
		headers: { 'Content-Type': 'multipart/form-data' },
		onUploadProgress: (evt) => {
			if (!onProgress || !evt.total) return
			onProgress(Math.round((evt.loaded / evt.total) * 100))
		},
	})
	return res.data
}

export async function deleteDocument(docId: string) {
	const res = await http.delete(`/documents/${docId}`)
	return res.data
}

// MCA analysis endpoints
export async function getCourseGraph(): Promise<CourseGraphResponse> {
	const res = await http.get('/analysis/course-graph')
	return res.data
}

export async function calculateCredits(payload: CreditsRequest): Promise<CreditsResponse> {
	const res = await http.post('/analysis/credits', payload)
	return res.data
}

export async function getPrerequisites(courseCode: string): Promise<PrerequisiteResponse> {
	const res = await http.get(`/analysis/prerequisites/${courseCode}`)
	return res.data
}

export async function getSpecialization(slug: string): Promise<SpecializationResponse> {
	const res = await http.get(`/analysis/specializations/${slug}`)
	return res.data
}

export async function getExamHelper(focus: string): Promise<ExamHelperResponse> {
	const res = await http.get('/analysis/exam-helper', { params: { focus } })
	return res.data
}

export async function getCareerPaths(courses: string[]): Promise<CareerPathResponse> {
	const res = await http.post('/analysis/career-path', { completed_courses: courses })
	return res.data
}


