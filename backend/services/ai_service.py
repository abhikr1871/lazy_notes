import os
# from dotenv import load_dotenv

# load_dotenv()

class AIService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY") # Or OpenAI
        # Initialize clients here
        
    def summarize_text(self, text: str):
        # TODO: Implement actual AI call
        return f"Summary placeholder for: {text[:50]}..."

    def explain_text(self, text: str):
        # TODO: Implement actual AI call
        return f"Explanation placeholder for: {text[:50]}..."
