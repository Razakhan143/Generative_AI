import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// API utility functions for calling the backend

export interface ResumeAnalysis {
  Education: string[];
  Skills: string[];
  Achievements: string[];
  "Work Experience": string[];
  Projects: string[];
  Certificates: string[];
}

export interface JobAnalysis {
  required_skills: string[];
  responsibilities: string[];
  qualifications: string[];
}

export interface MatchResult {
  overall_score: number;
  skill_match: number;
  experience_match: number;
  recommendations: string[];
}

export interface ProcessResumeResponse {
  success: boolean;
  resume_analysis?: ResumeAnalysis;
  job_analysis?: JobAnalysis;
  match_result?: MatchResult;
  visualization?: any;
  error?: string;
}

export interface GenerateResumeResponse {
  success: boolean;
  improved_resume?: any;
  suggestions?: string[];
  error?: string;
}

/**
 * Process a resume against a job description
 */
export async function processResume(
  resumeFile: File,
  jobDescription: string,
  jobUrl?: string
): Promise<ProcessResumeResponse> {
  try {
    const formData = new FormData();
    formData.append('resume', resumeFile);
    formData.append('jobDescription', jobDescription);
    if (jobUrl) {
      formData.append('jobUrl', jobUrl);
    }

    const response = await fetch('/api/process-resume', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ProcessResumeResponse = await response.json();
    return result;
  } catch (error) {
    console.error('Error processing resume:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Generate an improved resume
 */
export async function generateResume(
  resumeText: string,
  jobDescription: string
): Promise<GenerateResumeResponse> {
  try {
    const response = await fetch('/api/generate-resume', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resumeText,
        jobDescription,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: GenerateResumeResponse = await response.json();
    return result;
  } catch (error) {
    console.error('Error generating resume:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Health check for the backend
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch('/api/health', {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
}
