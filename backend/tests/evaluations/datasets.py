"""Datasets for LangSmith evaluation of the CareerAgent."""

# ---------------------------------------------------------------------------
# 1. CV Parsing Evaluation Dataset
# ---------------------------------------------------------------------------
# Used to evaluate the `structure_cv` function's ability to extract and format.

CV_PARSING_EXAMPLES = [
    {
        "inputs": {
            "raw_text": (
                "John Doe\nSoftware Engineer\njohn.doe@email.com\n"
                "Summary: 5 years of experience in Python and React. Built scalable backend APIs.\n"
                "Experience: \n"
                "TechCorp (2020-Present)\n"
                "Senior Backend Engineer. Led migration to FastAPI.\n"
                "Education:\n"
                "B.S. Computer Science, University of Technology, 2019.\n"
                "Skills: Python, TypeScript, React, PostgreSQL.\n"
                "Languages: English, Spanish."
            )
        },
        "outputs": {
            "full_name": "John Doe",
            "skills_count_min": 4, # expecting at least 4 skills
            "has_experience": True,
            "has_education": True
        }
    }
]

# ---------------------------------------------------------------------------
# 2. Pipeline Scraper Mode (E2E) Dataset
# ---------------------------------------------------------------------------
# Used to evaluate the end-to-end graph when running in 'scraper' mode.
# We will mock the Tavily extraction in the test if needed, or let it fetch a real URL.
# For stability, we use a known reliable URL or mock the `extract_url` tool.

E2E_SCRAPER_EXAMPLES = [
    {
        "inputs": {
            "entry_mode": "scraper",
            # We'll use a mocked URL or a very stable one.
            # In testing, it's often better to mock the `extract_url` response,
            # but for true E2E we can use a dummy/test URL or Wikipedia page.
            "offer_url": "https://www.b12-consulting.com/jobs/senior-software-developer",
            "cv_profile": {
                "full_name": "Alice Developer",
                "summary": "Full stack engineer with 3 years of experience in React and Node.js.",
                "skills": ["JavaScript", "React", "Node.js", "TypeScript"],
                "experience": [],
                "education": [],
                "languages": []
            }
        },
        "outputs": {
            "expected_trajectory": ["router", "scraper", "matcher", "writer", "critic"],
            "requires_hitl2": True,
            "expected_theme": "software engineering"
        }
    }
]

def get_datasets():
    return {
        "cv_parsing": CV_PARSING_EXAMPLES,
        "e2e_scraper": E2E_SCRAPER_EXAMPLES
    }
