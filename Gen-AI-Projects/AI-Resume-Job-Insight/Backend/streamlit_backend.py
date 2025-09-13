import tempfile
import traceback
import threading
import asyncio
import base64
import os
import time
import socket
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, Form, Request, HTTPException
from starlette.middleware.cors import CORSMiddleware
from langchain_google_genai import ChatGoogleGenerativeAI
import helper_function
import streamlit as st
import uvicorn

# --------------------------------------------------------
# Streamlit Configuration for Streamlit Cloud
# --------------------------------------------------------
st.set_page_config(
    page_title="Resume Job Insights API", 
    layout="wide", 
    initial_sidebar_state="collapsed"
)

# Only hide UI if running as API server
if os.environ.get("STREAMLIT_SERVER_MODE") == "api":
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
# FastAPI Application with Lifespan Management
# --------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 FastAPI application starting up...")
    try:
        os.environ["GOOGLE_API_KEY"] = st.secrets.get("GOOGLE_API_KEY", "")
        if not os.environ["GOOGLE_API_KEY"]:
            print("⚠️ Warning: GOOGLE_API_KEY not found in secrets")
    except Exception as e:
        print(f"⚠️ Warning: Could not load secrets: {e}")
    
    yield
    
    # Shutdown
    print("🛑 FastAPI application shutting down...")

app = FastAPI(
    title="Resume Job Insights API",
    description="API for resume analysis and generation",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------
# Utility Functions
# --------------------------------------------------------

def get_model(model_name: str):
    """Initialize and return the language model"""
    try:
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment")
        
        model = ChatGoogleGenerativeAI(model=model_name, temperature=0)
        print(f"✅ Model '{model_name}' initialized successfully.")
        return model
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model initialization failed: {str(e)}")

def is_port_in_use(port: int, host: str = "0.0.0.0") -> bool:
    """Check if port is already in use"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1.0)
            result = s.connect_ex((host, port))
            return result == 0
    except Exception:
        return False

# --------------------------------------------------------
# API Endpoints
# --------------------------------------------------------

@app.post("/api/process-resume")
async def process_resume(
    request: Request,
    job_description: str = Form(""),
    resume: UploadFile = Form(None)
):
    """Process resume and job description for analysis"""
    start_time = time.time()
    
    try:
        form = await request.form()
        print("✅ API hit: /api/process-resume")

        # Model selection
        selected_server = form.get("selectedServer", "server2")
        model_mapping = {
            "server1": "gemini-2.5-pro",
            "server2": "gemini-2.5-flash", 
            "server3": "gemini-2.0-flash"
        }
        model_name = model_mapping.get(selected_server, "gemini-2.5-flash")
        
        # Initialize model
        model = get_model(model_name)

        # Validate inputs
        if not resume:
            raise HTTPException(status_code=400, detail="Resume file is required")
        
        if not job_description and not form.get("jobDescription") and not form.get("jobUrl"):
            raise HTTPException(status_code=400, detail="Job description is required")

        # Save and process resume
        resume_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                content = await resume.read()
                if len(content) == 0:
                    raise ValueError("Resume file is empty")
                tmp.write(content)
                resume_path = tmp.name

            # Extract resume text
            resume_text = helper_function.extract_text_from_pdf(resume_path)
            if not resume_text.strip():
                raise ValueError("Resume PDF is empty or unreadable")
                
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Resume processing failed: {str(e)}")
        finally:
            # Clean up temp file
            if resume_path and os.path.exists(resume_path):
                try:
                    os.unlink(resume_path)
                except Exception:
                    pass

        # Parse resume
        res_resume = None
        try:
            parser_resume, resume_prompt = helper_function.parse_resume_with_llm(resume_text)
            res_resume = (model | parser_resume).invoke(resume_prompt)
        except Exception as e:
            print(f"❌ Resume parsing error: {e}")

        # Get job description from form
        job_desc = (
            form.get("jobDescription") or 
            form.get("jobUrl") or 
            job_description
        )

        # Parse job description
        res_jobdes = None
        try:
            parser_jobdes, jobdes_prompt = helper_function.job_description(job_desc)
            res_jobdes = (model | parser_jobdes).invoke(jobdes_prompt)
        except Exception as e:
            print(f"❌ Job description parsing error: {e}")

        # Compare resume and job
        response = None
        if res_resume and res_jobdes:
            try:
                parser_main, main_prompt = helper_function.comparing(res_resume, res_jobdes)
                response = (model | parser_main).invoke(main_prompt)

                if response and hasattr(response, 'get'):
                    if 'Interview Q&A' in response:
                        response['Interview Q&A'] = helper_function.format_interview_qa(
                            response['Interview Q&A']
                        )
                    if 'Match Percentage' in response:
                        response['Match Percentage'] = helper_function.clean_percentage(
                            response['Match Percentage']
                        )
            except Exception as e:
                print(f"❌ Comparison error: {e}")

        # Generate visualization data
        visualize_value = None
        if res_resume and res_jobdes:
            try:
                parser_visual, visual_prompt = helper_function.visualize_data(res_resume, res_jobdes)
                visualize_value = (model | parser_visual).invoke(visual_prompt)

                if visualize_value and hasattr(visualize_value, 'get'):
                    if 'visual Match Percentage' in visualize_value:
                        visualize_value['visual Match Percentage'] = helper_function.clean_percentage(
                            visualize_value['visual Match Percentage']
                        )
            except Exception as e:
                print(f"❌ Visualization error: {e}")

        end_time = time.time()
        print(f"✅ Processing completed in {end_time - start_time:.2f}s using {model_name}")
        
        return {
            "success": True,
            "compare_response": response,
            "resume_text": res_resume,
            "job_description": res_jobdes,
            "analysis": visualize_value,
            "processing_time": round(end_time - start_time, 2),
            "model_used": model_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.post("/api/generate-resume")
async def generate_resume(request: Request):
    """Generate optimized resume based on feedback"""
    try:
        print("✅ API hit: /api/generate-resume")

        # Parse request data
        try:
            if request.headers.get("content-type", "").startswith("application/json"):
                body = await request.json()
                feedback_data = {
                    "improvements": body.get("improvements", ""),
                    "ats_keywords": body.get("atsKeywords", ""),
                    "analysis": body.get("analysis", {}),
                    "job_description": body.get("jobDescription", {})
                }
                candidate_info = body.get("resumeText", {})
                name = body.get("name", "Generated_Resume")
            else:
                form = await request.form()
                feedback_data = {
                    "improvements": form.get("improvements", ""),
                    "ats_keywords": form.get("atsKeywords", ""),
                    "analysis": form.get("analysis", {}),
                    "job_description": form.get("jobDescription", {})
                }
                candidate_info = form.get("resumeText", {})
                name = form.get("name", "Generated_Resume")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid request format: {str(e)}")

        # Set default name if missing
        if not candidate_info.get("name") and not candidate_info.get("Name"):
            candidate_info["Name"] = "Professional Candidate"

        # Initialize model
        model = get_model("gemini-2.5-flash")

        # Generate resume
        try:
            resume_parser, resume_prompt = helper_function.generate_resume_from_feedback(
                feedback_data, candidate_info
            )
            output_resume = (model | resume_parser).invoke(resume_prompt)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Resume generation failed: {str(e)}")

        # Format resume
        try:
            formatted_resume = helper_function.format_resume_as_text(output_resume)
        except Exception as e:
            print(f"⚠️ Resume formatting warning: {e}")
            formatted_resume = str(output_resume)

        # Generate PDF
        pdf_base64 = None
        pdf_filename = f"{name.replace(' ', '_')}.pdf"
        
        try:
            helper_function.create_resume_pdf(output_resume, file_name=pdf_filename)
            
            if os.path.exists(pdf_filename):
                with open(pdf_filename, 'rb') as pdf_file:
                    pdf_base64 = base64.b64encode(pdf_file.read()).decode('utf-8')
                # Clean up
                os.unlink(pdf_filename)
            else:
                print("⚠️ Warning: PDF file was not created")
                
        except Exception as e:
            print(f"⚠️ PDF generation warning: {e}")

        return {
            "success": True,
            "generated_resume": output_resume,
            "improved_resume": formatted_resume,
            "pdf_base64": pdf_base64,
            "filename": pdf_filename
        }
        
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    print("✅ API hit: /api/health")
    return {
        "success": True, 
        "message": "API is healthy 200 OK",
        "timestamp": time.time(),
        "status": "running"
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Resume Job Insights API",
        "version": "1.0.0",
        "health": "/api/health",
        "endpoints": ["/api/process-resume", "/api/generate-resume"]
    }

# --------------------------------------------------------
# Server Management for Streamlit Cloud
# --------------------------------------------------------

def run_fastapi_server():
    """Run FastAPI server with proper configuration for Streamlit Cloud"""
    # Get port from environment or use default
    port = int(os.environ.get("API_PORT", "8000"))
    host = os.environ.get("API_HOST", "0.0.0.0")
    
    # Check if port is available
    if is_port_in_use(port, host):
        print(f"⚠️ Port {port} is already in use")
        return False
        
    try:
        print(f"🚀 Starting FastAPI server on {host}:{port}")
        
        # Configure uvicorn for production
        config = uvicorn.Config(
            app=app,
            host=host,
            port=port,
            log_level="info",
            access_log=True,
            loop="asyncio",
            # Add these for better Streamlit Cloud compatibility
            ws_ping_interval=20,
            ws_ping_timeout=20,
        )
        
        server = uvicorn.Server(config)
        server.run()
        return True
        
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        return False

# --------------------------------------------------------
# Streamlit Interface
# --------------------------------------------------------

def show_streamlit_interface():
    """Show Streamlit interface when not in API mode"""
    st.title("🎯 Resume Job Insights API Server")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.info("**Server Status**")
        port = int(os.environ.get("API_PORT", "8000"))
        host = os.environ.get("API_HOST", "0.0.0.0")
        
        if is_port_in_use(port, host):
            st.success(f"✅ API Server Running on port {port}")
        else:
            st.warning(f"⚠️ API Server not detected on port {port}")
    
    with col2:
        st.info("**Available Endpoints**")
        st.code(f"""
POST /api/process-resume
POST /api/generate-resume  
GET  /api/health
GET  /
        """)
    
    st.divider()
    
    # Server controls
    st.subheader("🛠️ Server Management")
    
    col1, col2 = st.columns(2)
    with col1:
        if st.button("🚀 Start API Server", type="primary"):
            with st.spinner("Starting server..."):
                if run_fastapi_server():
                    st.success("✅ Server started successfully!")
                else:
                    st.error("❌ Failed to start server")
    
    with col2:
        if st.button("🔍 Test Health Check"):
            try:
                import requests
                response = requests.get(f"http://localhost:{port}/api/health", timeout=5)
                if response.status_code == 200:
                    st.success("✅ Health check passed!")
                    st.json(response.json())
                else:
                    st.error(f"❌ Health check failed: {response.status_code}")
            except Exception as e:
                st.error(f"❌ Connection failed: {str(e)}")
    
    # Configuration
    st.subheader("⚙️ Configuration")
    st.code(f"""
API_HOST: {os.environ.get('API_HOST', '0.0.0.0')}
API_PORT: {os.environ.get('API_PORT', '8000')}
GOOGLE_API_KEY: {'✅ Set' if os.environ.get('GOOGLE_API_KEY') else '❌ Not Set'}
""")

# --------------------------------------------------------
# Main Application Logic
# --------------------------------------------------------

if __name__ == "__main__":
    # Check if running as API server or Streamlit interface
    if os.environ.get("STREAMLIT_SERVER_MODE") == "api":
        # Run only FastAPI (hidden Streamlit)
        threading.Thread(target=run_fastapi_server, daemon=True).start()
        st.write("FastAPI server running in background...")
    else:
        # Show Streamlit interface with server controls
        show_streamlit_interface()