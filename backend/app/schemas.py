from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

class Constraints(BaseModel):
    model_config = ConfigDict(extra='forbid')
    genre: str = Field(default='', max_length=60)
    mood: str = Field(default='', max_length=60)
    level: Literal['', 'Beginner', 'Intermediate', 'Advanced'] = ''
    mode: Literal['', 'fiction', 'learning', 'academic'] = ''
    subject: Literal['','computer science','mechanical engineering','electrical engineering','civil engineering','mathematics','physics'] = ''
    language: Literal['', 'eng', 'hin'] = ''
    branch: Literal['', 'Central Library', 'Study Annex'] = ''
    max_pages: int | None = Field(default=None, ge=1, le=10000)
    available_only: bool = False
    exclude_romance: bool = False
