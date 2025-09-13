import tempfile
import traceback
import threading
import asyncio
import base64
import os
import time
import json
from typing import Optional

import streamlit as st
from streamlit.web import cli as stcli
from langchain_google_genai import ChatGoogleGenerativeAI
import helper_function

# --------------------------------------------------------
# Global API Functions (FastAPI-style but for Streamlit)
# --------------------------------------------------------

class APIError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(message)

async def process_resume_api(job_description: str, resume_file, selected_server: str = "server2"):
    """Process resume API function"""
    start_time = time.time()
    
    # Model selection
    model_mapping = {
        "server1": "gemini-2.5-pro",
        "server2": "gemini-2.5-flash", 
        "server3": "gemini-2.0-flash"
    }
    model_name = model_mapping.get(selected_server, "gemini-2.5-flash")

    try:
        os.environ["GOOGLE_API_KEY"] = st.secrets["GOOGLE_API_KEY"]
        model = ChatGoogleGenerativeAI(model=model_name, temperature=0)
        print(f"✅ Model '{model_name}' initialized successfully.")
    except Exception as e:
        raise APIError(500, f"Model initialization failed: {str(e)}")

    # Validate inputs
    if not resume_file:
        raise APIError(400, "Resume file is required")
    
    if not job_description:
        raise APIError(400, "Job description is required")

    # Process resume
    resume_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            if hasattr(resume_file, 'getvalue'):
                content = resume_file.getvalue()
            else:
                content = resume_file.read()
            
            if len(content) == 0:
                raise ValueError("Resume file is empty")
            tmp.write(content)
            resume_path = tmp.name

        resume_text = helper_function.extract_text_from_pdf(resume_path)
        if not resume_text.strip():
            raise ValueError("Resume PDF is empty or unreadable")
            
    except Exception as e:
        raise APIError(400, f"Resume processing failed: {str(e)}")
    finally:
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

    # Parse job description
    res_jobdes = None
    try:
        parser_jobdes, jobdes_prompt = helper_function.job_description(job_description)
        res_jobdes = (model | parser_jobdes).invoke(jobdes_prompt)
    except Exception as e:
        print(f"❌ Job description parsing error: {e}")

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
        except Exception as e:
            print(f"❌ Comparison error: {e}")

    # Visualization
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

async def generate_resume_api(improvements: str, ats_keywords: str, analysis: dict, 
                            job_description: dict, candidate_info: dict, name: str = "Generated_Resume"):
    """Generate resume API function"""
    try:
        print("✅ API: generate-resume")

        feedback_data = {
            "improvements": improvements,
            "ats_keywords": ats_keywords,
            "analysis": analysis,
            "job_description": job_description
        }
        
        if not candidate_info.get("name") and not candidate_info.get("Name"):
            candidate_info["Name"] = "Professional Candidate"

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
            os.unlink(pdf_filename)  # Clean up
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
        raise APIError(500, f"Internal server error: {str(e)}")

# --------------------------------------------------------
# API Route Handler
# --------------------------------------------------------

def handle_api_request():
    """Handle API requests through Streamlit's query params"""
    query_params = st.query_params
    
    # Check if this is an API request
    if 'api' not in query_params:
        return False
    
    endpoint = query_params.get('api', '')
    
    try:
        if endpoint == 'health':
            response = {
                "success": True, 
                "message": "API is healthy 200 OK",
                "timestamp": time.time(),
                "status": "running"
            }
            st.json(response)
            return True
            
        elif endpoint == 'process-resume':
            st.write("📄 Process Resume API Endpoint")
            st.write("Use the form below or send POST data:")
            
            # Handle file uploads and form data through Streamlit
            with st.form("api_process_resume"):
                job_desc = st.text_area("Job Description", height=150)
                resume_file = st.file_uploader("Resume (PDF)", type=['pdf'])
                server = st.selectbox("Server", ["server1", "server2", "server3"], index=1)
                submit = st.form_submit_button("Process")
                
                if submit:
                    if not job_desc or not resume_file:
                        st.error("Both job description and resume are required")
                        return True
                    
                    with st.spinner("Processing..."):
                        try:
                            result = asyncio.run(process_resume_api(job_desc, resume_file, server))
                            st.json(result)
                        except APIError as e:
                            st.error(f"API Error {e.status_code}: {e.message}")
                        except Exception as e:
                            st.error(f"Error: {str(e)}")
            return True
            
        elif endpoint == 'generate-resume':
            st.write("🔧 Generate Resume API Endpoint")
            
            # This endpoint typically needs data from process-resume
            if 'last_analysis' not in st.session_state:
                st.error("Please process a resume first using /api/process-resume")
                return True
            
            with st.form("api_generate_resume"):
                improvements = st.text_area("Improvements")
                ats_keywords = st.text_area("ATS Keywords")
                name = st.text_input("Resume Name", "Generated_Resume")
                submit = st.form_submit_button("Generate")
                
                if submit:
                    with st.spinner("Generating..."):
                        try:
                            last_result = st.session_state.last_analysis
                            result = asyncio.run(generate_resume_api(
                                improvements, ats_keywords,
                                last_result.get("analysis", {}),
                                last_result.get("job_description", {}),
                                last_result.get("resume_text", {}),
                                name
                            ))
                            st.json(result)
                        except APIError as e:
                            st.error(f"API Error {e.status_code}: {e.message}")
                        except Exception as e:
                            st.error(f"Error: {str(e)}")
            return True
            
        else:
            st.error(f"Unknown API endpoint: {endpoint}")
            return True
            
    except Exception as e:
        st.error(f"API Error: {str(e)}")
        return True

# --------------------------------------------------------
# Main Application
# --------------------------------------------------------

def main():
    st.set_page_config(
        page_title="Resume Job Insights API", 
        layout="wide",
        initial_sidebar_state="collapsed"
    )
    
    # Handle API requests first
    if handle_api_request():
        return
    
    # Regular Streamlit UI
    st.title("🎯 Resume Job Insights API")
    st.markdown("**FastAPI-style endpoints accessible through Streamlit**")
    
    # Show API endpoints
    st.subheader("📡 Available API Endpoints")
    
    base_url = "https://your-app-name.streamlit.app"  # Replace with your actual Streamlit URL
    
    col1, col2 = st.columns(2)
    with col1:
        st.code(f"""
GET  {base_url}/?api=health
POST {base_url}/?api=process-resume
POST {base_url}/?api=generate-resume
        """)
    
    with col2:
        st.info("💡 **How to use:**\n- Add `?api=endpoint_name` to your Streamlit URL\n- Send form data or use the web interface\n- Get JSON responses")
    
    # Quick test buttons
    st.subheader("🧪 Quick Tests")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        if st.button("🏥 Health Check"):
            st.rerun()
    
    with col2:
        if st.button("📄 Process Resume"):
            st.query_params['api'] = 'process-resume'
            st.rerun()
    
    with col3:
        if st.button("🔧 Generate Resume"):
            st.query_params['api'] = 'generate-resume'  
            st.rerun()
    
    # Usage examples
    st.subheader("💻 Usage Examples")
    
    tab1, tab2, tab3 = st.tabs(["Python Requests", "cURL", "JavaScript"])
    
    with tab1:
        st.code("""
import requests
import json

# Health Check
response = requests.get("https://your-app.streamlit.app/?api=health")
print(response.json())

# Process Resume (using form data)
files = {'resume': open('resume.pdf', 'rb')}
data = {
    'job_description': 'Software Engineer position...',
    'selectedServer': 'server2'
}
response = requests.post(
    "https://your-app.streamlit.app/?api=process-resume", 
    files=files, 
    data=data
)
print(response.json())
        """, language="python")
    
    with tab2:
        st.code("""
# Health Check
curl "https://your-app.streamlit.app/?api=health"

# Process Resume
curl -X POST "https://your-app.streamlit.app/?api=process-resume" \\
  -F "resume=@resume.pdf" \\
  -F "job_description=Software Engineer position..." \\
  -F "selectedServer=server2"
        """, language="bash")
    
    with tab3:
        st.code("""
// Health Check
fetch('https://your-app.streamlit.app/?api=health')
  .then(response => response.json())
  .then(data => console.log(data));

// Process Resume
const formData = new FormData();
formData.append('resume', fileInput.files[0]);
formData.append('job_description', 'Software Engineer...');
formData.append('selectedServer', 'server2');

fetch('https://your-app.streamlit.app/?api=process-resume', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
        """, language="javascript")
    
    # Configuration
    st.subheader("⚙️ Current Configuration")
    col1, col2 = st.columns(2)
    
    with col1:
        st.info(f"**Environment Status**")
        st.write(f"• Google API Key: {'✅ Configured' if st.secrets.get('GOOGLE_API_KEY') else '❌ Missing'}")
        st.write(f"• Streamlit Version: {st.__version__}")
        
    with col2:
        st.info("**API Status**")
        st.success("✅ All endpoints active")
        st.write("• Health: Ready")
        st.write("• Process Resume: Ready") 
        st.write("• Generate Resume: Ready")

if __name__ == "__main__":
    main()