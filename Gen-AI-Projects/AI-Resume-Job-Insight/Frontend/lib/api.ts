// Utility functions for calling the backend API

export interface ResumeAnalysis {
  Education: any[]
  Skills: string[]
  Achievements: any[]
  "Work Experience": any[]
  Projects: any[]
  Certificates: any[]
}

export interface JobAnalysis {
  required_skills: string[]
  required_experience: number
  responsibilities: string[]
  qualifications: string[]
}

export interface MatchResult {
  overall_match_percentage: number
  skill_match_percentage: number
  experience_match_percentage: number
  matching_skills: string[]
  missing_skills: string[]
  recommendations: string[]
}

export interface ProcessResumeResponse {
  success: boolean
  error?: string
  resume_analysis?: ResumeAnalysis
  job_analysis?: JobAnalysis
  match_result?: MatchResult
  visualization?: any
}

export interface GenerateResumeResponse {
  success: boolean
  error?: string
  improved_resume?: any
  suggestions?: string[]
}

/**
 * Process resume and job description to get match analysis
 */
export async function processResume(
  resumeFile: File,
  jobDescription: string,
  jobUrl?: string,
  selectedServer?: string
): Promise<ProcessResumeResponse> {
  try {
    const formData = new FormData()
    formData.append("resume", resumeFile)
    formData.append("jobDescription", jobDescription)
    if (jobUrl) {
      formData.append("jobUrl", jobUrl)
    }
    if (selectedServer) {
      formData.append("selectedServer", selectedServer)
    }

    const response = await fetch("/api/process-resume", {
      method: "POST",
      body: formData,
    })
    const datares = await response.json()
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return datares
  } catch (error) {
    console.error("Error processing resume:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Generate improved resume based on current resume and target job
 */
export async function generateResume(
  resumeText: string,
  jobDescription: string
): Promise<GenerateResumeResponse> {
  try {
    const response = await fetch("/api/generate-resume", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resumeText,
        jobDescription,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error generating resume:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Use the streamlit proxy endpoint (alternative)
 */
export async function useStreamlitProxy(
  endpoint: "process-resume" | "generate-resume",
  data: FormData
): Promise<any> {
  try {
    data.append("endpoint", endpoint)

    const response = await fetch("/api/streamlit-proxy", {
      method: "POST",
      body: data,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error using streamlit proxy:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Extract text from uploaded file (client-side utility)
 */
export function extractTextFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      resolve(text)
    }
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsText(file)
  })
}

/**
 * Convert file to base64 (for direct API calls)
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data:application/pdf;base64, prefix
      const base64 = result.split(",")[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
