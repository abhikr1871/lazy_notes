from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services.ai_service import AIService
# from ai_service import AIService
from auth import get_password_hash, verify_password, create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from datetime import timedelta
from database import users_collection, trees_collection, notes_collection
from models import UserCreate, UserLogin, Token, TreeSync, NoteSync
from services.s3_service import S3Service
import uuid

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
def summarize():
    return {"message": "Summarize endpoint not implemented yet"}

@app.post("/explain")
def explain():
    return {"message": "Explain endpoint not implemented yet"}

@app.post("/chat")
async def chat(request: dict):
    # Basic echo for now, or use AIService
    user_message = request.get("message", "")
    context = request.get("context", "")
    
    # Placeholder response
    ai_response = f"Simulated AI Response to: '{user_message}' with context length {len(context)}"
    
    # Use real service if implemented
    # ai_response = ai_service.chat(user_message, context)
    
    return {"reply": ai_response}

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

