from fastapi import APIRouter, HTTPException
from ..models.analysis import (
	CreditsRequest,
	CreditsResponse,
	CareerPathRequest,
	CareerPathResponse,
	CourseGraphResponse,
	PrerequisiteResponse,
	SpecializationResponse,
	ExamHelperResponse,
)
from ..services import mca_analysis as svc

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.get("/course-graph", response_model=CourseGraphResponse)
def course_graph():
	return svc.generate_course_graph()


@router.post("/credits", response_model=CreditsResponse)
def credits(req: CreditsRequest):
	return svc.calculate_credits(req.semesters)


@router.get("/prerequisites/{course_code}", response_model=PrerequisiteResponse)
def prerequisites(course_code: str):
	try:
		return svc.check_prerequisites(course_code)
	except ValueError as exc:
		raise HTTPException(status_code=404, detail=str(exc))


@router.get("/specializations/{slug}", response_model=SpecializationResponse)
def specialization(slug: str):
	try:
		return svc.specialization_roadmap(slug)
	except ValueError as exc:
		raise HTTPException(status_code=404, detail=str(exc))


@router.get("/exam-helper", response_model=ExamHelperResponse)
def exam_helper(focus: str = "theory"):
	return svc.exam_helper(focus)


@router.post("/career-path", response_model=CareerPathResponse)
def career_path(req: CareerPathRequest):
	return svc.map_career_paths(req.completed_courses)

