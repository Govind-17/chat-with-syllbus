import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listDocuments, listSessions } from '../services/api'
import type { DocumentItem, SessionInfo } from '../types'

type SidebarProps = {
	currentSessionId?: string | null
	onNewSession: () => void
	onSelectSession: (sessionId: string) => void
	onQuickAction: (prompt: string) => void
	className?: string
}

import React from 'react'

export const Sidebar = React.memo(function Sidebar({ currentSessionId, onNewSession, onSelectSession, onQuickAction, className }: SidebarProps) {
	const [open, setOpen] = useState<boolean>(true)

	// Sessions
	const sessionsQuery = useQuery<SessionInfo[]>({
		queryKey: ['sessions'],
		queryFn: async () => await listSessions(),
		refetchOnWindowFocus: false,
	})

	// Documents (for stats)
	const documentsQuery = useQuery<{ documents: DocumentItem[]}>({
		queryKey: ['documents'],
		queryFn: async () => await listDocuments(),
		refetchInterval: 5000,
	})

	const docStats = useMemo(() => {
		const docs = documentsQuery.data?.documents ?? []
		const total = docs.length
		const completed = docs.filter(d => d.status === 'completed').length
		const processing = docs.filter(d => d.status === 'processing' || d.status === 'uploaded').length
		const chunks = docs.reduce((sum, d) => sum + (typeof d.chunks === 'number' ? d.chunks : 0), 0)
		return { total, completed, processing, chunks }
	}, [documentsQuery.data])

	// Auto-collapse on small screens initially
	useEffect(() => {
		if (typeof window !== 'undefined' && window.innerWidth < 768) {
			setOpen(false)
		}
	}, [])

	return (
		<aside className={`border-r border-gray-200 flex flex-col ${open ? 'w-72' : 'w-12'} transition-all ${className ?? ''}`}>
			<div className="p-3 flex items-center justify-between gap-2 border-b border-gray-200">
				<button
					aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
					className="px-2 py-1 text-sm rounded border hover:bg-gray-50"
					onClick={() => setOpen(o => !o)}
				>
					{open ? '⟨' : '⟩'}
				</button>
				{open && (
					<button
						className="px-2 py-1 text-sm rounded bg-blue-600 text-white"
						onClick={onNewSession}
					>
						New chat
					</button>
				)}
			</div>

			{open && (
				<div className="flex-1 overflow-auto p-3 space-y-6">
					<section>
						<h3 className="text-sm font-semibold mb-2">Sessions</h3>
						{sessionsQuery.isLoading ? (
							<p className="text-xs text-gray-500">Loading…</p>
						) : (sessionsQuery.data ?? []).length === 0 ? (
							<p className="text-xs text-gray-500">No sessions yet.</p>
						) : (
							<ul className="space-y-1">
								{(sessionsQuery.data ?? []).map((s) => (
									<li key={s.session_id}>
										<button
											className={`w-full text-left px-2 py-1 rounded ${currentSessionId === s.session_id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
											onClick={() => onSelectSession(s.session_id)}
										>
											<div className="text-sm font-medium truncate">
												{/* Auto-title placeholder based on id; the real title can be derived from first message externally */}
												Session {s.session_id.slice(0, 8)}…
											</div>
											<div className="text-[11px] text-gray-500">{s.message_count} messages</div>
										</button>
									</li>
								))}
							</ul>
						)}
					</section>

					<section>
						<h3 className="text-sm font-semibold mb-2">Quick actions</h3>
						<div className="grid grid-cols-1 gap-2">
							<button className="text-left text-sm px-2 py-1 rounded border hover:bg-gray-50"
								onClick={() => onQuickAction('What is the MCA course structure by semester and credits?')}>
								Course structure
							</button>
							<button className="text-left text-sm px-2 py-1 rounded border hover:bg-gray-50"
								onClick={() => onQuickAction('Explain the MCA grading system including internal assessment and end-semester exam weightage.')}>
								Grading system
							</button>
							<button className="text-left text-sm px-2 py-1 rounded border hover:bg-gray-50"
								onClick={() => onQuickAction('What prerequisites or assumed knowledge are needed for MCA?')}>
								Prerequisites
							</button>
							<button className="text-left text-sm px-2 py-1 rounded border hover:bg-gray-50"
								onClick={() => onQuickAction('What career paths and roles align with the MCA syllabus?')}>
								Career guidance
							</button>
						</div>
					</section>

					<section>
						<h3 className="text-sm font-semibold mb-2">Document stats</h3>
						<div className="text-xs text-gray-700 space-y-1">
							<p>Total: {docStats.total}</p>
							<p>Completed: {docStats.completed}</p>
							<p>Processing: {docStats.processing}</p>
							<p>Chunks indexed: {docStats.chunks}</p>
						</div>
					</section>

					<section>
						<h3 className="text-sm font-semibold mb-2">Tips</h3>
						<ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
							<li>Upload official syllabus PDFs for best results.</li>
							<li>Ask specific questions about modules or credits.</li>
							<li>Mention semester and course names if possible.</li>
						</ul>
					</section>
				</div>
			)}
		</aside>
	)
})


