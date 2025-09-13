import tempfile
import traceback
import asyncio
import base64
import os
import time
from fastapi import FastAPI, UploadFile, Form, Request
from starlette.middleware.cors import CORSMiddleware
from langchain_google_genai import ChatGoogleGenerativeAI
import helper_function
import streamlit as st
from streamlit.web.server import Server

# -----------------------------------
# Disable Streamlit UI completely
# -----------------------------------
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

# -----------------------------------
# Create FastAPI app
# -----------------------------------
api = FastAPI()

# Allow CORS
api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------
# API: Process Resume
# -----------------------------------
@api.post("/api/process-resume")
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
                if 'Interview Q&A' in response:
                    response['Interview Q&A'] = helper_function.format_interview_qa(response['Interview Q&A'])

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

# -----------------------------------
# API: Generate Resume
# -----------------------------------
@api.post("/api/generate-resume")
async def generate_resume(request: Request):
    try:
        print("✅ API hit: /api/generate-resume")
        body = await request.json()

        feedback_data = {
            "improvements": body.get("improvements", ""),
            "ats_keywords": body.get("atsKeywords", ""),
            "analysis": body.get("analysis", {}),
            "job_description": body.get("jobDescription", {})
        }
        candidate_info = body.get("resumeText", {})
        name = body.get("name", candidate_info.get("Name", "Generated_Resume"))

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

# -----------------------------------
# Health Check
# -----------------------------------
@api.post("/api/health")
async def health_check():
    return {"success": True, "message": "API is healthy 200 OK"}

# -----------------------------------
# Mount FastAPI into Streamlit
# -----------------------------------
def mount_fastapi(app: FastAPI):
    server = Server.get_current()
    if not server:
        raise RuntimeError("Streamlit server is not running")
    server._runtime._app.mount("/api", app)

mount_fastapi(api)

st.write("✅ FastAPI backend mounted at `/api` (UI hidden)")
