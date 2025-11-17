import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import React, { Suspense } from 'react'
const UploadZone = React.lazy(() => import('./components/UploadZone').then(m => ({ default: m.UploadZone })))
const McaAnalysisPanel = React.lazy(() => import('./components/McaAnalysisPanel').then(m => ({ default: m.McaAnalysisPanel })))
import { askQuestion, createSession, listDocuments, listSessions } from './services/api'
import type { AskResponse, DocumentItem, SessionInfo } from './types'
import { useSession } from './context/SessionContext'
import { useTheme } from './context/ThemeContext'
import toast from 'react-hot-toast'
import { ErrorBoundary } from './components/ErrorBoundary'

type MessageRole = 'user' | 'assistant'
interface ChatMessage {
	id: string
	role: MessageRole
	text: string
	ts: number
	sources?: AskResponse['sources']
	confidence?: number
	confidenceExplanation?: string
	followUp?: string
}

export default function App() {
	const queryClient = useQueryClient()
	const { currentSessionId, setCurrentSessionId, getMessages, setMessages } = useSession()
	const { theme, toggle } = useTheme()

	// State management
	const [messages, setMessagesState] = useState<ChatMessage[]>([])
	const currentSession = currentSessionId
	const [question, setQuestion] = useState<string>('')
	const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processed'>('idle')

	// Sessions list
	const {
		data: sessions,
		isLoading: sessionsLoading,
		refetch: refetchSessions,
	} = useQuery<SessionInfo[]>({
		queryKey: ['sessions'],
		queryFn: async () => {
			const res = await listSessions()
			return res
		},
	})

	// Documents list (used to infer upload status)
	const { data: documents, refetch: refetchDocuments } = useQuery<{ documents: DocumentItem[] }>({
		queryKey: ['documents'],
		queryFn: async () => {
			const res = await listDocuments()
			return res
		},
	})

	useEffect(() => {
		const anyProcessing = (documents?.documents ?? []).some((d) => d.status === 'processing' || d.status === 'uploaded')
		const anyCompleted = (documents?.documents ?? []).some((d) => d.status === 'completed')
		if (anyProcessing) setUploadStatus('uploading')
		else if (anyCompleted) setUploadStatus('processed')
		else setUploadStatus('idle')
	}, [documents])

	// Mutations
	const createSessionMutation = useMutation({
		mutationFn: async () => {
			const res = await createSession()
			return res.session_id as string
		},
		onSuccess: async (sessionId) => {
			setCurrentSessionId(sessionId)
			setMessagesState([])
			setMessages(sessionId, [])
			await refetchSessions()
			toast.success('New chat session created')
		},
		onError: () => toast.error('Failed to create session'),
	})

	const askMutation = useMutation({
		mutationFn: async (q: string) => {
			const res: AskResponse = await askQuestion(q, currentSession ?? undefined)
			return res
		},
		onSuccess: (res) => {
			// Ensure we persist the session id provided by backend
			if (!currentSession) {
				setCurrentSessionId(res.session_id)
			}
			const nextMessages = [
				...prev,
				{ id: crypto.randomUUID(), role: 'user', text: question, ts: Date.now() },
				{
					id: crypto.randomUUID(),
					role: 'assistant',
					text: res.answer,
					ts: Date.now(),
					sources: res.sources,
					confidence: res.confidence,
					confidenceExplanation: res.confidence_explanation,
					followUp: res.follow_up_question ?? undefined,
				},
			]
			setMessagesState(nextMessages)
			const sid = currentSession ?? res.session_id
			if (sid) setMessages(sid, nextMessages)
			setQuestion('')
			toast.success('Answer received')
		},
		onError: () => toast.error('Failed to get an answer. Please try again.'),
	})

	const onSend = (e: React.FormEvent) => {
		e.preventDefault()
		const q = question.trim()
		if (!q) return
		askMutation.mutate(q)
	}

	// Debounced prefetch (optional performance improvement)
	useEffect(() => {
		const q = question.trim()
		if (!q) return
		const id = setTimeout(() => {
			// Potential place for suggestions prefetch or warm-up
			// e.g., queryClient.prefetchQuery(...)
		}, 400)
		return () => clearTimeout(id)
	}, [question, queryClient])

	// Derived UI helpers
	const currentSessionTitle = useMemo(() => {
		if (!currentSession) return 'New session'
		const found = (sessions ?? []).find((s) => s.session_id === currentSession)
		return found ? `Session ${found.session_id.slice(0, 8)}...` : 'Current session'
	}, [currentSession, sessions])

	// Load cached messages when switching sessions
	useEffect(() => {
		if (currentSession) {
			const cached = getMessages(currentSession)
			// Convert StoredMessage to ChatMessage (compatible)
			setMessagesState(cached as ChatMessage[])
		} else {
			setMessagesState([])
		}
	}, [currentSession, getMessages])

	return (
		<ErrorBoundary>
			<div className="h-screen flex">
				{/* Sidebar */}
				<aside className="w-72 border-r border-gray-200 p-4 flex flex-col">
					<div className="flex items-center justify-between mb-3">
						<h2 className="font-semibold">Sessions</h2>
						<button
							className="px-2 py-1 text-sm rounded bg-blue-600 text-white"
							onClick={() => createSessionMutation.mutate()}
							disabled={createSessionMutation.isPending}
						>
							{createSessionMutation.isPending ? 'Creating...' : 'New'}
						</button>
					</div>
					<div className="flex-1 overflow-auto">
						{sessionsLoading ? (
							<p className="text-sm text-gray-500">Loading sessions...</p>
						) : (sessions ?? []).length === 0 ? (
							<p className="text-sm text-gray-500">No sessions yet.</p>
						) : (
							<ul className="space-y-1">
								{(sessions ?? []).map((s) => (
									<li key={s.session_id}>
										<button
											onClick={() => {
												setCurrentSessionId(s.session_id)
												const cached = getMessages(s.session_id)
												setMessagesState(cached as ChatMessage[])
											}}
											className={`w-full text-left px-2 py-1 rounded ${
												currentSession === s.session_id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
											}`}
										>
											<div className="text-sm font-medium">Session {s.session_id.slice(0, 8)}...</div>
											<div className="text-xs text-gray-500">{s.message_count} messages</div>
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
					<div className="mt-3">
						<button className="text-xs text-gray-600 underline" onClick={() => refetchSessions()}>
							Refresh
						</button>
					</div>
					<div className="mt-6">
						<h3 className="text-sm font-semibold mb-2">Quick actions</h3>
						<ul className="text-sm list-disc list-inside text-gray-600 space-y-1">
							<li>Upload syllabus PDF</li>
							<li>Ask about credits</li>
							<li>Check prerequisites</li>
						</ul>
					</div>
				</aside>

				{/* Main area */}
				<main className="flex-1 flex flex-col">
					<header className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
						<div>
							<h1 className="text-xl font-semibold">Chat with MCA Syllabus</h1>
							<p className="text-sm text-gray-600">{currentSessionTitle}</p>
						</div>
						<button
							className="text-sm px-3 py-1.5 rounded border hover:bg-gray-50"
							onClick={toggle}
							aria-label="Toggle theme"
							title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
						>
							{theme === 'light' ? '🌙 Dark' : '☀️ Light'}
						</button>
					</header>

					<div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-0">
						{/* Chat area */}
						<section className="lg:col-span-2 flex flex-col">
							<div className="flex-1 overflow-auto p-6 space-y-3">
								{messages.length === 0 ? (
									<p className="text-sm text-gray-500">Start by asking a question about the MCA syllabus.</p>
								) : (
									messages.map((m) => (
										<div key={m.id} className={`p-3 rounded border ${m.role === 'user' ? 'bg-white' : 'bg-gray-50'}`}>
											<div className="text-xs text-gray-500 mb-1">{m.role === 'user' ? 'You' : 'Assistant'}</div>
											<div className="whitespace-pre-wrap text-sm">{m.text}</div>
											{m.role === 'assistant' && (
												<div className="mt-2">
													{m.confidence !== undefined && (
														<div className="text-xs text-gray-500">Confidence: {(m.confidence * 100).toFixed(0)}%</div>
													)}
													{m.confidenceExplanation && (
														<div className="text-xs text-gray-500">{m.confidenceExplanation}</div>
													)}
													{(m.sources ?? []).length > 0 && (
														<ul className="mt-1 text-xs text-gray-600 list-disc list-inside">
															{m.sources!.map((s) => (
																<li key={s.index}>
																	{s.name}
																	{s.page !== undefined ? ` (page ${s.page})` : ''}{' '}
																	{s.score !== undefined ? `score ${s.score.toFixed(3)}` : ''}
																</li>
															))}
														</ul>
													)}
													{m.followUp && (
														<div className="mt-1 text-xs text-blue-600">Follow-up suggestion: {m.followUp}</div>
													)}
												</div>
											)}
										</div>
									))
								)}
							</div>
							<form onSubmit={onSend} className="border-t border-gray-200 p-4 flex gap-2">
								<input
									type="text"
									className="flex-1 border rounded px-3 py-2"
									placeholder="Ask about courses, credits, prerequisites, grading..."
									value={question}
									onChange={(e) => setQuestion(e.target.value)}
									disabled={askMutation.isPending}
									required
								/>
								<button
									type="submit"
									disabled={askMutation.isPending || !question.trim()}
									className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
								>
									{askMutation.isPending ? 'Asking...' : 'Ask'}
								</button>
							</form>
						</section>

						{/* Upload / Documents panel */}
						<aside className="border-l border-gray-200 p-4 space-y-6">
							<h3 className="font-semibold">Documents</h3>
							<p className="text-sm text-gray-600">
								Status: {uploadStatus === 'idle' ? 'No uploads' : uploadStatus === 'uploading' ? 'Processing...' : 'Ready'}
							</p>
							<div className="mt-3">
								<Suspense fallback={<div className="text-sm text-gray-500">Loading uploader…</div>}>
									<UploadZone />
								</Suspense>
							</div>
							<div className="mt-3">
								<button
									className="text-xs text-gray-600 underline"
									onClick={() => {
										refetchDocuments()
									}}
								>
									Refresh documents
								</button>
							</div>
							<div>
								<ul className="space-y-1">
									{(documents?.documents ?? []).map((d) => (
										<li key={d.doc_id} className="text-xs text-gray-700">
											<span className="font-medium">{d.filename}</span> — {d.status}
											{typeof d.chunks === 'number' ? ` (${d.chunks} chunks)` : ''}
										</li>
									))}
								</ul>
							</div>

							<div>
								<h3 className="font-semibold">MCA Analysis</h3>
								<Suspense fallback={<div className="text-sm text-gray-500">Loading analysis tools…</div>}>
									<McaAnalysisPanel />
								</Suspense>
							</div>
						</aside>
					</div>
				</main>
			</div>
		</ErrorBoundary>
	)
}


