import tempfile
import traceback
import threading
import asyncio
import base64
import os
import time

from fastapi import FastAPI, UploadFile, Form, Request
from starlette.middleware.cors import CORSMiddleware
from langchain_google_genai import ChatGoogleGenerativeAI
import helper_function
import streamlit as st
import uvicorn

# --------------------------------------------------------
# Disable Streamlit UI completely
# --------------------------------------------------------
st.set_page_config(page_title="", layout="wide", initial_sidebar_state="collapsed")

hide_streamlit_style = """
    <style>
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    .stApp {visibility: hidden;}
    </style>
"""
st.markdown(hide_streamlit_style, unsafe_allow_html=True)

# --------------------------------------------------------
# Create FastAPI app
# --------------------------------------------------------
app = FastAPI()

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------
# API: Process Resume
# --------------------------------------------------------
@app.post("/api/process-resume")
async def process_resume(
    request: Request,
    job_description: str = Form(""),
    resume: UploadFile = Form(None)
):
    start_time = time.time()
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
        os.environ["GOOGLE_API_KEY"] = st.secrets["GOOGLE_API_KEY"]
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
    except Exception:
        traceback.print_exc()
        res_resume = None

    # Parse job description
    job_description = form.get("jobDescription") or form.get("jobUrl")
    try:
        parser_jobdes, jobdes_prompt = helper_function.job_description(job_description)
        res_jobdes = (model | parser_jobdes).invoke(jobdes_prompt)
    except Exception:
        traceback.print_exc()
        res_jobdes = None

    # Compare
    response = None
    if res_resume and res_jobdes:
        try:
            parser_main, main_prompt = helper_function.comparing(res_resume, res_jobdes)
            response = (model | parser_main).invoke(main_prompt)

            if response and hasattr(response, 'get'):
                # Fix Interview Q&A
                if 'Interview Q&A' in response:
                    response['Interview Q&A'] = helper_function.format_interview_qa(response['Interview Q&A'])

                # Clean percentage values
                if 'Match Percentage' in response:
                    response['Match Percentage'] = helper_function.clean_percentage(response['Match Percentage'])
        except Exception:
            traceback.print_exc()

    # Visualization
    visualize_value = None
    try:
        parser_visual, visual_prompt = helper_function.visualize_data(res_resume, res_jobdes)
        visualize_value = (model | parser_visual).invoke(visual_prompt)

        if visualize_value and hasattr(visualize_value, 'get'):
            if 'visual Match Percentage' in visualize_value:
                visualize_value['visual Match Percentage'] = helper_function.clean_percentage(
                    visualize_value['visual Match Percentage']
                )
    except Exception:
        traceback.print_exc()

    end_time = time.time()
    print(f"✅ Processing time: {end_time - start_time:.2f} seconds for model '{model_name}'")
    return {
        "success": True,
        "compare_response": response,
        "resume_text": res_resume,
        "job_description": res_jobdes,
        "analysis": visualize_value,
    }


# --------------------------------------------------------
# API: Generate Resume
# --------------------------------------------------------
@app.post("/api/generate-resume")
async def generate_resume(request: Request):
    try:
        print("✅ API hit: /api/generate-resume")

        try:
            body = await request.json()
            feedback_data = {
                "improvements": body.get("improvements", ""),
                "ats_keywords": body.get("atsKeywords", ""),
                "analysis": body.get("analysis", {}),
                "job_description": body.get("jobDescription", {})
            }
            candidate_info = body.get("resumeText", {})
            if not candidate_info.get("name") and not candidate_info.get("Name"):
                candidate_info["Name"] = "Professional Candidate"
            name = body.get("name", candidate_info.get("Name", "Generated_Resume"))
        except Exception:
            # fallback to form data
            form = await request.form()
            feedback_data = form.get("response", "")
            candidate_info = form.get("resume_text", "")
            name = form.get("name", "Generated_Resume")

        model = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)
        resume_parser, resume_prompt = helper_function.generate_resume_from_feedback(feedback_data, candidate_info)
        output_resume = (model | resume_parser).invoke(resume_prompt)

        formatted_resume = helper_function.format_resume_as_text(output_resume)

        name = name.replace(" ", "_")
        pdf_filename = f"{name}.pdf"
        helper_function.create_resume_pdf(output_resume, file_name=pdf_filename)

        pdf_base64 = None
        try:
            with open(pdf_filename, 'rb') as pdf_file:
                pdf_base64 = base64.b64encode(pdf_file.read()).decode('utf-8')
        except Exception as e:
            print("❌ Error reading PDF:", e)

        return {
            "success": True,
            "generated_resume": output_resume,
            "improved_resume": formatted_resume,
            "pdf_base64": pdf_base64,
            "filename": pdf_filename
        }
    except Exception as e:
        traceback.print_exc()
        return {"success": False, "error": str(e)}


# --------------------------------------------------------
# Health Check
# --------------------------------------------------------
@app.get("/api/health")
async def health_check():
    print("✅ API hit: /api/health")
    return {"success": True, "message": "API is healthy 200 OK"}


# --------------------------------------------------------
# Run FastAPI inside Streamlit background thread
# --------------------------------------------------------
# ------------------------------
# Helper: check if port in use
# ------------------------------
import socket
def is_port_in_use(port: int, host: str = "0.0.0.0") -> bool:
    """Return True if port is bound on host."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0
# ------------------------------
# Start FastAPI in background (only if port free)
# ------------------------------
API_PORT = int(os.environ.get("API_PORT", "8000"))
API_HOST = "0.0.0.0"


def run_api_background():
    """Start Uvicorn server if port not in use. This is safe to call multiple times."""
    if is_port_in_use(API_PORT, API_HOST):
        print(f"⚠️ Port {API_PORT} already in use — skipping Uvicorn start.")
        return

    print(f"🚀 Starting Uvicorn on {API_HOST}:{API_PORT} (background thread)")
    # This will block until server exits; run it in daemon thread
    uvicorn.run(app, host=API_HOST, port=API_PORT, log_level="info")


# Launch background thread (daemon) so Streamlit script can exit/restart without blocking
thread = threading.Thread(target=run_api_background, daemon=True)
thread.start()

# Minimal Streamlit message (hidden UI will not show, but logs visible)
st.write(f"✅ FastAPI background server attempted to start on port {API_PORT}. Check logs for status.")