from html import parser
from click import prompt
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
import helper_function
import traceback
import sys

load_dotenv()
analysis = True
generate_resume = True
# Initialize model
try:
    model = ChatGoogleGenerativeAI(model="gemini-2.5-pro")
except Exception as e:
    print("❌ Error initializing model:", e)
    sys.exit(1)

# File and Job URL
resume_path = r"RAZA-RESUME.pdf"
input_text = "https://www.linkedin.com/jobs/collections/top-applicant/?currentJobId=3987286133"

# Step 1: Extract Resume
try:
    resume_text = helper_function.extract_text_from_pdf(resume_path)
    if not resume_text.strip():
        raise ValueError("Resume PDF is empty or unreadable.")
except Exception as e:
    print("❌ Error extracting resume text:", e)
    traceback.print_exc()
    sys.exit(1)

# Step 2: Parse Resume
try:
    parser_resume, resume_prompt = helper_function.parse_resume_with_llm(resume_text)
    res_resume = (model | parser_resume).invoke(resume_prompt)
except Exception as e:
    print("❌ Error parsing resume with LLM:", e)
    traceback.print_exc()
    res_resume = None

# Step 3: Parse Job Description
try:
    parser_jobdes, jobdes_prompt = helper_function.job_description(input_text)
    res_jobdes = (model | parser_jobdes).invoke(jobdes_prompt)
except Exception as e:
    print("❌ Error parsing job description:", e)
    traceback.print_exc()
    res_jobdes = None

# Step 4: Compare Resume & Job Description
response = None
if res_resume and res_jobdes:
    try:
        parser_main, main_prompt = helper_function.comparing(res_resume, res_jobdes)
        final_chain = model | parser_main
        response = final_chain.invoke(main_prompt)
    except Exception as e:
        print("❌ Error comparing resume with job description:", e)
        traceback.print_exc()
else:
    print("⚠️ Skipping comparison because resume or job description parsing failed.")

# Step 5: Print Result
if response:
    print("\n📌 Comparison Result:\n")
    print(response)
else:
    print("\n⚠️ No final comparison result available.")

if analysis:
    try:
        print("🔍 Generating data visualization instructions...")
        parser_visual, visual_prompt = helper_function.visualize_data(res_resume, res_jobdes)
        final_chain = model | parser_visual
        visualize_value = final_chain.invoke(visual_prompt)
        print("\n📊 Data Visualization Instructions:\n")
        print(visualize_value)
    except Exception as e:
        print("❌ Error generating data visuals:", e)
        traceback.print_exc()


if generate_resume:
    try:
        resume_parser, resume_prompt = helper_function.generate_resume_from_feedback(response, resume_text)
        res_gen_chain = model | resume_parser

        output_resume = res_gen_chain.invoke(resume_prompt)

        print("\n📝 Generated Resume JSON:\n")

        name = input("Enter your name for the resume file: ").replace(" ", "_")
        helper_function.create_resume_pdf(output_resume, file_name=f"{name}.pdf")
        print(f"\n✅ Resume PDF '{name}.pdf' generated successfully.")
    except Exception as e:
        print("❌ Error generating resume PDF:", e)
        traceback.print_exc()
    









