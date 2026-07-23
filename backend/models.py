from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: EmailStr

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class TreeSync(BaseModel):
    topics: list
    data: dict

class NoteSync(BaseModel):
    note_id: str
    content: str

class LeetCodeNote(BaseModel):
    problem_slug: str
    title: str
    subtopics: list = []
    note_content: Optional[str] = "" # Rich text content (HTML/JSON)
    code_snippet: Optional[str] = ""
    language: Optional[str] = "python"
    content_url: Optional[str] = None # S3 URL for large content
    images: list = [] # List of S3 URLs

class YoutubeNote(BaseModel):
    video_id: str
    video_title: Optional[str] = ""
    timestamp: float = 0.0
    note_content: str
    images: list = []

class CodeforcesNote(BaseModel):
    problem_id: str
    contest_id: str
    title: Optional[str] = ""
    note_content: str
    code_snippet: Optional[str] = ""
    language: Optional[str] = "cpp"
    images: list = []

class CompileRequest(BaseModel):
    code: str
    language: str
    stdin: Optional[str] = ""
