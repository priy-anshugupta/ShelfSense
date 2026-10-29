from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator

GenreType = Literal[
    '',
    'Fiction',
    'Fantasy',
    'Science fiction',
    'Mystery',
    'Technology',
    'Science',
    'Design',
    'Psychology',
    'History',
    'Personal growth',
    'Memoir',
    'Engineering',
    'Mathematics',
]

MoodType = Literal[
    '',
    'Adventurous',
    'Dark',
    'Emotional',
    'Funny',
    'Hopeful',
    'Mysterious',
    'Practical',
    'Reflective',
    'Suspenseful',
    'Thoughtful',
]

VALID_GENRES = {
    'fiction': 'Fiction',
    'fantasy': 'Fantasy',
    'science fiction': 'Science fiction',
    'sci-fi': 'Science fiction',
    'sci fi': 'Science fiction',
    'mystery': 'Mystery',
    'technology': 'Technology',
    'science': 'Science',
    'design': 'Design',
    'psychology': 'Psychology',
    'history': 'History',
    'personal growth': 'Personal growth',
    'memoir': 'Memoir',
    'engineering': 'Engineering',
    'mathematics': 'Mathematics',
}

VALID_MOODS = {
    'adventurous': 'Adventurous',
    'dark': 'Dark',
    'emotional': 'Emotional',
    'funny': 'Funny',
    'hopeful': 'Hopeful',
    'mysterious': 'Mysterious',
    'practical': 'Practical',
    'reflective': 'Reflective',
    'suspenseful': 'Suspenseful',
    'thoughtful': 'Thoughtful',
}

class Constraints(BaseModel):
    model_config = ConfigDict(extra='forbid')
    genre: GenreType = ''
    mood: MoodType = ''
    level: Literal['', 'Beginner', 'Intermediate', 'Advanced'] = ''
    mode: Literal['', 'fiction', 'learning', 'academic'] = ''
    subject: Literal['','computer science','mechanical engineering','electrical engineering','civil engineering','mathematics','physics'] = ''
    language: Literal['', 'eng', 'hin'] = ''
    branch: Literal['', 'Central Library', 'Study Annex'] = ''
    max_pages: int | None = Field(default=None, ge=1, le=10000)
    available_only: bool = False
    exclude_romance: bool = False

    @field_validator('genre', mode='before')
    @classmethod
    def normalize_genre(cls, v):
        if not v or not isinstance(v, str):
            return ''
        cleaned = v.strip().lower()
        return VALID_GENRES.get(cleaned, '')

    @field_validator('mood', mode='before')
    @classmethod
    def normalize_mood(cls, v):
        if not v or not isinstance(v, str):
            return ''
        cleaned = v.strip().lower()
        if cleaned in VALID_MOODS:
            return VALID_MOODS[cleaned]
        for k, val in VALID_MOODS.items():
            if k in cleaned:
                return val
        return ''
