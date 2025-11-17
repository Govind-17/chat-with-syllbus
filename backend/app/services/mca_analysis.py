from typing import Dict, List, Tuple

from ..data.mca_catalog import MCA_COURSES, SPECIALIZATIONS, EXAM_PREP, CAREER_PATHS
from ..models.analysis import (
	CourseNode,
CourseGraphResponse,
CreditsResponse,
PrerequisiteResponse,
SpecializationResponse,
ExamHelperResponse,
CareerPathResponse,
)


def build_course_lookup() -> Dict[str, CourseNode]:
	lookup: Dict[str, CourseNode] = {}
	for sem_courses in MCA_COURSES.values():
		for course in sem_courses:
			lookup[course["code"]] = CourseNode(**course)
	return lookup


COURSE_LOOKUP = build_course_lookup()


def generate_course_graph() -> CourseGraphResponse:
	nodes = list(COURSE_LOOKUP.values())
	edges = []
	for node in nodes:
		for prereq in node.prereqs:
			if prereq in COURSE_LOOKUP:
				edges.append({"from": prereq, "to": node.code})
	return CourseGraphResponse(nodes=nodes, edges=edges)


def calculate_credits(semesters: List[str]) -> CreditsResponse:
	total = 0
	breakdown: Dict[str, int] = {}
	for sem in semesters:
		sem_lc = sem.lower()
		courses = MCA_COURSES.get(sem_lc, [])
		credits = sum(course["credits"] for course in courses)
		breakdown[sem_lc] = credits
		total += credits
	return CreditsResponse(total_credits=total, breakdown=breakdown)


def check_prerequisites(course_code: str) -> PrerequisiteResponse:
	course_code = course_code.upper()
	course = COURSE_LOOKUP.get(course_code)
	if not course:
		raise ValueError(f"Course {course_code} not found")
	missing = [c for c in course.prereqs if c not in COURSE_LOOKUP]
	return PrerequisiteResponse(course=course, missing_prereqs=missing)


def specialization_roadmap(slug: str) -> SpecializationResponse:
	slug = slug.lower()
	spec = SPECIALIZATIONS.get(slug)
	if not spec:
		raise ValueError(f"Specialization '{slug}' not available")
	return SpecializationResponse(
		specialization=slug,
		title=spec["title"],
		core_courses=spec["core"],
		recommended=spec["recommended"],
		projects=spec["projects"],
	)


def exam_helper(focus: str) -> ExamHelperResponse:
	focus_key = focus.lower()
	suggestions = EXAM_PREP.get(focus_key, EXAM_PREP["theory"])
	return ExamHelperResponse(focus=focus_key, suggestions=suggestions)


def map_career_paths(courses: List[str]) -> CareerPathResponse:
	completed = set(c.upper() for c in courses)
	matches: List[Dict[str, object]] = []
	for slug, path in CAREER_PATHS.items():
		required = set(path["required"])
		score = len(required.intersection(completed)) / max(len(required), 1)
		matches.append(
			{
				"id": slug,
				"match": round(score, 2),
				"roles": path["roles"],
				"missing": list(required - completed),
				"recommended": path["nice_to_have"],
			}
		)
	matches.sort(key=lambda m: m["match"], reverse=True)
	return CareerPathResponse(matching_paths=matches)


