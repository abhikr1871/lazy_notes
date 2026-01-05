from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services.ai_service import AIService

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

@app.get("/")
def health_check():
    return {"status": "ok", "message": "IntelliAsk AI Backend is running"}

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
