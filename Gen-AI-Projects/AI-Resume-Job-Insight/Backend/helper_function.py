import re
import uuid
import base64
import datetime
from fpdf import FPDF
from PyPDF2 import PdfReader
from typing import Dict, Any
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import StructuredOutputParser, ResponseSchema
from langchain_core.prompts import PromptTemplate
# 1. Extract text from PDF
def extract_text_from_pdf(pdf_path: str) -> str:
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text

# 2. Define function to parse resume using LLM
def parse_resume_with_llm(text: str):
    response_schemas = [
        ResponseSchema(name="Name", description="Full name of the candidate"),
        ResponseSchema(name="Email", description="Email address of the candidate"),
        ResponseSchema(name="Phone", description="Phone number of the candidate"),
        ResponseSchema(name="LinkedIn", description="LinkedIn profile URL if available"),
        ResponseSchema(name="Address", description="Address or location of the candidate"),
        ResponseSchema(name="Experience Level", description="by resume text, categorize as Entry-level, Mid-level, Senior-level, or Executive"),
        ResponseSchema(name="Education", description="latest education details ongoing or completed(only name of degree and year/ongoing)"),
        ResponseSchema(name="Skills", description="List of technical skills"),
        ResponseSchema(name="Achievements", description="List of achievements"),
        ResponseSchema(name="Work Experience", description="year of experience as position and field"),
        ResponseSchema(name="Projects", description="List of projects"),
        ResponseSchema(name="Certificates", description="List of certificates")
    ]

    output_parser = StructuredOutputParser.from_response_schemas(response_schemas)
    format_instructions = output_parser.get_format_instructions()

    prompt = ChatPromptTemplate.from_template("""
    You are a professional resume parser. You MUST return ONLY valid JSON in the exact format specified below.

    CRITICAL INSTRUCTIONS:
    1. Return ONLY valid JSON - no additional text, explanations, or markdown
    2. Use the exact field names provided in the format instructions
    3. If information is missing, use empty string "" for text fields and empty array [] for lists
    4. Ensure all JSON strings are properly escaped
    5. Do not include any text before or after the JSON object

    {format_instructions}

    Resume Text:
    {resume_text}

    Remember: Return ONLY the JSON object with no additional formatting or text.
    """)

    prompt = prompt.format_messages(
        resume_text=text,
        format_instructions=format_instructions
    )
    return output_parser, prompt

# 3. Check if text contains link
import re

def contains_link(text: str) -> bool:
     pattern = r"(https?://\S+|www\.\S+)" 
     return bool(re.search(pattern, text))


# 4. Define function to parse job description using LLM
def job_description(text: str):
    con_link = contains_link(text)
    if con_link:
        desc = 'The job description is provided as a link. Please visit the link to view the full job description.'
    else:
        desc = 'The job description is provided as text.'

    response_schema = [
        ResponseSchema(name="Job Title", description="Title of the job position"),
        ResponseSchema(name="Employment Type", description="Type of employment (Full-time/Part-time/Contract, etc.)"),
        ResponseSchema(name="Responsibilities", description="List of job responsibilities"),
        ResponseSchema(name="Required Skills", description="List of required skills for the job"),
        ResponseSchema(name="Qualifications", description="List of qualifications needed for the job"),
        ResponseSchema(name="Experience Level", description="Experience level required (if mentioned), give the original values which are present on description"),
        ResponseSchema(name="Year of Experience", description="Years of experience required (if mentioned), give the original values which are present on description"),
    ]
    
    output_parser = StructuredOutputParser.from_response_schemas(response_schema)
    format_instructions = output_parser.get_format_instructions()
    
    template = PromptTemplate(
        template="""
        You are a professional job description analyzer.
        {desc}

        {job_description}

        Extract and return in structured format:
        {format_instructions}
        Remember: Return ONLY the JSON object with no additional formatting or text.
        """,
        input_variables=["job_description", "format_instructions"],
    )
    
    prompt = template.format_prompt(
        desc=desc,
        job_description=text,
        format_instructions=format_instructions
    )
    return output_parser, prompt
# 5. Define function to compare resume and job description
def comparing(resume: dict, jobdes: dict):
    response_schema = [
        ResponseSchema(name="Match Percentage", description="Percentage match between resume and job description (provide only the number)"),
        ResponseSchema(name="Missing Skills", description="Skills mentioned in the job description but same skills not found in the resume"),
        ResponseSchema(name="Matching Skills", description="Skills that match between resume and job description"),
        ResponseSchema(name="Suggested Improvements", description="Specific suggestions to improve the resume"),
        ResponseSchema(name="Interview Q&A", description="Top 5 interview questions and answers based on the job description"),
        ResponseSchema(name="ATS-optimized keyword list", description="List of keywords to optimize for ATS systems"),
        ResponseSchema(name="Suggested rewrites", description="Rewritten sentences or sections to better match the job description"),
        ResponseSchema(name="Confidence scores", description="Provide Confidence scores and allow users to accept/modify the generated resume and export (PDF/DOCX)."),
    ]
    
    output_parser = StructuredOutputParser.from_response_schemas(response_schema)
    format_instructions = output_parser.get_format_instructions()
    
    template = PromptTemplate(
        template="""You are a Professional job interviewer who has 15+ years of experience. You MUST return ONLY valid JSON in the exact format specified.

        CRITICAL INSTRUCTIONS:
        1. Return ONLY valid JSON - no additional text
        2. Use the exact field names provided in the format instructions
        3. Ensure all JSON strings are properly escaped
        4. Do not include any text before or after the JSON object

        TASK: Evaluate the candidate's resume against the job description and provide detailed feedback.

        Resume Data: {resume}
        Job Description: {jobdes}
        
        Special formatting for specific fields:
        - "Match Percentage": Provide only the number (e.g., "85")
        - "Interview Q&A": Format as text with questions starting with "**Q: " and answers with "**A: ". Separate Q&A pairs with double newlines.
        - "ATS-optimized keyword list": Provide as formatted text with placement suggestions
        - "Suggested rewrites": Provide as bullet-pointed text
        
        Format Requirements:
        {format_instructions}

        Remember: Return ONLY the JSON object with no additional formatting or text.
        """,
        input_variables=["resume", "jobdes", "format_instructions"],
    )
    
    prompt = template.format_prompt(
        resume=resume,
        jobdes=jobdes,
        format_instructions=format_instructions
    )
    return output_parser, prompt

# 6. Define function to visualize data for analysis
def visualize_data(resume, jobdes):
    response_schemas = [
        ResponseSchema(name="visual Match Percentage", description="Integer 0-100 representing overall match percentage"),
        ResponseSchema(name="visual Missing / Weak Skills", description="List of strings of skills missing or weak in resume"),
        ResponseSchema(name="visual Confidence scores", description="Object mapping categories to scores between 0 and 1"),
        ResponseSchema(name="visual Resume Skills", description="List of skills extracted from the resume"),
        ResponseSchema(name="visual Job Skills", description="List of skills extracted from the job description"),
        ResponseSchema(name="visual Candidate Experience (years)", description="Number of years of candidate experience (int or float)"),
        ResponseSchema(name="visual Required Experience (years)", description="Number of years required by the job (int or float)"),
        ResponseSchema(name="visual Resume Sections", description="Object mapping resume section names to numeric weights or percentages"),
    ]

    output_parser = StructuredOutputParser.from_response_schemas(response_schemas)
    format_instructions = output_parser.get_format_instructions()

    prompt_template = PromptTemplate(
        template="""You are a precise JSON-outputting assistant. You MUST return ONLY valid JSON in the exact format specified.

CRITICAL INSTRUCTIONS:
1. Return ONLY valid JSON - no additional text, explanations, or markdown
2. Use the exact field names provided in the format instructions
3. If a field value is unknown, return reasonable defaults (0 for numbers, [] for lists, {{}} for objects)
4. Ensure all JSON strings are properly escaped
5. Do not include any text before or after the JSON object

FORMAT INSTRUCTIONS:
{format_instructions}

INPUT DATA:
Resume: {resume_text}
Job Description: {job_text}

REQUIREMENTS:
- "visual Match Percentage" must be an integer 0–100
- "visual Confidence scores" keys must be strings, values must be floats between 0 and 1
- All lists should contain strings
- All experience values should be numeric

Remember: Return ONLY the JSON object with no additional formatting or text.
""",
        input_variables=["resume_text", "job_text", "format_instructions"]
    )

    prompt = prompt_template.format_prompt(
        resume_text=str(resume),
        job_text=str(jobdes),
        format_instructions=format_instructions
    )
    return output_parser, prompt

# 7. Create PDF resume function
def create_resume_pdf(resume_data: dict, file_name: str = "resume.pdf") -> tuple[bool, str]:
    """
    Create a professional PDF resume with black-only colors
    Returns: (success: bool, base64_pdf_data: str or error_message: str)
    """
    try:
        def clean_unicode_text(text):
            """Clean Unicode characters that can't be encoded in latin-1"""
            if not isinstance(text, str):
                return str(text)
            
            replacements = {
                '\u2013': '-', '\u2014': '--', '\u2018': "'", '\u2019': "'",
                '\u201c': '"', '\u201d': '"', '\u2022': '•', '\u2026': '...',
                '\u00a0': ' '
            }
            
            for unicode_char, ascii_char in replacements.items():
                text = text.replace(unicode_char, ascii_char)
            
            text = re.sub(r'[^\x00-\x7F]+', '', text)
            return text

        def extract_personal_info(resume_data):
            """Extract personal information from resume data"""
            personal_info = {
                'name': resume_data.get('Name', ''),
                'email': resume_data.get('Email', ''),
                'phone': resume_data.get('Phone', ''),
                'linkedin': resume_data.get('LinkedIn', '')
            }
            
            if personal_info['name'] or personal_info['email']:
                return personal_info
            
            # Fallback: Extract from full resume text
            full_text = ""
            for key, value in resume_data.items():
                if isinstance(value, str):
                    full_text += value + " "
            
            # Extract email addresses
            email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
            emails = re.findall(email_pattern, full_text)
            email = emails[0] if emails else None
            
            # Extract phone numbers
            phone_patterns = [
                r'\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})',
                r'\+?[0-9]{1,4}[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,4}',
                r'\b\d{10}\b'
            ]
            phone = None
            for pattern in phone_patterns:
                phone_matches = re.findall(pattern, full_text)
                if phone_matches:
                    phone = phone_matches[0] if isinstance(phone_matches[0], str) else ''.join(phone_matches[0])
                    break
            
            # Extract LinkedIn
            linkedin_pattern = r'linkedin\.com/in/[\w-]+'
            linkedin_match = re.search(linkedin_pattern, full_text.lower())
            linkedin = f"https://{linkedin_match.group()}" if linkedin_match else None
            
            # Extract name
            name = None
            if 'Name:' in full_text:
                name_match = re.search(r'Name:\s*([A-Z][a-z]+ [A-Z][a-z]+)', full_text)
                if name_match:
                    name = name_match.group(1)
            else:
                name_patterns = [
                    r'([A-Z][a-z]+ [A-Z][a-z]+)',
                    r'([A-Z][a-z]+ [A-Z]\. [A-Z][a-z]+)',
                    r'([A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+)'
                ]
                for pattern in name_patterns:
                    name_match = re.search(pattern, full_text)
                    if name_match:
                        name = name_match.group(1)
                        break
            
            return {
                'name': name or 'Professional Candidate',
                'email': email,
                'phone': phone,
                'linkedin': linkedin
            }

        # Create PDF object
        pdf = FPDF()
        pdf.add_page()
        pdf.set_margins(20, 20, 20)

        def add_line():
            """Add horizontal line"""
            pdf.set_draw_color(200, 200, 200)
            current_y = pdf.get_y()
            pdf.line(20, current_y, 190, current_y)
            pdf.ln(5)

        # Extract personal information
        personal_info = extract_personal_info(resume_data)
        real_name = clean_unicode_text(personal_info['name'])

        # HEADER SECTION
        # Name
        pdf.set_font('Arial', 'B', 20)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(0, 10, real_name.upper(), ln=True, align='C')
        pdf.ln(3)

        # Professional Title
        work_exp = clean_unicode_text(resume_data.get('Work Experience', ''))
        title = "SOFTWARE ENGINEER"
        if "UI/UX" in work_exp or "Designer" in work_exp:
            title = "UI/UX DESIGNER & DATA ANALYST"
        elif "Data" in work_exp or "Analyst" in work_exp:
            title = "DATA ANALYST"
        elif "Developer" in work_exp:
            title = "SOFTWARE DEVELOPER"

        pdf.set_font('Arial', '', 14)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(0, 8, title, ln=True, align='C')
        pdf.ln(2)

        # Contact Information
        contact_parts = []
        if personal_info['email']:
            contact_parts.append(f"Email: {personal_info['email']}")
        if personal_info['phone']:
            contact_parts.append(f"Phone: {personal_info['phone']}")
        if personal_info['linkedin']:
            contact_parts.append(f"LinkedIn: {personal_info['linkedin']}")

        if contact_parts:
            pdf.set_font('Arial', '', 10)
            pdf.set_text_color(0, 0, 0)
            contact_line = " | ".join(contact_parts)
            pdf.cell(0, 5, contact_line, ln=True, align="C")

        add_line()

        # EDUCATION SECTION
        if resume_data.get('Education'):
            pdf.set_font('Arial', 'B', 12)
            pdf.set_text_color(0, 0, 0)
            pdf.cell(0, 8, 'EDUCATION', ln=True)
            add_line()

            pdf.set_font('Arial', '', 10)
            education = clean_unicode_text(resume_data.get('Education'))
            edu_lines = education.split('\n') if '\n' in education else [education]
            for line in edu_lines:
                if line.strip():
                    pdf.cell(5, 5, '*', ln=False)
                    pdf.cell(0, 5, line.strip(), ln=True)
            pdf.ln(3)

        # SKILLS SECTION
        if resume_data.get('Skills'):
            pdf.set_font('Arial', 'B', 12)
            pdf.set_text_color(0, 0, 0)
            pdf.cell(0, 8, 'TECHNICAL SKILLS', ln=True)
            add_line()

            pdf.set_font('Arial', '', 10)
            skills = clean_unicode_text(resume_data.get('Skills'))

            if ',' in skills:
                skills_list = [skill.strip() for skill in skills.split(',')]
                current_line = ""
                for skill in skills_list:
                    test_line = current_line + skill + ", "
                    if pdf.get_string_width(test_line) < 145:
                        current_line = test_line
                    else:
                        if current_line:
                            pdf.cell(5, 5, '*', ln=False)
                            pdf.cell(0, 5, current_line.rstrip(', '), ln=True)
                        current_line = skill + ", "
                if current_line:
                    pdf.cell(5, 5, '*', ln=False)
                    pdf.cell(0, 5, current_line.rstrip(', '), ln=True)
            else:
                pdf.cell(5, 5, '*', ln=False)
                pdf.cell(0, 5, skills, ln=True)
            pdf.ln(3)

        # WORK EXPERIENCE SECTION
        if resume_data.get('Work Experience'):
            pdf.set_font('Arial', 'B', 12)
            pdf.set_text_color(0, 0, 0)
            pdf.cell(0, 8, 'PROFESSIONAL EXPERIENCE', ln=True)
            add_line()

            pdf.set_font('Arial', '', 10)
            work_exp = clean_unicode_text(resume_data.get('Work Experience'))
            work_lines = work_exp.split('\n') if '\n' in work_exp else [work_exp]
            for line in work_lines:
                if line.strip():
                    pdf.cell(5, 5, '*', ln=False)
                    pdf.cell(0, 5, line.strip(), ln=True)
            pdf.ln(3)

        # PROJECTS SECTION
        if resume_data.get('Projects'):
            pdf.set_font('Arial', 'B', 12)
            pdf.set_text_color(0, 0, 0)
            pdf.cell(0, 8, 'PROJECTS', ln=True)
            add_line()

            pdf.set_font('Arial', '', 10)
            projects = clean_unicode_text(resume_data.get('Projects'))
            project_lines = projects.split('\n') if '\n' in projects else [projects]
            for line in project_lines:
                if line.strip():
                    pdf.cell(5, 5, '*', ln=False)
                    pdf.cell(0, 5, line.strip(), ln=True)
            pdf.ln(3)

        # CERTIFICATES SECTION
        if resume_data.get('Certificates'):
            pdf.set_font('Arial', 'B', 12)
            pdf.set_text_color(0, 0, 0)
            pdf.cell(0, 8, 'CERTIFICATIONS', ln=True)
            add_line()

            pdf.set_font('Arial', '', 10)
            certificates = clean_unicode_text(resume_data.get('Certificates'))
            cert_lines = certificates.split('\n') if '\n' in certificates else [certificates]
            for line in cert_lines:
                if line.strip():
                    pdf.cell(5, 5, '*', ln=False)
                    pdf.cell(0, 5, line.strip(), ln=True)
            pdf.ln(3)

        # ACHIEVEMENTS SECTION
        if resume_data.get('Achievements'):
            pdf.set_font('Arial', 'B', 12)
            pdf.set_text_color(0, 0, 0)
            pdf.cell(0, 8, 'ACHIEVEMENTS', ln=True)
            add_line()

            pdf.set_font('Arial', '', 10)
            achievements = clean_unicode_text(resume_data.get('Achievements'))
            achievement_lines = achievements.split('\n') if '\n' in achievements else [achievements]
            for line in achievement_lines:
                if line.strip():
                    pdf.cell(5, 5, '*', ln=False)
                    pdf.cell(0, 5, line.strip(), ln=True)
            pdf.ln(3)

        # FOOTER
        current_y = pdf.get_y()
        if current_y < 270:
            pdf.ln(5)
            pdf.set_font('Arial', 'I', 8)
            pdf.set_text_color(128, 128, 128)
            pdf.cell(0, 5, f'Generated on: {datetime.datetime.now().strftime("%B %d, %Y")}', ln=True, align='C')

        # Convert to base64
        try:
            pdf_content = pdf.output(dest='S')
            
            if isinstance(pdf_content, bytes):
                pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')
            else:
                pdf_content = clean_unicode_text(pdf_content)
                pdf_bytes = pdf_content.encode('latin1', errors='replace')
                pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
            
            return True, pdf_base64
            
        except Exception as e:
            return False, f"PDF generation error: {str(e)}"

    except Exception as e:
        return False, f"Resume PDF creation failed: {str(e)}"
    








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
        "timestamp": datetime.datetime.now().isoformat(),
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