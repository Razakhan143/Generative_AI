"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Briefcase, User, TrendingUp } from "lucide-react"
import { FileUpload } from "@/components/file-upload"
import { MatchResults } from "@/components/match-results"
import { processResume, ProcessResumeResponse } from "@/lib/api"

interface AnalysisResult {
  analysis: {
    candidateExperience: string
    confidenceScores: string
    jobSkills: string
    matchPercentage: string
    missingWeakSkills: string
    requiredExperience: string
    resumeSections: string
    resumeSkills: string
  }
  compareResponse: {
    atsOptimizedKeywordList: string
    confidenceScores: string
    interviewQA: string
    matchPercentage: string
    missingWeakSkills: string
    suggestedRewrites: string
  }
  jobDescription: {
    employmentType: string
    experienceLevel: string
    jobTitle: string
    qualifications: string
    requiredSkills: string
    responsibilities: string
    yearOfExperience?: string
  }
  resumeText: {
    name?: string
    email?: string
    phone?: string
    linkedin?: string
    github?: string
    achievements: string
    certificates: string
    education: string
    experienceLevel: string
    projects: string
    skills: string
    workExperience: string
    yearOfExperience?: string
  }
  success: boolean
}

export function ResumeJobMatcher() {
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [jobDescription, setJobDescription] = useState("")
  const [jobUrl, setJobUrl] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [inputMethod, setInputMethod] = useState<"text" | "url">("text")
  const [error, setError] = useState<string | null>(null)
  const [selectedServer, setSelectedServer] = useState<"server1" | "server2" | "server3">("server2")

  const transformApiResult = (result: any): AnalysisResult => {
    console.log("Raw API Result:", result)
    
    return {
      analysis: {
        candidateExperience: result.analysis?.["visual Candidate Experience (years)"] || 
                           result.analysis?.["Candidate Experience (years)"] || "1.67",
        confidenceScores: result.analysis?.["visual Confidence scores"] || 
                         result.analysis?.["Confidence scores"] || "{}",
        jobSkills: result.analysis?.["visual Job Skills"] || 
                  result.analysis?.["Job Skills"] || "",
        matchPercentage: result.analysis?.["visual Match Percentage"] || 
                        result.analysis?.["Match Percentage"] || "60",
        missingWeakSkills: result.analysis?.["visual Missing / Weak Skills"] || 
                          result.analysis?.["Missing / Weak Skills"] || "",
        requiredExperience: result.analysis?.["visual Required Experience (years)"] || 
                           result.analysis?.["Required Experience (years)"] || 
                           result.job_description?.["Year of Experience"] || "0.0",
        resumeSections: result.analysis?.["visual Resume Sections"] || 
                       result.analysis?.["Resume Sections"] || "{}",
        resumeSkills: result.analysis?.["visual Resume Skills"] || 
                     result.analysis?.["Resume Skills"] || ""
      },
      compareResponse: {
        atsOptimizedKeywordList: result.compare_response?.["ATS-optimized keyword list"] || "",
        confidenceScores: result.compare_response?.["Confidence scores"] || "",
        interviewQA: result.compare_response?.["Interview Q&A"] || "",
        matchPercentage: result.compare_response?.["Match Percentage"] || "60%",
        missingWeakSkills: result.compare_response?.["Missing / Weak Skills"] || "",
        suggestedRewrites: result.compare_response?.["Suggested rewrites"] || ""
      },
      jobDescription: {
        employmentType: result.job_description?.["Employment Type"] || "",
        experienceLevel: result.job_description?.["Experience Level"] || "",
        jobTitle: result.job_description?.["Job Title"] || "",
        qualifications: result.job_description?.["Qualifications"] || "",
        requiredSkills: result.job_description?.["Required Skills"] || "",
        responsibilities: result.job_description?.["Responsibilities"] || "",
        yearOfExperience: result.job_description?.["Year of Experience"] || ""
      },
      resumeText: {
        name: result.resume_text?.["Name"] || "",
        email: result.resume_text?.["Email"] || "",
        phone: result.resume_text?.["Phone"] || "",
        linkedin: result.resume_text?.["LinkedIn"] || "",
        github: result.resume_text?.["GitHub"] || "",
        achievements: result.resume_text?.["Achievements"] || "",
        certificates: result.resume_text?.["Certificates"] || "",
        education: result.resume_text?.["Education"] || "",
        experienceLevel: result.resume_text?.["Experience Level"] || "",
        projects: result.resume_text?.["Projects"] || "",
        skills: result.resume_text?.["Skills"] || "",
        workExperience: result.resume_text?.["Work Experience"] || "",
        yearOfExperience: result.resume_text?.["Year of Experience"] || result.analysis?.["Candidate Experience (years)"] || ""
      },
      success: result.success || false
    }
  }

  const handleAnalyze = async () => {
    if (!resumeFile || (!jobDescription && !jobUrl)) {
      setError("Please upload a resume file and provide a job description or URL")
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      const result = await processResume(
        resumeFile,
        jobDescription,
        jobUrl || undefined,
        selectedServer
      )
      console.log("API Result:", result)
      if (result.success) {
        const transformedResult = transformApiResult(result)
        setAnalysisResult(transformedResult)
      } else {
        throw new Error(result.error || "Analysis failed")
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("Failed to communicate")) {
        setError("Backend service unavailable. Please ensure the Streamlit backend is running on port 8501.")
      } else {
        setError(err instanceof Error ? err.message : "An error occurred during analysis")
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  const resetAnalysis = () => {
    setAnalysisResult(null)
    setResumeFile(null)
    setJobDescription("")
    setJobUrl("")
    setError(null)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-4 text-balance">Resume-Job Matching Assistant</h1>
        <p className="text-lg text-muted-foreground text-pretty">
          Upload your resume and job description to get AI-powered matching analysis and recommendations
        </p>
      </div>

      {!analysisResult && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Select AI Server
            </CardTitle>
            <CardDescription>Choose the AI model that best fits your needs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {/* Server 1 - Gemini 2.5 Pro */}
              <Card className={`cursor-pointer transition-all border-2 ${
                selectedServer === "server1" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`} onClick={() => setSelectedServer("server1")}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Server 1</h3>
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedServer === "server1" ? "bg-primary border-primary" : "border-muted-foreground"
                    }`} />
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">Gemini 2.5 Pro</p>
                  <div className="space-y-1 text-xs">
                    <p className="text-green-600">✓ Most accurate and authentic</p>
                    <p className="text-green-600">✓ Deep analysis and insights</p>
                    <p className="text-orange-600">⚠ Takes more time to process (~1.5 - 2 min)</p>
                  </div>
                </CardContent>
              </Card>

              {/* Server 2 - Gemini 2.5 Flash */}
              <Card className={`cursor-pointer transition-all border-2 ${
                selectedServer === "server2" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`} onClick={() => setSelectedServer("server2")}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Server 2</h3>
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedServer === "server2" ? "bg-primary border-primary" : "border-muted-foreground"
                    }`} />
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">Gemini 2.5 Flash (Recommended)</p>
                  <div className="space-y-1 text-xs">
                    <p className="text-green-600">✓ Balanced speed and accuracy</p>
                    <p className="text-green-600">✓ Good analytical depth</p>
                    <p className="text-blue-600">⚡ Moderate processing time (~1 - 1.5 min)</p>
                  </div>
                </CardContent>
              </Card>

              {/* Server 3 - Gemini 2.5 Flash-Lite */}
              <Card className={`cursor-pointer transition-all border-2 ${
                selectedServer === "server3" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`} onClick={() => setSelectedServer("server3")}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Server 3</h3>
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedServer === "server3" ? "bg-primary border-primary" : "border-muted-foreground"
                    }`} />
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">Gemini 2.5 Flash-Lite</p>
                  <div className="space-y-1 text-xs">
                    <p className="text-green-600">✓ Fastest processing (~ less than 30 sec)</p>
                    <p className="text-green-600">✓ Quick basic analysis</p>
                    <p className="text-orange-600">⚠ Less detailed insights</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}

      {!analysisResult ? (
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Resume Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Upload Resume
              </CardTitle>
              <CardDescription>Upload your resume in PDF or DOCX format</CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload
                onFileSelect={setResumeFile}
                selectedFile={resumeFile}
                accept=".pdf,.docx"
                maxSize={10 * 1024 * 1024} // 10MB
              />
            </CardContent>
          </Card>

          {/* Job Description Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Job Description
              </CardTitle>
              <CardDescription>Enter job description text or provide a job posting URL</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={inputMethod} onValueChange={(value) => setInputMethod(value as "text" | "url")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="text">Paste Text</TabsTrigger>
                  <TabsTrigger value="url">Job URL</TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="space-y-4">
                  <div>
                    <Label htmlFor="job-description">Job Description</Label>
                    <Textarea
                      id="job-description"
                      placeholder="Paste the job description here..."
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      rows={8}
                      className="mt-2"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="url" className="space-y-4">
                  <div>
                    <Label htmlFor="job-url">Job Posting URL</Label>
                    <Input
                      id="job-url"
                      type="url"
                      placeholder="https://example.com/job-posting"
                      value={jobUrl}
                      onChange={(e) => setJobUrl(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      ) : (
        <MatchResults result={analysisResult} onReset={resetAnalysis} />
      )}

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {!analysisResult && (
        <div className="flex justify-center mt-8">
          <Button
            onClick={handleAnalyze}
            disabled={!resumeFile || (!jobDescription && !jobUrl) || isAnalyzing}
            size="lg"
            className="px-8"
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                Analyzing...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                Analyze Match
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
