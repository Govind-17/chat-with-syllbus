import { http } from './http'
import { askQuestion } from './api'
import { afterEach, vi } from 'vitest'

vi.mock('./http', () => {
	const post = vi.fn().mockResolvedValue({ data: { answer: 'ok', sources: [], confidence: 0.9, session_id: 's' } })
	return { http: { post } }
})

afterEach(() => {
	vi.clearAllMocks()
})

test('askQuestion posts to /chat/ask', async () => {
	const res = await askQuestion('Hi')
	expect(res.answer).toBe('ok')
})


