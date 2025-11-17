MCA_COURSES = {
	"sem1": [
		{"code": "MCA101", "name": "Programming Fundamentals", "credits": 4, "prereqs": []},
		{"code": "MCA102", "name": "Discrete Mathematics", "credits": 4, "prereqs": []},
		{"code": "MCA103", "name": "Computer Organization", "credits": 3, "prereqs": []},
	],
	"sem2": [
		{"code": "MCA201", "name": "Data Structures", "credits": 4, "prereqs": ["MCA101"]},
		{"code": "MCA202", "name": "Database Systems", "credits": 4, "prereqs": ["MCA101"]},
		{"code": "MCA203", "name": "Operating Systems", "credits": 3, "prereqs": ["MCA103"]},
	],
	"sem3": [
		{"code": "MCA301", "name": "Algorithm Design", "credits": 4, "prereqs": ["MCA201"]},
		{"code": "MCA302", "name": "Machine Learning", "credits": 4, "prereqs": ["MCA201", "MCA202"]},
		{"code": "MCA303", "name": "Web Technologies", "credits": 3, "prereqs": ["MCA201"]},
	],
	"sem4": [
		{"code": "MCA401", "name": "Cloud Computing", "credits": 4, "prereqs": ["MCA203", "MCA303"]},
		{"code": "MCA402", "name": "Advanced Databases", "credits": 3, "prereqs": ["MCA202"]},
		{"code": "MCA403", "name": "Data Analytics", "credits": 4, "prereqs": ["MCA302"]},
	],
}

SPECIALIZATIONS = {
	"ai": {
		"title": "Artificial Intelligence",
		"core": ["MCA302", "MCA403"],
		"recommended": ["MCA401", "MCA301"],
		"projects": ["Capstone in ML", "AI Research Seminar"],
	},
	"web": {
		"title": "Full Stack Web",
		"core": ["MCA303", "MCA401"],
		"recommended": ["MCA202", "MCA203"],
		"projects": ["Progressive Web App", "Cloud-native Services"],
	},
	"data_science": {
		"title": "Data Science",
		"core": ["MCA302", "MCA403"],
		"recommended": ["MCA202", "MCA402"],
		"projects": ["Analytics Pipeline", "Dashboarding Suite"],
	},
}

EXAM_PREP = {
	"theory": ["Summaries per module", "Flashcards for key definitions"],
	"practical": ["Daily coding drills", "Mini-labs for OS/DBMS"],
	"ml": ["Reproduce algorithms from scratch", "Explain model assumptions"],
}

CAREER_PATHS = {
	"web_developer": {
		"required": ["MCA303", "MCA401"],
		"nice_to_have": ["MCA202"],
		"roles": ["Front-end Engineer", "Full Stack Developer"],
	},
	"data_scientist": {
		"required": ["MCA302", "MCA403"],
		"nice_to_have": ["MCA401", "MCA402"],
		"roles": ["Data Scientist", "ML Engineer"],
	},
	"systems_engineer": {
		"required": ["MCA203", "MCA401"],
		"nice_to_have": ["MCA301"],
		"roles": ["DevOps Engineer", "Systems Analyst"],
	},
}

