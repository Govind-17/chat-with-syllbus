import { render, screen, fireEvent } from '@testing-library/react'
import { ChatInterface } from './ChatInterface'

test('renders empty state and sends message on Enter', () => {
	const onSend = vi.fn()
	render(<ChatInterface messages={[]} onSend={onSend} />)

	expect(screen.getByText(/ask a question/i)).toBeInTheDocument()

	const textarea = screen.getByLabelText(/type your question/i)
	fireEvent.change(textarea, { target: { value: 'Hello' } })
	fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' })

	expect(onSend).toHaveBeenCalledWith('Hello')
})


