from typing import List, Dict, Optional
from pydantic import BaseModel, Field


class CourseNode(BaseModel):
	code: str
	name: str
	credits: int
	prereqs: List[str]


class CourseGraphResponse(BaseModel):
	nodes: List[CourseNode]
	edges: List[Dict[str, str]]


class CreditsRequest(BaseModel):
	semesters: List[str] = Field(..., description="Semesters to include, e.g., ['sem1','sem2']")


class CreditsResponse(BaseModel):
	total_credits: int
	breakdown: Dict[str, int]


class PrerequisiteResponse(BaseModel):
	course: CourseNode
	missing_prereqs: List[str]


class SpecializationResponse(BaseModel):
	specialization: str
	title: str
	core_courses: List[str]
	recommended: List[str]
	projects: List[str]


class ExamHelperResponse(BaseModel):
	focus: str
	suggestions: List[str]


class CareerPathRequest(BaseModel):
	completed_courses: List[str] = Field(default_factory=list)
	preferred_roles: Optional[List[str]] = None


class CareerPathResponse(BaseModel):
	matching_paths: List[Dict[str, object]]


