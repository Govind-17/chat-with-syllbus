import { useState } from 'react'
import { chatWithSyllabus } from '../services/api'

export function ChatBox() {
	const [message, setMessage] = useState('')
	const [answer, setAnswer] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)
		setError(null)
		setAnswer(null)
		try {
			const res = await chatWithSyllabus(message)
			setAnswer(res.answer)
		} catch (err: any) {
			setError(err?.message ?? 'Request failed')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div>
			<form onSubmit={onSubmit} style={{ display: 'flex', gap: 8 }}>
				<input
					type="text"
					placeholder="Ask about the MCA syllabus..."
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					style={{ flexGrow: 1, padding: 8 }}
					required
				/>
				<button type="submit" disabled={loading || !message.trim()}>
					{loading ? 'Asking...' : 'Ask'}
				</button>
			</form>
			{error && <p style={{ color: 'red', marginTop: 12 }}>{error}</p>}
			{answer && (
				<div style={{ marginTop: 16, padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
					<strong>Answer:</strong>
					<p style={{ whiteSpace: 'pre-wrap' }}>{answer}</p>
				</div>
			)}
		</div>
	)
}


