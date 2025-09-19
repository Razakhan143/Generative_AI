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
  resume_id?: string
  resume_data?: any  // Contains parsed resume information
  job_data?: any     // Contains parsed job description
  comparison_result?: any  // Contains the main comparison analysis
  visualization_data?: any // Contains visualization data
  // Quota-related properties
  quotaExceeded?: boolean
  serverRestarted?: boolean
  selectedServer?: string
  message?: string
  auto_restarting?: boolean
  auto_restart?: boolean
  error_type?: string
  restart_reason?: string
  server_switch_recommended?: boolean
  alternative_servers?: string[]
  estimated_restart_time?: string
  suggestion?: string
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
    
    // Check for quota exceeded errors first, even if response is not ok
    if (!response.ok) {
      // Check if this is a quota error (status 429 or error message contains quota indicators)
      if (response.status === 500 || response.status === 429 ||
          (datares.error && (
            datares.error.includes("Quota exceeded") ||
            datares.error.includes("You exceeded your current quota") ||
            datares.error.includes("generativelanguage.googleapis.com/generate_content_free_tier_requests") ||
            datares.error.includes("quota_metric")
          ))) {
        // Return the quota error info so frontend can handle it properly
        return {
          success: false,
          error: datares.error || "Quota exceeded",
          quotaExceeded: true,
          selectedServer: selectedServer,
          serverRestarted: datares.serverRestarted || false,
          message: datares.message || "Server quota exceeded. Please try switching to a different server."
        }
      }
      
      // For other HTTP errors, throw as before
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    // Check for successful response with quota exceeded error details
    if (datares && !datares.success) {
      // Check if backend returned auto_restart flag or api_response_error (from safe_gemini_call_with_auto_restart)
      if (datares.auto_restarting || datares.auto_restart || 
          datares.error_type === "quota_exceeded" || 
          datares.error_type === "api_response_error") {
        return {
          success: false,
          error: datares.error || "Server quota exceeded. Auto-restarting...",
          quotaExceeded: true,
          selectedServer: selectedServer,
          serverRestarted: datares.auto_restarting || datares.auto_restart || false,
          message: datares.suggestion || datares.message || "Server quota exceeded. Please try switching to a different server."
        }
      }
      
      // Check if this is a quota error based on error message
      if (datares.error && (
        datares.error.includes("Quota exceeded") ||
        datares.error.includes("You exceeded your current quota") ||
        datares.error.includes("generativelanguage.googleapis.com/generate_content_free_tier_requests") ||
        datares.error.includes("quota_metric") ||
        datares.error.includes("Auto-restarting")
      )) {
        return {
          success: false,
          error: datares.error,
          quotaExceeded: true,
          selectedServer: selectedServer,
          serverRestarted: datares.serverRestarted || datares.auto_restarting || false,
          message: datares.message || datares.suggestion || "Server quota exceeded. Please try switching to a different server."
        }
      }
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
