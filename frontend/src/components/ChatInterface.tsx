import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { AskResponse, SourceItem } from '../types'
import { motion, AnimatePresence } from 'framer-motion'

type MessageRole = 'user' | 'assistant'

export interface ChatMessage {
	id: string
	role: MessageRole
	text: string
	ts: number
	sources?: AskResponse['sources']
	confidence?: number
	confidenceExplanation?: string
	followUp?: string
}

interface ChatInterfaceProps {
	messages: ChatMessage[]
	onSend: (text: string) => void
	loading?: boolean
	className?: string
}

function formatTime(ts: number) {
	try {
		return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
	} catch {
		return ''
	}
}

export const ChatInterface = React.memo(function ChatInterface({ messages, onSend, loading, className }: ChatInterfaceProps) {
	const [input, setInput] = useState('')
	const endRef = useRef<HTMLDivElement | null>(null)
	const textareaRef = useRef<HTMLTextAreaElement | null>(null)

	// Auto-scroll to latest
	useEffect(() => {
		endRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages, loading])

	// Auto-resize textarea
	useEffect(() => {
		if (!textareaRef.current) return
		textareaRef.current.style.height = '0px'
		textareaRef.current.style.height = Math.min(Math.max(textareaRef.current.scrollHeight, 40), 180) + 'px'
	}, [input])

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		const isEnter = e.key === 'Enter'
		const withCtrl = e.ctrlKey || e.metaKey
		if ((isEnter && !e.shiftKey) || (isEnter && withCtrl)) {
			e.preventDefault()
			if (input.trim() && !loading) {
				onSend(input.trim())
				setInput('')
			}
		}
	}

	const handleSend = (e: React.FormEvent) => {
		e.preventDefault()
		if (input.trim() && !loading) {
			onSend(input.trim())
			setInput('')
		}
	}

	return (
		<div className={`flex flex-col h-full ${className ?? ''}`}>
			<div role="log" aria-live="polite" className="flex-1 overflow-auto p-4 space-y-3">
				{messages.length === 0 ? (
					<p className="text-sm text-gray-500">Ask a question about courses, credits, prerequisites, or grading.</p>
				) : (
					<AnimatePresence initial={false}>
						{messages.map((m) => (
							<motion.div
								key={m.id}
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -8 }}
								transition={{ duration: 0.15 }}
							>
								<MessageBubble message={m} />
							</motion.div>
						))}
					</AnimatePresence>
				)}
				{loading && <TypingIndicator />}
				<div ref={endRef} />
			</div>

			<form onSubmit={handleSend} className="border-t border-gray-200 p-3">
				<label htmlFor="message" className="sr-only">Message</label>
				<div className="flex gap-2 items-end">
					<textarea
						id="message"
						ref={textareaRef}
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Type your question (Shift+Enter for newline)…"
						className="flex-1 resize-none border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						aria-label="Type your question"
						disabled={!!loading}
						rows={1}
					/>
					<button
						type="submit"
						className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50 inline-flex items-center gap-2"
						disabled={!!loading || !input.trim()}
						aria-busy={!!loading}
						aria-label="Send message"
					>
						{loading && <Spinner className="w-4 h-4" />}
						Send
					</button>
				</div>
			</form>
		</div>
	)
})

function MessageBubble({ message }: { message: ChatMessage }) {
	const isUser = message.role === 'user'
	const container = isUser ? 'justify-end' : 'justify-start'
	const bubble = isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'

	return (
		<div className={`flex ${container}`}>
			<div className={`max-w-[85%] md:max-w-[70%] rounded px-3 py-2 ${bubble}`}>
				<div className="text-[11px] opacity-75 mb-1">{isUser ? 'You' : 'Assistant'} • {formatTime(message.ts)}</div>
				<div className="prose prose-sm max-w-none prose-invert:prose" data-testid="message-content">
					{isUser ? (
						<p className="whitespace-pre-wrap">{message.text}</p>
					) : (
						<ReactMarkdown className={!isUser ? 'prose prose-sm max-w-none' : ''}>{message.text}</ReactMarkdown>
					)}
				</div>
				{!isUser && (message.sources?.length ?? 0) > 0 && (
					<SourceCitations sources={message.sources ?? []} />
				)}
				{!isUser && typeof message.confidence === 'number' && (
					<div className="mt-2 text-[11px] opacity-75">Confidence: {(message.confidence * 100).toFixed(0)}%</div>
				)}
				{!isUser && message.confidenceExplanation && (
					<div className="text-[11px] opacity-75">{message.confidenceExplanation}</div>
				)}
				{!isUser && message.followUp && (
					<div className="mt-1 text-[11px] text-blue-200">Follow-up suggestion: {message.followUp}</div>
				)}
			</div>
		</div>
	)
}

function SourceCitations({ sources }: { sources: SourceItem[] }) {
	const [open, setOpen] = useState(false)
	const id = useMemo(() => `src-${Math.random().toString(36).slice(2)}`, [])
	return (
		<div className="mt-2">
			<button
				className="text-[12px] underline underline-offset-2"
				aria-expanded={open}
				aria-controls={id}
				onClick={() => setOpen((o) => !o)}
				type="button"
			>
				{open ? 'Hide' : 'Show'} sources ({sources.length})
			</button>
			<AnimatePresence initial={false}>
				{open && (
					<motion.div
						id={id}
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						className="mt-1 overflow-hidden"
					>
						<ul className="list-disc list-inside text-[12px] opacity-90">
							{sources.map((s) => (
								<li key={s.index}>
									{s.name}
									{s.page !== undefined ? ` (page ${s.page})` : ''}
									{s.score !== undefined ? ` • score ${s.score.toFixed(3)}` : ''}
								</li>
							))}
						</ul>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}

function Spinner({ className }: { className?: string }) {
	return <span className={`inline-block animate-spin rounded-full border-2 border-current border-r-transparent ${className ?? 'w-5 h-5'}`} aria-hidden="true" />
}

function TypingIndicator() {
	return (
		<div className="flex items-center gap-2 text-sm text-gray-500">
			<Spinner className="w-4 h-4" /> Assistant is typing…
		</div>
	)
}


