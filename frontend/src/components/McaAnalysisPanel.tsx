import { useEffect, useMemo, useState } from 'react'
import {
	getCourseGraph,
	calculateCredits,
	getPrerequisites,
	getSpecialization,
	getExamHelper,
	getCareerPaths,
} from '../services/api'
import type {
	CourseGraphResponse,
	CreditsResponse,
	PrerequisiteResponse,
	SpecializationResponse,
	ExamHelperResponse,
	CareerPathResponse,
} from '../types/analysis'
import toast from 'react-hot-toast'

const SEMESTERS = ['sem1', 'sem2', 'sem3', 'sem4']
const SPECIALIZATIONS = ['ai', 'web', 'data_science']
const EXAM_FOCUS = ['theory', 'practical', 'ml']

export function McaAnalysisPanel() {
	const [graph, setGraph] = useState<CourseGraphResponse | null>(null)
	const [credits, setCredits] = useState<CreditsResponse | null>(null)
	const [selectedSemesters, setSelectedSemesters] = useState<string[]>(['sem1'])
	const [courseCode, setCourseCode] = useState('MCA302')
	const [prereq, setPrereq] = useState<PrerequisiteResponse | null>(null)
	const [specialization, setSpecialization] = useState<SpecializationResponse | null>(null)
	const [specializationSlug, setSpecializationSlug] = useState('ai')
	const [examFocus, setExamFocus] = useState('theory')
	const [examPlan, setExamPlan] = useState<ExamHelperResponse | null>(null)
	const [careerCourses, setCareerCourses] = useState('MCA302, MCA403')
	const [careerPaths, setCareerPaths] = useState<CareerPathResponse | null>(null)

	useEffect(() => {
		getCourseGraph()
			.then(setGraph)
			.catch(() => toast.error('Failed to load course graph'))
	}, [])

	const totalNodes = graph?.nodes.length ?? 0
	const totalEdges = graph?.edges.length ?? 0

	const onSemToggle = (sem: string) => {
		setSelectedSemesters((curr) => (curr.includes(sem) ? curr.filter((s) => s !== sem) : [...curr, sem]))
	}

	const handleCredits = async () => {
		try {
			const res = await calculateCredits({ semesters: selectedSemesters })
			setCredits(res)
		} catch {
			toast.error('Failed to calculate credits')
		}
	}

	const handlePrereq = async () => {
		try {
			const res = await getPrerequisites(courseCode.trim())
			setPrereq(res)
		} catch (err: any) {
			toast.error(err?.message ?? 'Prerequisite lookup failed')
		}
	}

	const handleSpecialization = async () => {
		try {
			const res = await getSpecialization(specializationSlug)
			setSpecialization(res)
		} catch {
			toast.error('Specialization not found')
		}
	}

	const handleExamHelper = async () => {
		try {
			const res = await getExamHelper(examFocus)
			setExamPlan(res)
		} catch {
			toast.error('Exam helper failed')
		}
	}

	const handleCareerPath = async () => {
		const courses = careerCourses
			.split(',')
			.map((c) => c.trim().toUpperCase())
			.filter(Boolean)
		try {
			const res = await getCareerPaths(courses)
			setCareerPaths(res)
		} catch {
			toast.error('Career path mapping failed')
		}
	}

	const graphSummary = useMemo(() => ({ totalNodes, totalEdges }), [totalNodes, totalEdges])

	return (
		<div className="space-y-6">
			<section className="border rounded-lg p-4">
				<h3 className="font-semibold mb-1">Course Dependency Graph</h3>
				<p className="text-sm text-gray-600 mb-2">
					Nodes: {graphSummary.totalNodes} • Edges: {graphSummary.totalEdges}
				</p>
				<small className="text-xs text-gray-500">
					Use this to see which courses unlock advanced electives.
				</small>
			</section>

			<section className="border rounded-lg p-4 space-y-3">
				<h3 className="font-semibold">Credit Calculator</h3>
				<div className="flex flex-wrap gap-3">
					{SEMESTERS.map((sem) => (
						<label key={sem} className="text-sm flex items-center gap-1">
							<input type="checkbox" checked={selectedSemesters.includes(sem)} onChange={() => onSemToggle(sem)} />
							<span>{sem.toUpperCase()}</span>
						</label>
					))}
				</div>
				<button className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded" onClick={handleCredits}>
					Calculate
				</button>
				{credits && (
					<div className="text-sm text-gray-700">
						<p>Total Credits: {credits.total_credits}</p>
						<ul className="list-disc list-inside">
							{Object.entries(credits.breakdown).map(([sem, value]) => (
								<li key={sem}>{sem.toUpperCase()}: {value}</li>
							))}
						</ul>
					</div>
				)}
			</section>

			<section className="border rounded-lg p-4 space-y-2">
				<h3 className="font-semibold">Prerequisite Checker</h3>
				<div className="flex gap-2">
					<input className="border rounded px-2 py-1 flex-1" value={courseCode} onChange={(e) => setCourseCode(e.target.value)} />
					<button className="px-3 py-1.5 bg-blue-600 text-white rounded" onClick={handlePrereq}>Check</button>
				</div>
				{prereq && (
					<div className="text-sm text-gray-700">
						<p>{prereq.course.code} - {prereq.course.name}</p>
						<p>Prereqs: {prereq.course.prereqs.join(', ') || 'None'}</p>
						{prereq.missing_prereqs.length > 0 && <p className="text-red-600">Missing data for: {prereq.missing_prereqs.join(', ')}</p>}
					</div>
				)}
			</section>

			<section className="border rounded-lg p-4 space-y-2">
				<h3 className="font-semibold">Specialization Roadmap</h3>
				<select className="border rounded px-2 py-1" value={specializationSlug} onChange={(e) => setSpecializationSlug(e.target.value)}>
					{SPECIALIZATIONS.map((slug) => (
						<option key={slug} value={slug}>{slug}</option>
					))}
				</select>
				<button className="px-3 py-1.5 bg-blue-600 text-white rounded" onClick={handleSpecialization}>Generate</button>
				{specialization && (
					<div className="text-sm">
						<p className="font-medium">{specialization.title}</p>
						<p>Core: {specialization.core_courses.join(', ')}</p>
						<p>Recommended: {specialization.recommended.join(', ')}</p>
						<p>Projects: {specialization.projects.join(', ')}</p>
					</div>
				)}
			</section>

			<section className="border rounded-lg p-4 space-y-2">
				<h3 className="font-semibold">Exam Preparation Helper</h3>
				<select className="border rounded px-2 py-1" value={examFocus} onChange={(e) => setExamFocus(e.target.value)}>
					{EXAM_FOCUS.map((focus) => (
						<option key={focus} value={focus}>{focus}</option>
					))}
				</select>
				<button className="px-3 py-1.5 bg-blue-600 text-white rounded" onClick={handleExamHelper}>Generate tips</button>
				{examPlan && (
					<ul className="text-sm list-disc list-inside text-gray-700">
						{examPlan.suggestions.map((tip) => (
							<li key={tip}>{tip}</li>
						))}
					</ul>
				)}
			</section>

			<section className="border rounded-lg p-4 space-y-2">
				<h3 className="font-semibold">Career Path Mapper</h3>
				<textarea
					className="border rounded w-full px-2 py-1 text-sm"
					rows={3}
					value={careerCourses}
					onChange={(e) => setCareerCourses(e.target.value)}
					placeholder="Enter completed courses e.g., MCA302, MCA403"
				/>
				<button className="px-3 py-1.5 bg-blue-600 text-white rounded" onClick={handleCareerPath}>Map career paths</button>
				{careerPaths && (
					<div className="text-sm space-y-2">
						{careerPaths.matching_paths.map((path) => (
							<div key={path.id} className="border rounded px-2 py-1">
								<p className="font-medium">{path.id} — Match {Math.round(path.match * 100)}%</p>
								<p>Roles: {path.roles.join(', ')}</p>
								<p>Missing: {path.missing.join(', ') || 'None'}</p>
							</div>
						))}
					</div>
				)}
			</section>
		</div>
	)
}


