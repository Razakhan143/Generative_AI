import tempfile
import traceback
from datetime import datetime
from fastapi import FastAPI, UploadFile, Form, Request
from starlette.middleware.cors import CORSMiddleware
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
import helper_function
import uvicorn
import json
import uuid
from typing import Dict, Any

# -----------------------------------
# Global Storage for Resume Data
# -----------------------------------
# In-memory storage for resume data (in production, use Redis or database)
resume_storage: Dict[str, Dict[str, Any]] = {}
user_sessions: Dict[str, str] = {}  # Maps session to resume_id

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
    
    print(f"✅ Stored resume data with ID: {resume_id}")
    return resume_id

def get_stored_resume_data(resume_id: str) -> Dict[str, Any]:
    """Retrieve stored resume data by ID"""
    return resume_storage.get(resume_id, {})

def extract_personal_info_from_text(text: str) -> Dict[str, str]:
    """Extract personal information from resume text"""
    import re
    
    # Extract email addresses
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    emails = re.findall(email_pattern, text)
    email = emails[0] if emails else ""
    
    # Extract phone numbers (various formats)
    phone_patterns = [
        r'\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})',
        r'\+?[0-9]{1,4}[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,4}',
        r'\b\d{10}\b'
    ]
    phone = ""
    for pattern in phone_patterns:
        phone_matches = re.findall(pattern, text)
        if phone_matches:
            if isinstance(phone_matches[0], tuple):
                phone = f"({phone_matches[0][0]}) {phone_matches[0][1]}-{phone_matches[0][2]}"
            else:
                phone = phone_matches[0]
            break
    
    # Extract LinkedIn profile
    linkedin_pattern = r'linkedin\.com/in/[\w-]+'
    linkedin_matches = re.findall(linkedin_pattern, text)
    linkedin = linkedin_matches[0] if linkedin_matches else ""
    
    # Extract name - try multiple approaches
    name_patterns = [
        r'^([A-Z][a-z]+ [A-Z][a-z]+)',  # First Last
        r'([A-Z][a-z]+ [A-Z]\. [A-Z][a-z]+)',  # First M. Last
        r'([A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+)'  # First Middle Last
    ]
    name = ""
    for pattern in name_patterns:
        name_match = re.search(pattern, text)
        if name_match:
            name = name_match.group(1)
            break
    
    return {
        "name": name,
        "email": email,
        "phone": phone,
        "linkedin": linkedin
    }

# -----------------------------------
# Create FastAPI app
# -----------------------------------
app = FastAPI(
    title="Resume Processing API",
    description="API for processing resumes and job descriptions with AI",
    version="1.0.0"
)

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load environment variables
load_dotenv()

def format_interview_qa(qa_data):
    """Convert Interview Q&A from various formats to the expected string format"""
    if isinstance(qa_data, str):
        return qa_data
    
    if isinstance(qa_data, dict):
        formatted_qa = ""
        for i, (question, answer) in enumerate(qa_data.items(), 1):
            # Clean the question (remove Q1:, Q2: etc. prefixes)
            clean_question = question
            if ':' in question:
                clean_question = question.split(':', 1)[1].strip()
            
            # Clean the answer (remove A1:, A2: etc. prefixes)
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
    return str(percentage_value)

def format_resume_as_text(resume_data):
    """Convert LLM-generated resume JSON to formatted text"""
    if isinstance(resume_data, str):
        return resume_data
    
    if not isinstance(resume_data, dict):
        return "Error: Invalid resume data format"
    
    formatted_text = "AI-GENERATED IMPROVED RESUME\n"
    formatted_text += "=" * 50 + "\n\n"
    
    # Name section
    if resume_data.get('Name'):
        formatted_text += f"{resume_data['Name'].upper()}\n"
        formatted_text += "=" * len(resume_data['Name']) + "\n\n"
    
    # Contact Info
    if resume_data.get('Contact Info'):
        formatted_text += "CONTACT INFORMATION\n"
        formatted_text += "-" * 20 + "\n"
        formatted_text += f"{resume_data['Contact Info']}\n\n"
    
    # Professional Summary
    if resume_data.get('Summary'):
        formatted_text += "PROFESSIONAL SUMMARY\n"
        formatted_text += "-" * 20 + "\n"
        formatted_text += f"{resume_data['Summary']}\n\n"
    
    # Education
    if resume_data.get('Education'):
        formatted_text += "EDUCATION\n"
        formatted_text += "-" * 9 + "\n"
        formatted_text += f"{resume_data['Education']}\n\n"
    
    # Work Experience
    if resume_data.get('Work Experience'):
        formatted_text += "WORK EXPERIENCE\n"
        formatted_text += "-" * 15 + "\n"
        formatted_text += f"{resume_data['Work Experience']}\n\n"
    
    # Projects
    if resume_data.get('Projects'):
        formatted_text += "PROJECTS\n"
        formatted_text += "-" * 8 + "\n"
        formatted_text += f"{resume_data['Projects']}\n\n"
    
    # Skills
    if resume_data.get('Skills'):
        formatted_text += "TECHNICAL SKILLS\n"
        formatted_text += "-" * 16 + "\n"
        formatted_text += f"{resume_data['Skills']}\n\n"
    
    # Certificates
    if resume_data.get('Certificates'):
        formatted_text += "CERTIFICATIONS\n"
        formatted_text += "-" * 14 + "\n"
        formatted_text += f"{resume_data['Certificates']}\n\n"
    
    # Additional Info
    if resume_data.get('Additional Info'):
        formatted_text += "ADDITIONAL INFORMATION\n"
        formatted_text += "-" * 22 + "\n"
        formatted_text += f"{resume_data['Additional Info']}\n\n"
    
    formatted_text += "=" * 50 + "\n"
    formatted_text += "Generated by AI Resume Enhancement System\n"
    formatted_text += f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
    
    return formatted_text

# -----------------------------------
# API: Health Check
# -----------------------------------
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Resume Processing API",
        "status": "healthy",
        "version": "1.0.0",
        "endpoints": {
            "process_resume": "/api/process-resume",
            "generate_resume": "/api/generate-resume",
            "health": "/api/health"
        }
    }

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "success": True, 
        "message": "API is healthy",
        "status": "200 OK",
        "timestamp": datetime.now().isoformat()
    }

# -----------------------------------
# API: Process Resume
# -----------------------------------
@app.post("/api/process-resume")
async def process_resume(
    request: Request,
    job_description: str = Form(""),
    resume: UploadFile = Form(None)
):
    """Process resume against job description"""
    form = await request.form()
    print("✅ API hit: /api/process-resume")

    # Pick server → model
    selected_server = form.get("selectedServer", "server2")
    if selected_server == "server1":
        model_name = "gemini-2.5-pro"
    elif selected_server == "server2":
        model_name = "gemini-2.5-flash"
    else:
        model_name = "gemini-2.0-flash"

    try:
        model = ChatGoogleGenerativeAI(model=model_name, temperature=0)
        print(f"✅ Model '{model_name}' initialized successfully.")
    except Exception as e:
        return {"success": False, "error": f"Model initialization failed: {str(e)}"}

    # Save resume
    resume_path = None
    if resume:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(await resume.read())
            resume_path = tmp.name

    # Extract resume text
    try:
        resume_text = helper_function.extract_text_from_pdf(resume_path)
        if not resume_text.strip():
            raise ValueError("Resume PDF is empty or unreadable.")
    except Exception as e:
        traceback.print_exc()
        return {"success": False, "error": f"Resume extraction failed: {str(e)}"}

    # Parse resume
    try:
        parser_resume, resume_prompt = helper_function.parse_resume_with_llm(resume_text)
        res_resume = (model | parser_resume).invoke(resume_prompt)
    except Exception as e:
        traceback.print_exc()
        res_resume = None

    # Parse job description
    job_description = form.get("jobDescription") or form.get("jobUrl")
    try:
        parser_jobdes, jobdes_prompt = helper_function.job_description(job_description)
        res_jobdes = (model | parser_jobdes).invoke(jobdes_prompt)
    except Exception as e:
        traceback.print_exc()
        res_jobdes = None

    # Compare
    response = None
    if res_resume and res_jobdes:
        try:
            parser_main, main_prompt = helper_function.comparing(res_resume, res_jobdes)
            response = (model | parser_main).invoke(main_prompt)
            
            # Post-process the response to fix formatting issues
            if response and hasattr(response, 'get'):
            
                # Fix Interview Q&A if it's in JSON format
                if 'Interview Q&A' in response:
                    original_qa = response['Interview Q&A']
                    response['Interview Q&A'] = format_interview_qa(response['Interview Q&A'])
                
                
                # Clean percentage values
                if 'Match Percentage' in response:
                    original_percentage = response['Match Percentage']
                    response['Match Percentage'] = clean_percentage(response['Match Percentage'])

        except Exception as e:
            traceback.print_exc()

    # Visualization
    visualize_value = None
    try:
        parser_visual, visual_prompt = helper_function.visualize_data(res_resume, res_jobdes)
        visualize_value = (model | parser_visual).invoke(visual_prompt)
        
        # Post-process visualization data
        if visualize_value and hasattr(visualize_value, 'get'):
            # Clean percentage values in visualization
            if 'visual Match Percentage' in visualize_value:
                visualize_value['visual Match Percentage'] = clean_percentage(visualize_value['visual Match Percentage'])
    except Exception as e:
        traceback.print_exc()
    # Clean up temporary file
    print("All the data is passed to the frontend successfully.")
    
    # Store resume data for future use
    resume_id = store_resume_data(
        resume_text=resume_text,
        parsed_resume=res_resume,
        original_filename=resume.filename if resume else "unknown.pdf"
    )
    
    return {
        "success": True,
        "compare_response": response,
        "resume_text": res_resume,
        "job_description": res_jobdes,
        "analysis": visualize_value,
        "resume_id": resume_id,  # Include resume_id for future reference
        "personal_info": resume_storage[resume_id]["personal_info"]  # Include extracted personal info
    }

# -----------------------------------
# API: Generate Resume
# -----------------------------------
@app.post("/api/generate-resume")
async def generate_resume(request: Request):
    """Generate improved resume based on feedback"""
    try:
        print("✅ API hit: /api/generate-resume")
        body = await request.json()
        print("="*50)
        print("📥 Received Payload:", json.dumps(body, indent=2))
        print("="*50)

        resume_id = body.get("resume_id")
        
        # 1. Consolidate all available data into a single dictionary
        final_resume_data = {}
        
        # Start with the base resume text from the frontend
        if isinstance(body.get("resumeText"), dict):
            final_resume_data.update(body.get("resumeText"))

        # Get stored data and merge it carefully
        if resume_id:
            stored_data = get_stored_resume_data(resume_id)
            if stored_data:
                # Merge parsed data from storage
                if isinstance(stored_data.get("parsed_data"), dict):
                    final_resume_data.update(stored_data.get("parsed_data"))
                # Overwrite with more reliable personal info from initial extraction
                if isinstance(stored_data.get("personal_info"), dict):
                    final_resume_data.update(stored_data.get("personal_info"))
                    # Ensure "Name" is set from personal_info if available
                    if stored_data["personal_info"].get("name"):
                         final_resume_data["Name"] = stored_data["personal_info"]["name"]

        # Ensure a clean contact info string is created
        contact_parts = []
        if final_resume_data.get("email"):
            contact_parts.append(f"Email: {final_resume_data['email']}")
        if final_resume_data.get("phone"):
            contact_parts.append(f"Phone: {final_resume_data['phone']}")
        if final_resume_data.get("linkedin"):
            contact_parts.append(f"LinkedIn: {final_resume_data['linkedin']}")
        final_resume_data["Contact Info"] = " | ".join(contact_parts)

        # 2. Prepare for LLM call (if needed, but for now we focus on PDF generation)
        # For now, we will use the consolidated data directly.
        # This helps verify the PDF generation step independently.
        
        # In a real scenario, you would call the LLM here to get `output_resume`
        # model = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0)
        # resume_parser, resume_prompt = helper_function.generate_resume_from_feedback(feedback_data, final_resume_data)
        # output_resume = (model | resume_parser).invoke(resume_prompt)
        
        # For debugging, we use the merged data as the final output
        output_resume = final_resume_data
        


        # 3. Create PDF
        resume_name = output_resume.get("Name", "Generated_Resume").replace(" ", "_")
        pdf_success, pdf_data = helper_function.create_resume_pdf(output_resume, file_name=f"{resume_name}.pdf")
        
        if pdf_success:
            print("✅ PDF created successfully")
            return {
                "success": True, 
                "generated_resume": output_resume, # Sending back the data used for the PDF
                "improved_resume": format_resume_as_text(output_resume),
                "pdf_base64": pdf_data,
                "filename": f"{resume_name}.pdf"
            }
        else:
            print("❌ PDF creation failed:", pdf_data)
            return {
                "success": False,
                "error": "PDF generation failed.",
                "details": pdf_data
            }
            
    except Exception as e:
        traceback.print_exc()
        return {"success": False, "error": str(e)}

# -----------------------------------
# Debug endpoints to check stored resume data
# -----------------------------------
@app.get("/api/debug/resume/{resume_id}")
async def debug_resume(resume_id: str):
    """Debug endpoint to check stored resume data"""
    stored_data = get_stored_resume_data(resume_id)
    if stored_data:
        return {
            "success": True,
            "resume_id": resume_id,
            "stored_data": stored_data,
            "personal_info": stored_data.get("personal_info", {}),
            "timestamp": stored_data.get("timestamp", "")
        }
    else:
        return {
            "success": False,
            "error": f"No resume data found for ID: {resume_id}"
        }

@app.get("/api/debug/storage")
async def debug_storage():
    """Debug endpoint to check all stored resume data"""
    return {
        "success": True,
        "total_stored": len(resume_storage),
        "resume_ids": list(resume_storage.keys()),
        "storage_summary": {
            resume_id: {
                "filename": data.get("filename", ""),
                "timestamp": data.get("timestamp", ""),
                "has_personal_info": bool(data.get("personal_info", {})),
                "personal_info": data.get("personal_info", {})
            }
            for resume_id, data in resume_storage.items()
        }
    }

# -----------------------------------
# Run FastAPI application
# -----------------------------------
if __name__ == "__main__":
    import os
    print("🚀 Starting Resume Processing API...")
    print("📄 API Documentation available at: http://localhost:8503/docs")
    print("🔍 Interactive API explorer at: http://localhost:8503/redoc")
    
    # Update the main block:
    uvicorn.run(app, host="0.0.0.0", port=8503)