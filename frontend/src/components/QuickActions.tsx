type QuickActionsProps = {
	onSelect: (question: string) => void
	className?: string
}

type Category = {
	title: string
	items: string[]
}

const CATEGORIES: Category[] = [
	{
		title: 'Course Structure',
		items: ['Show me semester 1 subjects', 'List all core courses'],
	},
	{
		title: 'Grading',
		items: ['Explain grading system', 'Passing criteria'],
	},
	{
		title: 'Prerequisites',
		items: ['What do I need before Machine Learning?'],
	},
	{
		title: 'Career',
		items: ['Which courses for web development?', 'Data science subjects'],
	},
	{
		title: 'Administration',
		items: ['Exam patterns', 'Attendance requirements'],
	},
]

import React from 'react'

export const QuickActions = React.memo(function QuickActions({ onSelect, className }: QuickActionsProps) {
	return (
		<div className={`w-full ${className ?? ''}`}>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				{CATEGORIES.map((cat) => (
					<section key={cat.title} className="border rounded-lg p-3">
						<h3 className="text-sm font-semibold mb-2">{cat.title}</h3>
						<ul className="space-y-1">
							{cat.items.map((q) => (
								<li key={q}>
									<button
										type="button"
										className="text-left text-sm w-full px-2 py-1 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200"
										onClick={() => onSelect(q)}
										aria-label={`Use quick question: ${q}`}
									>
										{q}
									</button>
								</li>
							))}
						</ul>
					</section>
				))}
			</div>
		</div>
	)
})


