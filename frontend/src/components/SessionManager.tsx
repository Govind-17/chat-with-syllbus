import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'

export type Message = {
	id: string
	role: 'user' | 'assistant'
	text: string
	ts: number
}

export type Session = {
	id: string
	title: string
	createdAt: Date
	messages: Message[]
}

type SessionManagerProps = {
	currentSession: Session | null
	setCurrentSession: (session: Session) => void
}

const STORAGE_KEY = 'mca_session_manager_v1'

type StoredSession = Omit<Session, 'createdAt'> & { createdAt: string }

function loadSessions(): Session[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (!raw) return []
		const parsed: StoredSession[] = JSON.parse(raw)
		return parsed.map((s) => ({ ...s, createdAt: new Date(s.createdAt) }))
	} catch {
		return []
	}
}

function persistSessions(sessions: Session[]) {
	try {
		const serialized: StoredSession[] = sessions.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }))
		localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized))
	} catch {
		// ignore quota errors
	}
}

export function SessionManager({ currentSession, setCurrentSession }: SessionManagerProps) {
	const [sessions, setSessions] = useState<Session[]>(() => loadSessions())

	useEffect(() => {
		persistSessions(sessions)
	}, [sessions])

	const sorted = useMemo(
		() => [...sessions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
		[sessions]
	)

	const handleNewChat = () => {
		const session: Session = {
			id: crypto.randomUUID(),
			title: 'New chat',
			createdAt: new Date(),
			messages: [],
		}
		setSessions((prev) => [...prev, session])
		setCurrentSession(session)
	}

	const handleDelete = (sessionId: string) => {
		setSessions((prev) => prev.filter((s) => s.id !== sessionId))
		if (currentSession?.id === sessionId) {
			setCurrentSession(sorted.find((s) => s.id !== sessionId) || null)
		}
	}

	const handleSelect = (session: Session) => {
		setCurrentSession(session)
	}

	useEffect(() => {
		if (!currentSession && sorted.length > 0) {
			setCurrentSession(sorted[0])
		}
	}, [currentSession, sorted, setCurrentSession])

	useEffect(() => {
		setSessions((prev) =>
			prev.map((session) => {
				if (session.id === currentSession?.id) {
					const firstMessage = currentSession.messages.find((m) => m.role === 'user')
					const title = firstMessage ? firstMessage.text.slice(0, 40) : session.title
					return { ...currentSession, title: title || session.title }
				}
				return session
			})
		)
	}, [currentSession])

	return (
		<div className="border rounded-lg p-3 space-y-3">
			<div className="flex items-center justify-between gap-2">
				<div>
					<h2 className="text-sm font-semibold">Sessions</h2>
					<p className="text-xs text-gray-500">Switch between previous chats</p>
				</div>
				<button
					className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-500"
					onClick={handleNewChat}
				>
					New Chat
				</button>
			</div>
			<div className="max-h-64 overflow-y-auto space-y-2">
				{sorted.length === 0 ? (
					<p className="text-sm text-gray-500">No sessions yet.</p>
				) : (
					sorted.map((session) => (
						<div
							key={session.id}
							className={clsx(
								'flex items-center justify-between gap-2 rounded border px-2 py-1 cursor-pointer',
								currentSession?.id === session.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
							)}
							onClick={() => handleSelect(session)}
						>
							<div>
								<p className="text-sm font-medium truncate w-48">{session.title || 'Session'}</p>
								<p className="text-xs text-gray-500">{session.createdAt.toLocaleString()}</p>
							</div>
							<button
								className="text-xs text-red-500 hover:text-red-700"
								onClick={(e) => {
									e.stopPropagation()
									handleDelete(session.id)
								}}
							>
								Delete
							</button>
						</div>
					))
				)}
			</div>
		</div>
	)
}

