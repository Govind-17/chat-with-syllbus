export type SourceItem = {
	index: number
	name: string
	page?: number
	score?: number
}

export type AskResponse = {
	answer: string
	sources: SourceItem[]
	confidence: number
	confidence_explanation: string
	follow_up_question?: string
	session_id: string
}

export type SessionInfo = {
	session_id: string
	message_count: number
	updated_at: number
}

export type DocumentItem = {
	doc_id: string
	filename: string
	size?: number
	uploaded_bytes?: number
	status: string
	chunks?: number
}


