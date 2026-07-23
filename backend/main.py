from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services.ai_service import AIService
# from ai_service import AIService
from auth import get_password_hash, verify_password, create_access_token, get_current_user, get_optional_user, ACCESS_TOKEN_EXPIRE_MINUTES
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from datetime import timedelta
from database import users_collection, trees_collection, notes_collection, leetcode_collection, youtube_collection, codeforces_collection
from models import UserCreate, UserLogin, Token, TreeSync, NoteSync, LeetCodeNote, YoutubeNote, CodeforcesNote, CompileRequest
from services.s3_service import S3Service
import uuid
import httpx

app = FastAPI(title="IntelliAsk AI Backend")

# Allow all origins for extension development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ai_service = AIService()
s3_service = S3Service()
s3_service.check_connection()

@app.get("/")
def health_check():
    return {"status": "ok", "message": "IntelliAsk AI Backend is running"}

@app.post("/upload/image")
async def upload_image(file: UploadFile = File(...)):
    # Generate unique filename
    extension = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{extension}"
    
    url = s3_service.upload_file(file, unique_filename)
    if not url:
        raise HTTPException(status_code=500, detail="Failed to upload image")
        
    return {"url": url}

# --- Cloud Sync Routes ---

@app.post("/leetcode/tree")
async def sync_tree(tree: TreeSync, current_user = Depends(get_current_user)):
    user_id = current_user["username"] # Using username as ID for simplicity
    trees_collection.update_one(
        {"user_id": user_id},
        {"$set": {"topics": tree.topics, "data": tree.data}},
        upsert=True
    )
    return {"status": "synced"}

@app.get("/leetcode/tree")
async def get_tree(current_user = Depends(get_current_user)):
    user_id = current_user["username"]
    doc = trees_collection.find_one({"user_id": user_id})
    if doc:
        # Convert _id to str if needed or just exclude it
        doc.pop("_id", None)
        return doc
    return {"topics": [], "data": {}}

@app.post("/leetcode/save")
async def save_leetcode_note(note: LeetCodeNote, current_user = Depends(get_current_user)):
    user_id = current_user["username"]
    
    # 1. Update Metadata in MongoDB
    # We store the main structured data in Mongo
    note_dict = note.dict(exclude={"content_url"}) # Start with all fields
    
    # 2. Upload Rich Content to S3 if present and large (or always if policy dictates)
    # For this implementation, we'll assume note_content IS the rich text.
    # If users want to offload heavy HTML/JSON to S3:
    if len(note.note_content) > 100000: # Example threshold
         # Upload to S3 logic (requires content to be file-like)
         # For now, we'll keep it simple and store text in Mongo unless user explicitly sends content_url?
         # Actually, the user asked to use S3 for images/notes. 
         # Let's assume images are uploaded via /upload/image and URLs are stored in note_content.
         pass

    # Upsert into MongoDB
    leetcode_collection.update_one(
        {"user_id": user_id, "problem_slug": note.problem_slug},
        {"$set": {
            "title": note.title,
            "subtopics": note.subtopics,
            "note_content": note.note_content,
            "code_snippet": note.code_snippet,
            "language": note.language,
            "images": note.images,
            "updated_at": uuid.uuid4().hex # rudimentary timestamp/version
        }},
        upsert=True
    )
    return {"status": "saved", "slug": note.problem_slug}

@app.post("/leetcode/tree")
async def sync_leetcode_tree(tree: TreeSync, current_user = Depends(get_current_user)):
    user_id = current_user["username"]
    # Store tree structure in the same collection but with a special flag/ID
    leetcode_collection.update_one(
        {"user_id": user_id, "type": "tree"}, 
        {"$set": {
            "topics": tree.topics,
            "data": tree.data,
            "updated_at": uuid.uuid4().hex
        }},
        upsert=True
    )
    return {"status": "saved"}

@app.get("/leetcode/tree")
async def get_leetcode_tree(current_user = Depends(get_current_user)):
    user_id = current_user["username"]
    doc = leetcode_collection.find_one({"user_id": user_id, "type": "tree"})
    if doc:
        return {"topics": doc.get("topics", []), "data": doc.get("data", {})}
    return {"topics": [], "data": {}}

@app.get("/leetcode/all")
async def get_all_leetcode_notes(current_user = Depends(get_current_user)):
    user_id = current_user["username"]
    cursor = leetcode_collection.find({"user_id": user_id}, {"_id": 0, "title": 1, "problem_slug": 1, "subtopics": 1})
    notes = list(cursor)
    return {"notes": notes}

@app.get("/leetcode/{problem_slug}")
async def get_leetcode_note(problem_slug: str, current_user = Depends(get_current_user)):
    user_id = current_user["username"]
    doc = leetcode_collection.find_one({"user_id": user_id, "problem_slug": problem_slug})
    
    if doc:
        doc.pop("_id", None)
        return doc
    
    return {"found": False}

# --- YouTube Endpoints ---
@app.post("/youtube/save")
async def save_youtube_note(note: YoutubeNote, current_user = Depends(get_current_user)):
    user_id = current_user["username"]
    youtube_collection.update_one(
        {"user_id": user_id, "video_id": note.video_id},
        {"$set": {
            "video_title": note.video_title,
            "timestamp": note.timestamp,
            "note_content": note.note_content,
            "images": note.images,
            "updated_at": uuid.uuid4().hex
        }},
        upsert=True
    )
    return {"status": "saved", "id": note.video_id}

@app.get("/youtube/{video_id}")
async def get_youtube_note(video_id: str, current_user = Depends(get_current_user)):
    user_id = current_user["username"]
    doc = youtube_collection.find_one({"user_id": user_id, "video_id": video_id})
    if doc:
        doc.pop("_id", None)
        return doc
    return {"found": False}

# --- Codeforces Endpoints ---
@app.post("/codeforces/save")
async def save_codeforces_note(note: CodeforcesNote, current_user = Depends(get_current_user)):
    user_id = current_user["username"]
    codeforces_collection.update_one(
        {"user_id": user_id, "problem_id": note.problem_id},
        {"$set": {
             "contest_id": note.contest_id,
             "title": note.title,
             "note_content": note.note_content,
             "code_snippet": note.code_snippet,
             "language": note.language,
             "images": note.images,
             "updated_at": uuid.uuid4().hex
        }},
        upsert=True
    )
    return {"status": "saved", "id": note.problem_id}

@app.post("/codeforces/tree")
async def sync_codeforces_tree(tree: TreeSync, current_user = Depends(get_current_user)):
    user_id = current_user["username"]
    # Store tree structure in the same collection but with a special flag/ID
    codeforces_collection.update_one(
        {"user_id": user_id, "type": "tree"}, 
        {"$set": {
            "topics": tree.topics,
            "data": tree.data,
            "updated_at": uuid.uuid4().hex
        }},
        upsert=True
    )
    return {"status": "saved"}

@app.get("/codeforces/tree")
async def get_codeforces_tree(current_user = Depends(get_current_user)):
    user_id = current_user["username"]
    doc = codeforces_collection.find_one({"user_id": user_id, "type": "tree"})
    if doc:
        return {"topics": doc.get("topics", []), "data": doc.get("data", {})}
    return {"topics": [], "data": {}}

@app.get("/codeforces/{problem_id}")
async def get_codeforces_note(problem_id: str, current_user = Depends(get_current_user)):
    user_id = current_user["username"]
    doc = codeforces_collection.find_one({"user_id": user_id, "problem_id": problem_id})
    if doc:
        doc.pop("_id", None)
        return doc
    return {"found": False}

@app.post("/compile")
async def compile_code(req: CompileRequest, current_user = Depends(get_current_user)):
    jdoodle_url = "https://api.jdoodle.com/v1/execute"
    
    # Map frontend language selection to JDoodle's expected identifiers
    lang_map = {
        "cpp": {"language": "cpp17", "versionIndex": "1"}, # C++ 17
        "python": {"language": "python3", "versionIndex": "4"}, # Python 3.9
        "java": {"language": "java", "versionIndex": "4"}, # Java 17
        "js": {"language": "nodejs", "versionIndex": "4"} # Node 17
    }
    
    selected_lang = lang_map.get(req.language)
    if not selected_lang:
        raise HTTPException(status_code=400, detail="Unsupported language")

    payload = {
        "clientId": "3c10f91d79243652f5286cf82d99def6",
        "clientSecret": "61c0d712df756c921bbad9969105c0b99037bb70578ed93aae1532a702399e09",
        "script": req.code,
        "stdin": req.stdin or "",
        "language": selected_lang["language"],
        "versionIndex": selected_lang["versionIndex"]
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(jdoodle_url, json=payload, timeout=20.0)
            response.raise_for_status()
            jdoodle_res = response.json()
            
            # JDoodle response mapping
            # { "output": "...", "statusCode": 200, "memory": "...", "cpuTime": "..." }
            # Our UI expects: { run: { stdout: "...", stderr: "..." }, compile: { output: "..." } }
            stdout = jdoodle_res.get("output", "")
            stderr = ""
            
            # JDoodle puts runtime errors or compilation errors directly in "output"
            # It's hard to distinguish perfectly without checking strings, but we can pass it as stdout
            # If the status code indicates an error (not strictly HTTP, but internal), handling varies.
            
            return {
                "run": {
                    "stdout": stdout,
                    "stderr": stderr
                },
                "compile": {
                    "output": "" # JDoodle doesn't cleanly separate this in free tier response
                }
            }
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"Compilation service error: {str(e)}")

@app.post("/notes")
async def sync_note(note: NoteSync, current_user = Depends(get_current_user)):
    user_id = current_user["username"]
    notes_collection.update_one(
        {"user_id": user_id, "note_id": note.note_id},
        {"$set": {"content": note.content}},
        upsert=True
    )
    return {"status": "saved"}

@app.get("/notes/{note_id}")
async def get_note(note_id: str, current_user = Depends(get_current_user)):
    user_id = current_user["username"]
    doc = notes_collection.find_one({"user_id": user_id, "note_id": note_id})
    if doc:
        return {"content": doc["content"]}
    return {"content": None}

@app.post("/summarize")
async def summarize(request: dict, current_user = Depends(get_optional_user)):
    text = request.get("text", "")
    summary = ai_service.summarize_text(text)
    return {"summary": summary}

@app.post("/explain")
async def explain(request: dict, current_user = Depends(get_optional_user)):
    title = request.get("title", "")
    description = request.get("description", "")
    code = request.get("code", "")
    platform = request.get("platform", "Coding Platform")
    language = request.get("language", "")
    
    explanation = ai_service.explain_problem(
        title=title,
        description=description,
        code=code,
        platform=platform,
        language=language
    )
    return {"explanation": explanation}

@app.post("/chat")
async def chat(request: dict, current_user = Depends(get_optional_user)):
    title = request.get("title", "")
    history = request.get("history", [])
    message = request.get("message", "")
    code = request.get("code", "")
    platform = request.get("platform", "Coding Platform")
    language = request.get("language", "python")

    reply = ai_service.chat_followup(
        title=title,
        history=history,
        message=message,
        code=code,
        platform=platform,
        language=language
    )
    return {"reply": reply}

@app.post("/analyze-error")
async def analyze_error(request: dict, current_user = Depends(get_optional_user)):
    title = request.get("title", "")
    code = request.get("code", "")
    error_msg = request.get("error_msg", "")
    input_data = request.get("input_data", "")
    expected = request.get("expected", "")
    actual = request.get("actual", "")
    platform = request.get("platform", "Coding Platform")
    language = request.get("language", "python")

    analysis = ai_service.analyze_error(
        title=title,
        code=code,
        error_msg=error_msg,
        input_data=input_data,
        expected=expected,
        actual=actual,
        platform=platform,
        language=language
    )
    return {"analysis": analysis}

@app.post("/generate-flashcard")
async def generate_flashcard(request: dict, current_user = Depends(get_optional_user)):
    title = request.get("title", "")
    platform = request.get("platform", "Coding Platform")
    explanation = request.get("explanation", "")

    flashcards = ai_service.generate_flashcards(
        title=title,
        platform=platform,
        explanation=explanation
    )
    return {"flashcards": flashcards}

@app.post("/register", response_model=Token)
async def register(user: UserCreate):
    # Check if user exists
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    if users_collection.find_one({"username": user.username}):
        raise HTTPException(status_code=400, detail="Username already taken")
    
    hashed_password = get_password_hash(user.password)
    user_dict = {
        "username": user.username,
        "email": user.email,
        "password": hashed_password
    }
    
    try:
        users_collection.insert_one(user_dict)
    except DuplicateKeyError:
         raise HTTPException(status_code=400, detail="User already exists")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/login", response_model=Token)
async def login(user: UserLogin):
    db_user = users_collection.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not verify_password(user.password, db_user["password"]):
         raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user["username"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me")
async def read_users_me(current_user = Depends(get_current_user)):
    return {"username": current_user["username"], "email": current_user["email"]}

