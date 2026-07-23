import os

class AIService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")

    def _generate_with_gemini(self, prompt: str) -> str:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return None

        model_candidates = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.0-flash']

        # 1. Try new google.genai SDK
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            for m in model_candidates:
                try:
                    response = client.models.generate_content(
                        model=m,
                        contents=prompt,
                    )
                    if response and response.text:
                        return response.text
                except Exception as ex:
                    print(f"genai SDK model {m} failed: {ex}")
                    continue
        except Exception as e:
            pass

        # 2. Fallback to legacy google.generativeai SDK
        try:
            import google.generativeai as legacy_genai
            legacy_genai.configure(api_key=api_key)
            for m in model_candidates:
                try:
                    model = legacy_genai.GenerativeModel(m)
                    response = model.generate_content(prompt)
                    if response and response.text:
                        return response.text
                except Exception as ex:
                    print(f"legacy_genai SDK model {m} failed: {ex}")
                    continue
        except Exception as e:
            raise Exception(f"Gemini Call Failed: {str(e)}")

        raise Exception("All Gemini model variants failed. Please check your GEMINI_API_KEY in backend/.env")

    def explain_problem(self, title: str, description: str = "", code: str = "", platform: str = "Coding Platform", language: str = "python") -> str:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return (
                "⚠️ **Gemini API Key missing or unconfigured**\n\n"
                "Please set `GEMINI_API_KEY` in your backend `.env` file to enable AI Explainer.\n"
                "You can get a free API key at [Google AI Studio](https://aistudio.google.com/)."
            )

        has_code = bool(code and code.strip())
        target_lang = language.strip() if language and language.strip() else "python"

        prompt = f"""You are an expert Competitive Programming and DSA tutor.
Provide a comprehensive AI breakdown and code analysis for the following problem on {platform}.

Problem Title: {title}
Target Solution Language: {target_lang}
{f'Problem Description / Context: {description}' if description else ''}
{f'User Current Code ({target_lang}):\n```\n{code}\n```' if has_code else 'User Code: (No custom solution code provided)'}

CRITICAL FORMATTING RULES:
- DO NOT use LaTeX math symbols or dollar signs ($). Do NOT write $N$, \\mathcal{{O}}(N), \\cdot, or $4^N$. Write clean plain text like O(N), O(N * 4^N), N, 4^N, etc.
- At the very end, provide the complete, clean, working solution code in {target_lang} inside a code block under heading "### 💻 5. Solution Code".

Format your response using clean Markdown with these exact headings:

### 💡 1. Problem Intuition & Core Concept
(Explain the problem in simple terms and identify the underlying DSA pattern e.g. Dynamic Programming, Two Pointers, BFS, etc.)

### ⚙️ 2. Optimal Solution & Step-by-Step Approach
(Break down the optimal solution logic clearly and step-by-step)

### 🔍 3. Code & Approach Flaw Analysis
{ '(Critique the user code snippet above. Detail logical bugs, edge cases missed, syntax errors, time/space inefficiencies, or potential failure points.)' if has_code else '(Explain the most common mistakes, wrong assumptions, and subtle edge cases candidates make on this problem.)' }

### ⏱️ 4. Complexity Analysis
- **Time Complexity:** O(...) - explanation
- **Space Complexity:** O(...) - explanation

### 💻 5. Solution Code ({target_lang})
```{target_lang}
// Provide clean, optimal, well-commented working code here in {target_lang}
```
"""

        try:
            res = self._generate_with_gemini(prompt)
            return res if res else "❌ No response received from Gemini AI."
        except Exception as e:
            return f"❌ **AI Explanation Error:** {str(e)}"

    def summarize_text(self, text: str) -> str:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return "⚠️ Gemini API key not configured."

        prompt = f"Summarize the following notes into 3 to 5 clear, actionable bullet points:\n\n{text}"
        try:
            res = self._generate_with_gemini(prompt)
            return res if res else "❌ Summary generation failed."
        except Exception as e:
            return f"❌ Error summarizing: {str(e)}"

    def chat_followup(self, title: str, history: list, message: str, code: str = "", platform: str = "Coding Platform", language: str = "python") -> str:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return "⚠️ Gemini API key not configured."

        formatted_history = ""
        if history:
            for item in history[-6:]:
                role = "User" if item.get("role") == "user" else "AI Assistant"
                formatted_history += f"{role}: {item.get('content', '')}\n"

        prompt = f"""You are an expert DSA & Competitive Programming AI Tutor helping a student on {platform}.
Problem Title: {title}
Programming Language: {language}
{f'Student Code:\n```\n{code}\n```' if code else ''}

{f'Previous Conversation History:\n{formatted_history}' if formatted_history else ''}

Student's New Question: {message}

Instructions:
- Answer the student's question clearly, concisely, and educationally.
- Do NOT use LaTeX or dollar signs ($). Use plain text like O(N), 4^N, etc.
- Format code in clean markdown code blocks.
"""
        try:
            res = self._generate_with_gemini(prompt)
            return res if res else "❌ No response received from Gemini."
        except Exception as e:
            return f"❌ Error: {str(e)}"

    def analyze_error(self, title: str, code: str, error_msg: str = "", input_data: str = "", expected: str = "", actual: str = "", platform: str = "Coding Platform", language: str = "python") -> str:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return "⚠️ Gemini API key not configured."

        prompt = f"""You are an expert Competitive Programming debugger.
Analyze why the user's code failed on {platform} for the problem: "{title}".

User Code ({language}):
```
{code}
```

Failure Context / Error Details:
{f'- Error / Exception Message: {error_msg}' if error_msg else ''}
{f'- Failing Input Test Case: {input_data}' if input_data else ''}
{f'- Expected Output: {expected}' if expected else ''}
{f'- Actual Output Produced: {actual}' if actual else ''}

CRITICAL RULES:
- Do NOT use LaTeX math or dollar signs ($). Write plain text (e.g. O(N), 4^N).

Provide a structured, clean diagnosis with these exact headings:

### 🐞 1. Root Cause of Failure
(Explain precisely why the code produced an error or wrong answer on this input)

### 💡 2. Edge Case / Logic Correction
(Point out the missing condition, off-by-one error, overflow, or logic bug)

### 🛠️ 3. Fixed Code Snippet
```{language}
// Provide the corrected code fixing the failure
```
"""
        try:
            res = self._generate_with_gemini(prompt)
            return res if res else "❌ No analysis received from Gemini."
        except Exception as e:
            return f"❌ Error analyzing failure: {str(e)}"

    def generate_flashcards(self, title: str, platform: str = "Coding Platform", explanation: str = "") -> str:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return "⚠️ Gemini API key not configured."

        prompt = f"""You are a senior Software Engineer & Interview Coach.
Create 3 high-impact, easy-to-remember flashcards for revision before technical interviews for problem: "{title}" on {platform}.

Context:
{explanation[:1000] if explanation else ''}

Rules:
- Do NOT use LaTeX or dollar signs ($).
- Keep each bullet punchy, actionable, and focused on core memory tricks.

Format as:

### 🧠 1. Core Pattern & Paradigm
(1-2 sentences on the underlying algorithm/data structure pattern)

### ⚡ 2. The Key Trick / Crucial Step
(1-2 sentences on the single key insight needed to solve this problem)

### 🚨 3. Common Interview Trap to Avoid
(1-2 sentences on the biggest mistake candidates make)
"""
        try:
            res = self._generate_with_gemini(prompt)
            return res if res else "❌ Flashcard generation failed."
        except Exception as e:
            return f"❌ Error generating flashcards: {str(e)}"


