export type CourseNode = {
	code: string
	name: string
	credits: number
	prereqs: string[]
}

export type CourseGraphResponse = {
	nodes: CourseNode[]
	edges: { from: string; to: string }[]
}

export type CreditsRequest = {
	semesters: string[]
}

export type CreditsResponse = {
	total_credits: number
	breakdown: Record<string, number>
}

export type PrerequisiteResponse = {
	course: CourseNode
	missing_prereqs: string[]
}

export type SpecializationResponse = {
	specialization: string
	title: string
	core_courses: string[]
	recommended: string[]
	projects: string[]
}

export type ExamHelperResponse = {
	focus: string
	suggestions: string[]
}

export type CareerPathResponse = {
	matching_paths: Array<{
		id: string
		match: number
		roles: string[]
		missing: string[]
		recommended: string[]
	}>
}


