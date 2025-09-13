import re
from fpdf import FPDF
from PyPDF2 import PdfReader
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import StructuredOutputParser, ResponseSchema
from langchain_core.prompts import PromptTemplate
import datetime

# 1. Extract text from PDF
def extract_text_from_pdf(pdf_path: str) -> str:
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text



# 2. Define function to parse resume using LLM
def parse_resume_with_llm(text: str) :
    # Define structured schema
    response_schemas = [
        ResponseSchema(name="Experience Level", description="by resume text, categorize as Entry-level, Mid-level, Senior-level, or Executive"),
        ResponseSchema(name="Education", description="latest education details ongoing or completed(only name of degree and year/ongoing)"),
        ResponseSchema(name="Skills", description="List of technical skills"),
        ResponseSchema(name="Achievements", description="List of achievements"),
        ResponseSchema(name="Work Experience", description="year of experience as position and field"),
        ResponseSchema(name="Projects", description="List of projects"),
        ResponseSchema(name="Certificates", description="List of certificates")
    ]

    # Create parser
    output_parser = StructuredOutputParser.from_response_schemas(response_schemas)
    format_instructions = output_parser.get_format_instructions()

    # Prompt
    prompt = ChatPromptTemplate.from_template("""
    You are a professional resume parser.
    Extract the following fields from the resume text below and return in JSON format.

    {format_instructions}

    Resume Text:
    {resume_text}
    """)

    # Format messages
    prompt = prompt.format_messages(
        resume_text=text,
        format_instructions=format_instructions
    )
    return output_parser,prompt


# checking weather the text contains link or not
def contains_link(text: str) -> bool:
    pattern = r"(https?://\S+|www\.\S+)"
    return bool(re.search(pattern, text))



# 3. Define function to parse job description using LLM
def job_description(text: str) -> str:
    con_link=contains_link(text)
    if con_link is True:
        desc='The job description is provided as a link. Please visit the link to view the full job description.'

    else:
        desc='The job description is provided as text.'

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
        """,
        input_variables=["job_description", "format_instructions"],
    )
    prompt = template.format_prompt(
        desc=desc,
        job_description=text,
        format_instructions=format_instructions
    )
    return output_parser,prompt


# 4. Define function to compare resume and job description
def comparing(resume : dict,jobdes : dict)-> str:
    response_schema = [
        ResponseSchema(name="Match Percentage", description="Carefully and strictly analyze Percentage of match between resume and job description this is mandatory thing and important feature correctly analyze it."),
        ResponseSchema(name="Missing / Weak Skills", description="List of skills that are missing or weak in the resume"),
        ResponseSchema(name="Suggested rewrites", description="List of suggested rewrites for the resume"),
        ResponseSchema(name="ATS-optimized keyword list", description="Produce an ATS-optimized keyword list and highlight where to put them"),
        ResponseSchema(name="Interview Q&A", description="Suggest potential interview questions and answers based on the job description and resume. Format each as '**Q: [question]**\n**A: [answer]**\n\n' with clear separation between questions and answers."),
        ResponseSchema(name="Confidence scores", description="Provide Confidence scores and allow users to accept/modify the generated resume and export (PDF/DOCX)."),
    ]
    output_parser = StructuredOutputParser.from_response_schemas(response_schema)
    format_instructions = output_parser.get_format_instructions()
    template = PromptTemplate(
        template="""You are a Professional job interviewer who has 15 or more years of experience. Your task is to evaluate the candidate's resume details as {resume} against the job description {jobdes} and provide feedback and return in structured format:
        
        Important formatting instructions:
        - For "Interview Q&A": Format as text with each question starting with "**Q: " and each answer starting with "**A: ". Separate each Q&A pair with double newlines.
        - For "Match Percentage": Provide only the number (e.g., "85")
        - For "ATS-optimized keyword list": Provide as formatted text with placement suggestions
        - For "Suggested rewrites": Provide as bullet-pointed text
        
        {format_instructions}"""
    )
    prompt = template.format_prompt(
        resume=resume,
        jobdes=jobdes,
        format_instructions=format_instructions
    )
    return output_parser,prompt



# 5. Define function to visualize data for analysis
def visualize_data(resume, jobdes):
    from langchain.prompts import ChatPromptTemplate
    from langchain.output_parsers import StructuredOutputParser, ResponseSchema

    # 1. Define schema
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

    # 2. Create parser
    output_parser = StructuredOutputParser.from_response_schemas(response_schemas)
    format_instructions = output_parser.get_format_instructions()

    # 3. Prompt template
    prompt_template = ChatPromptTemplate.from_template(
        """You are a precise JSON-outputting assistant.

Produce ONLY valid JSON that exactly follows the structure described in the instructions below (no additional commentary, no explanation).
If a field value is unknown, return a reasonable default (0 for numbers, [] for lists, curly braces for objects).

FORMAT INSTRUCTIONS:
{format_instructions}

INPUT:
Resume Text:
{resume_text}

Job Description Text or URL:
{job_text}

Important:
- Ensure "Match Percentage" is an integer 0–100.
- "Confidence scores" keys must be strings and values floats between 0 and 1.
- "ATS Keywords" values should be floats in range 0–1.
- "Timeline" should be an array of objects, each with integer "year" and string "event".
- Output must be parseable by json.loads().

Output only the JSON object.
"""
    )

    # 4. Format prompt with **matching keys**
    prompt = prompt_template.format_prompt(
        resume_text=resume,   # matches {resume_text}
        job_text=jobdes,      # matches {job_text}
        format_instructions=format_instructions
    )

    return output_parser, prompt






# 6. Function to create resume PDF from parsed data
def generate_resume_from_feedback(feedback_data, candidate_info):
    """
    feedback_data: dict -> The AI analysis feedback including improvements, ATS keywords, etc.
    candidate_info: dict -> Current resume data (skills, experience, education, etc.)
    """

    # 2. Define the schema for the final resume
    resume_schemas = [
        ResponseSchema(name="Name", description="Extract candidate name from work experience, education, or projects. If not found, generate a professional name like 'John Smith' or 'Sarah Johnson'"),
        ResponseSchema(name="Contact Info", description="Generate professional contact information: phone number (format: (xxx) xxx-xxxx), professional email, LinkedIn profile URL, and location (city, state)"),
        ResponseSchema(name="Summary", description="Create a compelling 3-4 line professional summary tailored to the target job position, highlighting key skills and experience"),
        ResponseSchema(name="Education", description="Format education with institution name, degree, graduation year, and relevant coursework or GPA if strong"),
        ResponseSchema(name="Work Experience", description="Format work experience with company, position, dates, and 3-4 bullet points of quantified achievements using action verbs"),
        ResponseSchema(name="Projects", description="Format projects with project names, technologies used, brief description, and impact/results achieved"),
        ResponseSchema(name="Skills", description="Organize technical skills by categories (Programming Languages, Frameworks, Tools, etc.) and include the recommended missing skills"),
        ResponseSchema(name="Certificates", description="List certifications with issuing organization and year, formatted professionally"),
        ResponseSchema(name="Additional Info", description="Include achievements, awards, languages, or other relevant information that strengthens the application"),
    ]

    # 3. Create parser
    output_parser = StructuredOutputParser.from_response_schemas(resume_schemas)
    format_instructions = output_parser.get_format_instructions()
    
    # Prompt template for generating a resume
    resume_prompt_template = """
    You are a professional resume writer with expertise in creating ATS-optimized resumes.
    
    Create a complete, well-structured resume for the candidate based on their ACTUAL information provided below.
    
    IMPORTANT: Use the candidate's REAL information whenever available. Do not use generic placeholders.
    
    CURRENT CANDIDATE INFORMATION:
    {candidate_data}
    
    AI ANALYSIS AND FEEDBACK:
    {feedback_data}
    
    INSTRUCTIONS:
    1. Extract the candidate's actual name from their work experience, education, or any available data
    2. Create realistic professional contact information (not generic placeholders)
    3. Use the candidate's existing education, work experience, and projects as the foundation
    4. Incorporate the suggested improvements from the AI feedback naturally
    5. Add the recommended ATS keywords organically into relevant sections
    6. Address missing skills by highlighting transferable skills or suggesting learning initiatives
    7. Ensure the resume targets the specific job position mentioned in the feedback
    8. Make the resume professional, concise, and impactful with quantified achievements
    9. Create a compelling professional summary that reflects the candidate's actual background
    10. Maintain consistency in formatting and ensure all dates and details are realistic
    
    {format_instructions}
    
    Output only a valid JSON object with the specified fields. Ensure all content is professional, realistic, and based on the actual candidate information provided.
    """

    # 4. Create prompt with both candidate and feedback data
    prompt_template = ChatPromptTemplate.from_template(resume_prompt_template)
    prompt = prompt_template.format_prompt(
        candidate_data=candidate_info,
        feedback_data=feedback_data,
        format_instructions=format_instructions
    )

    return output_parser, prompt



# Function to generate PDF from parsed resume JSON


def create_resume_pdf(parsed_resume, file_name="Resume.pdf"):
    # Helper function to clean Unicode characters that can't be encoded in latin-1
    def clean_unicode_text(text):
        if not isinstance(text, str):
            return text
        # Replace common Unicode characters with ASCII equivalents
        replacements = {
            '\u2013': '-',  # en dash
            '\u2014': '--', # em dash
            '\u2018': "'",  # left single quotation mark
            '\u2019': "'",  # right single quotation mark
            '\u201c': '"',  # left double quotation mark
            '\u201d': '"',  # right double quotation mark
            '\u2022': '•',  # bullet point (this should work in latin-1)
            '\u2026': '...', # horizontal ellipsis
            '\u00a0': ' ',  # non-breaking space
        }
        
        for unicode_char, replacement in replacements.items():
            text = text.replace(unicode_char, replacement)
        
        # Remove any remaining characters that can't be encoded in latin-1
        try:
            text.encode('latin-1')
        except UnicodeEncodeError:
            # If there are still problematic characters, encode/decode to remove them
            text = text.encode('latin-1', errors='ignore').decode('latin-1')
        
        return text
    
    # Clean all text fields in parsed_resume
    cleaned_resume = {}
    for key, value in parsed_resume.items():
        if isinstance(value, str):
            cleaned_resume[key] = clean_unicode_text(value)
        else:
            cleaned_resume[key] = value
    
    parsed_resume = cleaned_resume
    
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # Add Unicode font (DejaVuSans.ttf in same folder)
    try:
        pdf.add_font("DejaVu", "", "font/DejaVuSans.ttf", uni=True)
        pdf.add_font("DejaVu", "B", "font/DejaVuSans-Bold.ttf", uni=True)
        font_name = "DejaVu"
    except:
        # Fallback to built-in font if custom fonts not available
        font_name = "Arial"
    
    # Helper function to add section headers
    def add_section_header(title):
        pdf.ln(5)
        pdf.set_font(font_name, "B", 12)
        pdf.set_fill_color(240, 240, 240)  # Light gray background
        pdf.cell(0, 8, title.upper(), ln=True, fill=True)
        pdf.ln(2)
    
    # Helper function to parse contact info string
    def parse_contact_string(contact_str):
        contact_dict = {}
        if isinstance(contact_str, str):
            # Parse mobile
            mobile_match = re.search(r'Mobile:\s*([^|]+)', contact_str)
            if mobile_match:
                contact_dict['Mobile'] = mobile_match.group(1).strip()
            
            # Parse email
            email_match = re.search(r'Email:\s*([^|]+)', contact_str)
            if email_match:
                contact_dict['Email'] = email_match.group(1).strip()
            
            # Parse LinkedIn
            linkedin_match = re.search(r'LinkedIn:\s*([^|]+)', contact_str)
            if linkedin_match:
                contact_dict['LinkedIn'] = linkedin_match.group(1).strip()
            
            # Parse GitHub
            github_match = re.search(r'GitHub:\s*([^|]+)', contact_str)
            if github_match:
                contact_dict['GitHub'] = github_match.group(1).strip()
        
        return contact_dict
    
    # Header - Name and Title
    pdf.set_font(font_name, "B", 20)
    name = parsed_resume.get('Name', 'CANDIDATE NAME')
    pdf.cell(0, 12, name.upper(), ln=True, align="C")
    pdf.ln(3)
    
    # Contact Information
    contact_info = parsed_resume.get('Contact Info', '')
    if contact_info:
        if isinstance(contact_info, str):
            contact_dict = parse_contact_string(contact_info)
        else:
            contact_dict = contact_info
        
        pdf.set_font(font_name, "", 10)
        contact_lines = []
        
        # Format contact info in a clean layout
        if contact_dict.get('Mobile'):
            contact_lines.append(f"Mobile: {contact_dict['Mobile']}")
        if contact_dict.get('Email'):
            contact_lines.append(f"Email: {contact_dict['Email']}")
        if contact_dict.get('LinkedIn'):
            contact_lines.append(f"LinkedIn: {contact_dict['LinkedIn']}")
        if contact_dict.get('GitHub'):
            contact_lines.append(f"GitHub: {contact_dict['GitHub']}")
        
        # Display contact info in two lines if needed
        if len(contact_lines) > 2:
            line1 = " | ".join(contact_lines[:2])
            line2 = " | ".join(contact_lines[2:])
            pdf.cell(0, 5, line1, ln=True, align="C")
            pdf.cell(0, 5, line2, ln=True, align="C")
        else:
            contact_line = " | ".join(contact_lines)
            pdf.cell(0, 5, contact_line, ln=True, align="C")
    
    # Summary Section
    summary = parsed_resume.get('Summary', '')
    if summary:
        add_section_header("PROFESSIONAL SUMMARY")
        pdf.set_font(font_name, "", 11)
        pdf.multi_cell(0, 6, summary, align="J")
    
    # Education Section
    education = parsed_resume.get('Education', '')
    if education:
        add_section_header("EDUCATION")
        pdf.set_font(font_name, "", 11)
        
        if isinstance(education, str):
            # Parse education string
            edu_entries = education.split('\n')
            for entry in edu_entries:
                if entry.strip():
                    # Split by | to separate institution, degree, dates, etc.
                    parts = [part.strip() for part in entry.split('|')]
                    if len(parts) >= 3:
                        institution = parts[0]
                        degree = parts[1]
                        dates_info = parts[2]
                        
                        # Institution and dates
                        pdf.set_font(font_name, "B", 11)
                        pdf.cell(0, 6, f"{institution} | {dates_info}", ln=True)
                        
                        # Degree
                        pdf.set_font(font_name, "", 11)
                        pdf.cell(0, 6, degree, ln=True)
                        
                        # Additional info (GPA, etc.)
                        if len(parts) > 3:
                            pdf.cell(0, 6, parts[3], ln=True)
                        pdf.ln(2)
                    else:
                        pdf.multi_cell(0, 6, entry.strip())
                        pdf.ln(2)
    
    # Work Experience Section
    work_experience = parsed_resume.get('Work Experience', '')
    if work_experience:
        add_section_header("WORK EXPERIENCE")
        pdf.set_font(font_name, "", 11)
        
        if isinstance(work_experience, str):
            # Split by job entries (assuming each job starts with a position title)
            jobs = work_experience.split('\n\n')
            for job in jobs:
                if job.strip():
                    lines = job.strip().split('\n')
                    if lines:
                        # First line is position | company | dates
                        header = lines[0]
                        pdf.set_font(font_name, "B", 11)
                        pdf.cell(0, 6, header, ln=True)
                        
                        # Responsibilities
                        pdf.set_font(font_name, "", 11)
                        for line in lines[1:]:
                            if line.strip().startswith('*'):
                                pdf.multi_cell(0, 5, f"• {line.strip()[1:].strip()}")
                        pdf.ln(3)
    
    # Projects Section
    projects = parsed_resume.get('Projects', '')
    if projects:
        add_section_header("PROJECTS")
        pdf.set_font(font_name, "", 11)
        
        if isinstance(projects, str):
            # Split projects by empty lines or project titles (ALL CAPS)
            project_entries = projects.split('\n\n')
            for project in project_entries:
                if project.strip():
                    lines = project.strip().split('\n')
                    if lines:
                        # First line is project title
                        title_line = lines[0]
                        pdf.set_font(font_name, "B", 11)
                        pdf.cell(0, 6, title_line, ln=True)
                        
                        # Project details
                        pdf.set_font(font_name, "", 11)
                        for line in lines[1:]:
                            if line.strip().startswith('*'):
                                pdf.multi_cell(0, 5, f"• {line.strip()[1:].strip()}")
                        pdf.ln(3)
    
    # Skills Section
    skills = parsed_resume.get('Skills', '')
    if skills:
        add_section_header("TECHNICAL SKILLS")
        pdf.set_font(font_name, "", 11)
        
        if isinstance(skills, str):
            # Parse skills by categories
            skill_lines = skills.split('\n')
            for line in skill_lines:
                if ':' in line and line.strip():
                    category, skills_list = line.split(':', 1)
                    pdf.set_font(font_name, "B", 11)
                    pdf.cell(0, 6, f"{category.strip()}:", ln=True)
                    pdf.set_font(font_name, "", 11)
                    pdf.multi_cell(0, 5, f"  {skills_list.strip()}")
                    pdf.ln(1)
    
    # Certificates Section
    certificates = parsed_resume.get('Certificates', '')
    if certificates:
        add_section_header("CERTIFICATIONS")
        pdf.set_font(font_name, "", 11)
        
        if isinstance(certificates, str):
            cert_lines = certificates.split('\n')
            for line in cert_lines:
                if line.strip():
                    pdf.cell(0, 6, f"• {line.strip()}", ln=True)
    
    # Additional Info Section (Achievements)
    additional_info = parsed_resume.get('Additional Info', '')
    if additional_info:
        add_section_header("ACHIEVEMENTS")
        pdf.set_font(font_name, "", 11)
        
        if isinstance(additional_info, str):
            # Parse achievements
            sections = additional_info.split('\n\n')
            for section in sections:
                if section.strip():
                    lines = section.strip().split('\n')
                    if lines:
                        # Check if it's a main achievement title
                        if lines[0].strip() and not lines[0].startswith('*'):
                            pdf.set_font(font_name, "B", 11)
                            pdf.cell(0, 6, lines[0].strip(), ln=True)
                            pdf.set_font(font_name, "", 11)
                            
                            # Achievement details
                            for line in lines[1:]:
                                if line.strip().startswith('*'):
                                    pdf.multi_cell(0, 5, f"• {line.strip()[1:].strip()}")
                            pdf.ln(2)
    
    # Save the PDF
    try:
        pdf.output(file_name)
        print(f"Resume saved as {file_name}")
        return True
    except Exception as e:
        print(f"Error saving PDF: {e}")
        return False
    



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