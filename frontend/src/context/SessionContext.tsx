import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { AskResponse } from '../types'

type MessageRole = 'user' | 'assistant'
export interface StoredMessage {
	id: string
	role: MessageRole
	text: string
	ts: number
	sources?: AskResponse['sources']
	confidence?: number
}

type SessionState = {
	currentSessionId: string | null
	setCurrentSessionId: (id: string | null) => void
	getMessages: (sessionId: string) => StoredMessage[]
	setMessages: (sessionId: string, messages: StoredMessage[]) => void
	clearSession: (sessionId: string) => void
}

const SessionContext = createContext<SessionState | undefined>(undefined)

const STORAGE_KEY = 'mca_chat_sessions_v1'

type StorageShape = {
	currentSessionId: string | null
	messagesBySession: Record<string, StoredMessage[]>
}

function readStorage(): StorageShape {
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (!raw) return { currentSessionId: null, messagesBySession: {} }
		return JSON.parse(raw)
	} catch {
		return { currentSessionId: null, messagesBySession: {} }
	}
}

function writeStorage(data: StorageShape) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
	} catch {
		// ignore quota errors
	}
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
	const [currentSessionId, setCurrentSessionIdState] = useState<string | null>(null)
	const [messagesBySession, setMessagesBySession] = useState<Record<string, StoredMessage[]>>({})

	useEffect(() => {
		const data = readStorage()
		setCurrentSessionIdState(data.currentSessionId)
		setMessagesBySession(data.messagesBySession)
	}, [])

	useEffect(() => {
		writeStorage({ currentSessionId, messagesBySession })
	}, [currentSessionId, messagesBySession])

	const api: SessionState = useMemo(() => ({
		currentSessionId,
		setCurrentSessionId: (id) => setCurrentSessionIdState(id),
		getMessages: (sid) => messagesBySession[sid] ?? [],
		setMessages: (sid, msgs) => setMessagesBySession((prev) => ({ ...prev, [sid]: msgs })),
		clearSession: (sid) => setMessagesBySession((prev) => {
			const copy = { ...prev }
			delete copy[sid]
			return copy
		}),
	}), [currentSessionId, messagesBySession])

	return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>
}

export function useSession() {
	const ctx = useContext(SessionContext)
	if (!ctx) throw new Error('useSession must be used within SessionProvider')
	return ctx
}

