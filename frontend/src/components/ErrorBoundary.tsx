import React from 'react'

type Props = {
	children: React.ReactNode
	fallback?: React.ReactNode
}

type State = {
	hasError: boolean
	error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error }
	}

	componentDidCatch(error: Error, info: React.ErrorInfo) {
		console.error('ErrorBoundary caught error', error, info)
	}

	render() {
		if (this.state.hasError) {
			return (
				this.props.fallback ?? (
					<div className="p-4 border border-red-300 bg-red-50 text-red-700 rounded">
						<p className="font-medium">Something went wrong.</p>
						<p className="text-sm mt-1">{this.state.error?.message}</p>
						<button className="mt-3 px-3 py-1.5 bg-red-600 text-white rounded" onClick={() => location.reload()}>
							Reload
						</button>
					</div>
				)
			)
		}
		return this.props.children
	}
}


