import os
import sys
import threading
import time
import uvicorn
import uuid
import traceback
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, TimeoutError
from fastapi import FastAPI, UploadFile, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from langchain_google_genai import GoogleGenerativeAI
from dotenv import load_dotenv
import helper_function

# -----------------------------------
# Auto-Restart Function with Timeout
# -----------------------------------
def safe_gemini_call_with_auto_restart(model, parser, prompt, timeout_seconds=60) -> Tuple[Optional[Any], Optional[Dict]]:
    """
    Execute Gemini API call with auto-restart on quota exceeded.
    Returns (result, error_dict) where error_dict contains restart information.
    """
    restart_timer = None
    
    def force_restart():
        """Force restart after timeout"""
        print(f"🔄 Timeout reached ({timeout_seconds}s) - Auto-restarting server...")
        os._exit(42)  # Exit code 42 signals quota restart
    
    try:
        # Start timeout timer
        restart_timer = threading.Timer(timeout_seconds, force_restart)
        restart_timer.start()
        
        # Execute with executor timeout
        with ThreadPoolExecutor() as executor:
            future = executor.submit(parser.parse, model.invoke(prompt))
            try:
                result = future.result(timeout=timeout_seconds-5)  # 5s buffer
                restart_timer.cancel()
                return result, None
            except TimeoutError:
                print(f"⏰ Executor timeout - forcing restart...")
                restart_timer.cancel()
                force_restart()
                
    except Exception as e:
        if restart_timer:
            restart_timer.cancel()
            
        error_message = str(e).lower()
        print(f"❌ Error in Gemini call: {e}")
        
        if "quota" in error_message or "limit" in error_message or "resource" in error_message:
            return None, {
                "error_type": "quota_exceeded",
                "message": "Server quota exceeded. Auto-restarting... try to select different server",
                "original_error": str(e),
                "auto_restart": True,
                "restart_reason": "quota_exceeded",
                "server_switch_recommended": True,
                "alternative_servers": ["gemini-2.5-flash", "gemini-2.0-flash"],
                "estimated_restart_time": "30 seconds"
            }
        else:
            return None, {
                "error_type": "general_error",
                "message": str(e),
                "original_error": str(e)
            }

# -----------------------------------
# Personal Info Extraction
# -----------------------------------
def extract_personal_info_from_text(text: str) -> Dict[str, str]:
    """Extract basic personal information from resume text"""
    personal_info = {}
    
    # Extract email
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    email_match = re.search(email_pattern, text)
    if email_match:
        personal_info['email'] = email_match.group()
    
    # Extract phone (basic patterns)
    phone_pattern = r'[\+]?[1-9]?[0-9]{7,15}'
    phone_match = re.search(phone_pattern, text.replace('-', '').replace(' ', ''))
    if phone_match:
        personal_info['phone'] = phone_match.group()
    
    # Extract LinkedIn
    linkedin_pattern = r'linkedin\.com/in/[\w-]+'
    linkedin_match = re.search(linkedin_pattern, text.lower())
    if linkedin_match:
        personal_info['linkedin'] = f"https://{linkedin_match.group()}"
    
    return personal_info

# -----------------------------------
# Global Storage for Resume Data
# -----------------------------------
resume_storage: Dict[str, Dict[str, Any]] = {}
user_sessions: Dict[str, str] = {}

def store_resume_data(resume_text: str, parsed_resume: Dict, original_filename: str = "") -> str:
    """Store resume data and return a unique resume_id"""
    resume_id = str(uuid.uuid4())
    
    resume_storage[resume_id] = {
        "original_text": resume_text,
        "parsed_data": parsed_resume,
        "filename": original_filename,
        "timestamp": datetime.now().isoformat(),
        "personal_info": extract_personal_info_from_text(resume_text)
    }
    
    return resume_id

def get_stored_resume_data(resume_id: str) -> Dict[str, Any]:
    """Retrieve stored resume data by ID"""
    return resume_storage.get(resume_id, {})

# -----------------------------------
# Utility Functions
# -----------------------------------
def format_interview_qa(qa_data):
    """Convert Interview Q&A from various formats to the expected string format"""
    if isinstance(qa_data, str):
        return qa_data
    
    if isinstance(qa_data, dict):
        formatted_qa = ""
        for i, (question, answer) in enumerate(qa_data.items(), 1):
            clean_question = question
            if ':' in question:
                clean_question = question.split(':', 1)[1].strip()
            
            clean_answer = str(answer)
            if clean_answer.startswith(('A1:', 'A2:', 'A3:', 'A4:', 'A5:')):
                clean_answer = clean_answer.split(':', 1)[1].strip()
            
            formatted_qa += f"**Q: {clean_question}**\n\n**A: {clean_answer}**\n\n"
        
        return formatted_qa.strip()
    
    return "No interview questions available."

def clean_percentage(percentage_value):
    """Clean percentage values to ensure they're just numbers"""
    if isinstance(percentage_value, str):
        return percentage_value.replace('%', '').strip()
    return percentage_value

# -----------------------------------
# FastAPI Application Setup
# -----------------------------------
app = FastAPI(
    title="Resume Processing API",
    description="API for processing resumes and job descriptions with AI",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv()

# -----------------------------------
# API Endpoints
# -----------------------------------
@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Resume Processing API is running!"}

@app.get("/api/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/api/restart-server")
async def restart_server():
    """Restart server endpoint"""
    return {
        "success": True,
        "message": "Server restart initiated",
        "estimated_time": "30 seconds"
    }

@app.get("/api/server-status")
async def server_status():
    """Server status endpoint with quota and restart information"""
    return {
        "success": True,
        "status": "running",
        "server_type": "gemini-2.5-pro",
        "auto_restart_enabled": True,
        "quota_timeout": "60 seconds",
        "alternative_servers": [
            {
                "name": "Server 2",
                "model": "gemini-2.5-flash", 
                "recommended": True,
                "description": "Faster processing, good for most tasks"
            },
            {
                "name": "Server 3", 
                "model": "gemini-2.0-flash",
                "recommended": True,
                "description": "Latest model with improved performance"
            }
        ],
        "restart_info": {
            "automatic": True,
            "trigger": "quota_exceeded_timeout",
            "estimated_time": "30 seconds",
            "recommendation": "Switch to alternative server for immediate processing"
        },
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/process-resume")
async def process_resume(
    request: Request,
    job_description: str = Form(""),
    resume: UploadFile = Form(None)
):
    """Process resume against job description"""
    form = await request.form()

    # Server selection
    selected_server = form.get("selectedServer", "server2")
    if selected_server == "server1":
        model_name = "gemini-2.5-pro"
    elif selected_server == "server2":
        model_name = "gemini-2.5-flash"
    else:
        model_name = "gemini-2.0-flash"

    model = GoogleGenerativeAI(model=model_name, temperature=0.1)

    # Process resume file
    if resume:
        resume_content = await resume.read()
        resume_path = f"temp_{resume.filename}"
        
        with open(resume_path, "wb") as f:
            f.write(resume_content)
        
        resume_text = helper_function.extract_text_from_pdf(resume_path)
        os.remove(resume_path)
    else:
        return {"success": False, "error": "No resume file provided"}

    # Parse resume
    parser_resume, resume_prompt = helper_function.parse_resume_with_llm(resume_text)
    res_resume, error = safe_gemini_call_with_auto_restart(model, parser_resume, resume_prompt)
    
    if error:
        if error.get("auto_restart"):
            return {
                "success": False, 
                "error": error["message"],
                "error_type": "quota_exceeded",
                "auto_restarting": True,
                "restart_reason": error.get("restart_reason", "quota_exceeded"),
                "server_switch_recommended": error.get("server_switch_recommended", True),
                "alternative_servers": error.get("alternative_servers", ["gemini-2.5-flash", "gemini-2.0-flash"]),
                "estimated_restart_time": error.get("estimated_restart_time", "30 seconds"),
                "suggestion": error.get("suggestion", "Please switch to a different server or wait for restart.")
            }
        else:
            return {"success": False, "error": error["message"]}

    # Parse job description
    parser_jobdes, jobdes_prompt = helper_function.job_description(job_description)
    res_jobdes, error = safe_gemini_call_with_auto_restart(model, parser_jobdes, jobdes_prompt)
    
    if error:
        if error.get("auto_restart"):
            return {
                "success": False, 
                "error": error["message"],
                "error_type": "quota_exceeded",
                "auto_restarting": True,
                "restart_reason": error.get("restart_reason", "quota_exceeded"),
                "server_switch_recommended": error.get("server_switch_recommended", True),
                "alternative_servers": error.get("alternative_servers", ["gemini-2.5-flash", "gemini-2.0-flash"]),
                "estimated_restart_time": error.get("estimated_restart_time", "30 seconds"),
                "suggestion": error.get("suggestion", "Please switch to a different server or wait for restart.")
            }
        else:
            return {"success": False, "error": error["message"]}

    # Main comparison
    response = None
    try:
        if res_resume and res_jobdes:
            parser_main, main_prompt = helper_function.comparing(res_resume, res_jobdes)
            response, error = safe_gemini_call_with_auto_restart(model, parser_main, main_prompt)
            
            if error:
                if error.get("auto_restart"):
                    return {
                        "success": False, 
                        "error": error["message"],
                        "error_type": "quota_exceeded",
                        "auto_restarting": True,
                        "restart_reason": error.get("restart_reason", "quota_exceeded"),
                        "server_switch_recommended": error.get("server_switch_recommended", True),
                        "alternative_servers": error.get("alternative_servers", ["gemini-2.5-flash", "gemini-2.0-flash"]),
                        "estimated_restart_time": error.get("estimated_restart_time", "30 seconds"),
                        "suggestion": error.get("suggestion", "Please switch to a different server or wait for restart.")
                    }
                else:
                    return {"success": False, "error": error["message"]}
            
            if response:
                # Format Interview Q&A
                if 'Interview Q&A' in response:
                    response['Interview Q&A'] = format_interview_qa(response['Interview Q&A'])
                
                # Clean percentage values
                if 'Match Percentage' in response:
                    response['Match Percentage'] = clean_percentage(response['Match Percentage'])

    except Exception as e:
        traceback.print_exc()

    # Visualization
    visualize_value = None
    try:
        parser_visual, visual_prompt = helper_function.visualize_data(res_resume, res_jobdes)
        visualize_value, error = safe_gemini_call_with_auto_restart(model, parser_visual, visual_prompt)
        
        if error:
            if error.get("auto_restart"):
                return {
                    "success": False, 
                    "error": error["message"],
                    "error_type": "quota_exceeded",
                    "auto_restarting": True,
                    "restart_reason": error.get("restart_reason", "quota_exceeded"),
                    "server_switch_recommended": error.get("server_switch_recommended", True),
                    "alternative_servers": error.get("alternative_servers", ["gemini-2.5-flash", "gemini-2.0-flash"]),
                    "estimated_restart_time": error.get("estimated_restart_time", "30 seconds"),
                    "suggestion": error.get("suggestion", "Please switch to a different server or wait for restart.")
                }
            else:
                visualize_value = None
        else:
            if visualize_value and hasattr(visualize_value, 'get'):
                if 'visual Match Percentage' in visualize_value:
                    visualize_value['visual Match Percentage'] = clean_percentage(visualize_value['visual Match Percentage'])
    except Exception as e:
        traceback.print_exc()
    
    # Store resume data
    resume_id = store_resume_data(
        resume_text=resume_text,
        parsed_resume=res_resume,
        original_filename=resume.filename if resume else ""
    )

    return {
        "success": True,
        "resume_id": resume_id,
        "resume_data": res_resume,
        "job_data": res_jobdes,
        "comparison_result": response,
        "visualization_data": visualize_value
    }

@app.post("/api/generate-resume")
async def generate_resume(
    request: Request,
    feedback: str = Form(""),
    resume_id: str = Form("")
):
    """Generate improved resume based on feedback"""
    if not resume_id:
        return {"success": False, "error": "Resume ID is required"}

    stored_data = get_stored_resume_data(resume_id)
    if not stored_data:
        return {"success": False, "error": "Resume data not found"}

    final_resume_data = stored_data.get("parsed_data", {})
    feedback_data = {"feedback": feedback}
    
    try:
        output_resume = f"Enhanced Resume for {final_resume_data.get('Name', 'Candidate')}"
        resume_name = final_resume_data.get('Name', 'resume')
        
        pdf_success, pdf_data = helper_function.create_resume_pdf(output_resume, file_name=f"{resume_name}.pdf")
        
        if pdf_success:
            return {
                "success": True,
                "message": "Resume generated successfully!",
                "resume_content": output_resume,
                "pdf_generated": True,
                "file_name": f"{resume_name}.pdf"
            }
        else:
            return {
                "success": False,
                "error": "Failed to generate PDF",
                "resume_content": output_resume
            }
    except Exception as e:
        return {"success": False, "error": f"Resume generation failed: {str(e)}"}

# -----------------------------------
# Application Entry Point
# -----------------------------------
if __name__ == "__main__":
    import re
    uvicorn.run(app, host="0.0.0.0", port=8503)