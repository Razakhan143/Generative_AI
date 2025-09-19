"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Briefcase, User, TrendingUp, Heart, MessageSquare } from "lucide-react"
import { FileUpload } from "@/components/file-upload"
import { MatchResults } from "@/components/match-results"
import { processResume, ProcessResumeResponse } from "@/lib/api"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"

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
  resume_id :{
    Name: string
    Email: string
    Phone: string
    LinkedIn: string
    skills: string
    workExperience: string
    projects: string
    education: string
    certificates: string
    experienceLevel: string
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
  const [showThankYouDialog, setShowThankYouDialog] = useState(false)
  const [showQuotaExceededDialog, setShowQuotaExceededDialog] = useState(false)
  const [quotaErrorInfo, setQuotaErrorInfo] = useState<{
    serverRestarted?: boolean
    selectedServer?: string
    message?: string
  }>({})

 const saveToFirestore = async (data: AnalysisResult) => {
    try {
      await addDoc(collection(db, "resumeJobMatches"), {
        resume_id: data.resume_id,
        Server: selectedServer,
        analysis: data.analysis,
        jobDescription: data.jobDescription,
        success: data.success,
        timestamp: serverTimestamp(),
      })
      // console.log("Data to be saved:", data)  // Debug log
      console.log("Data successfully stored in Firestore")
    } catch (err) {
      console.error("Error saving to Firestore:", err)
    }
  }


  const transformApiResult = (result: any): AnalysisResult => {
    // Backend returns: resume_data, job_data, comparison_result, visualization_data
    // Map to frontend expected structure
    console.log('🔍 Backend response structure:', result);
    
    return {
      analysis: {
        candidateExperience: result.visualization_data?.["visual Candidate Experience (years)"] || 
                           result.visualization_data?.["Candidate Experience (years)"] || "1.67",
        confidenceScores: result.visualization_data?.["visual Confidence scores"] || 
                         result.visualization_data?.["Confidence scores"] || "{}",
        jobSkills: result.visualization_data?.["visual Job Skills"] || 
                  result.visualization_data?.["Job Skills"] || "",
        matchPercentage: result.visualization_data?.["visual Match Percentage"] || 
                        result.visualization_data?.["Match Percentage"] || "60",
        missingWeakSkills: result.visualization_data?.["visual Missing / Weak Skills"] || 
                          result.visualization_data?.["Missing / Weak Skills"] || "",
        requiredExperience: result.visualization_data?.["visual Required Experience (years)"] || 
                           result.visualization_data?.["Required Experience (years)"] || 
                           result.job_data?.["Year of Experience"] || "0.0",
        resumeSections: result.visualization_data?.["visual Resume Sections"] || 
                       result.visualization_data?.["Resume Sections"] || "{}",
        resumeSkills: result.visualization_data?.["visual Resume Skills"] || 
                     result.visualization_data?.["Resume Skills"] || ""
      },
      compareResponse: {
        atsOptimizedKeywordList: result.comparison_result?.["ATS-optimized keyword list"] || "",
        confidenceScores: result.comparison_result?.["Confidence scores"] || "",
        interviewQA: result.comparison_result?.["Interview Q&A"] || "",
        matchPercentage: result.comparison_result?.["Match Percentage"] || "60%",
        missingWeakSkills: result.comparison_result?.["Missing Skills"] || 
                          result.comparison_result?.["Missing / Weak Skills"] || "",
        suggestedRewrites: result.comparison_result?.["Suggested rewrites"] || ""
      },
      jobDescription: {
        employmentType: result.job_data?.["Employment Type"] || "",
        experienceLevel: result.job_data?.["Experience Level"] || "",
        jobTitle: result.job_data?.["Job Title"] || "",
        qualifications: result.job_data?.["Qualifications"] || "",
        requiredSkills: result.job_data?.["Required Skills"] || "",
        responsibilities: result.job_data?.["Responsibilities"] || "",
        yearOfExperience: result.job_data?.["Year of Experience"] || ""
      },
      resumeText: {
        name: result.resume_data?.["Name"] || "",
        email: result.resume_data?.["Email"] || "",
        phone: result.resume_data?.["Phone"] || "",
        linkedin: result.resume_data?.["LinkedIn"] || "",
        github: result.resume_data?.["GitHub"] || "",
        achievements: result.resume_data?.["Achievements"] || "",
        certificates: result.resume_data?.["Certificates"] || "",
        education: result.resume_data?.["Education"] || "",
        experienceLevel: result.resume_data?.["Experience Level"] || "",
        projects: result.resume_data?.["Projects"] || "",
        skills: result.resume_data?.["Skills"] || "",
        workExperience: result.resume_data?.["Work Experience"] || "",
        yearOfExperience: result.resume_data?.["Year of Experience"] || result.visualization_data?.["Candidate Experience (years)"] || ""
      },
      resume_id: {
        Name: result.resume_data?.["Name"] || "",
        Email: result.resume_data?.["Email"] || "",
        Phone: result.resume_data?.["Phone"] || "",
        LinkedIn: result.resume_data?.["LinkedIn"] || "",
        skills: result.resume_data?.["Skills"] || "",
        workExperience: result.resume_data?.["Work Experience"] || "",
        projects: result.resume_data?.["Projects"] || "",
        education: result.resume_data?.["Education"] || "",
        certificates: result.resume_data?.["Certificates"] || "",
        experienceLevel: result.resume_data?.["Experience Level"] || ""
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
      
      console.log('🔍 Full API response:', result);
      console.log('✅ Response success status:', result.success);
      console.log('📊 Resume data keys:', result.resume_data ? Object.keys(result.resume_data) : 'No resume_data');
      console.log('💼 Job data keys:', result.job_data ? Object.keys(result.job_data) : 'No job_data');
      console.log('🎯 Comparison result keys:', result.comparison_result ? Object.keys(result.comparison_result) : 'No comparison_result');
      console.log('📈 Visualization data keys:', result.visualization_data ? Object.keys(result.visualization_data) : 'No visualization_data');
      
      if (result.success) {
        console.log('🚀 Starting data transformation...');
        const transformedResult = transformApiResult(result)
        console.log('✨ Transformed result:', transformedResult);
        setAnalysisResult(transformedResult)
        
        // 🔥 Save to Firebase
         await saveToFirestore(transformedResult)   
        console.log("Data saved to Firestore")
        
        // Show thank you dialog after successful analysis
        setShowThankYouDialog(true)
      } else {
        // Check if result has quota exceeded information
        if (result.quotaExceeded) {
          console.log(`🚨 Quota exceeded for ${result.selectedServer}`)
          if (result.serverRestarted) {
            console.log("✅ Backend server has been restarted")
          }
          setShowQuotaExceededDialog(true)
          return
        }
        
        // Check for validation errors (like empty job description)
        if (result.error_type === "validation_error") {
          setError(result.error || "Please provide a valid job description")
          return
        }
        
        throw new Error(result.error || "Analysis failed")
      }
    } catch (err) {
      // Handle fetch errors and API response errors
      let errorData: any = null
      let errorMessage = "An error occurred during analysis"
      
      if (err instanceof Error) {
        errorMessage = err.message
        
        // Try to parse error as JSON in case it contains structured error info
        try {
          if (err.message.includes('{')) {
            const jsonStart = err.message.indexOf('{')
            const jsonStr = err.message.substring(jsonStart)
            errorData = JSON.parse(jsonStr)
          }
        } catch {
          // Not JSON, continue with regular error handling
        }
      }
      
      // Check for quota exceeded errors (both in message and structured data)
      const isQuotaError = 
        errorMessage.includes("Quota exceeded") || 
        errorMessage.includes("You exceeded your current quota") ||
        errorMessage.includes("generativelanguage.googleapis.com/generate_content_free_tier_requests") ||
        (errorData && errorData.quotaExceeded)
      
      if (isQuotaError) {
        console.log("🚨 Quota exceeded error detected")
        if (errorData && errorData.serverRestarted) {
          console.log("✅ Backend server restart was attempted")
        }
        setShowQuotaExceededDialog(true)
      } else if (errorMessage.includes("Failed to communicate")) {
        setError("Backend service unavailable. Please ensure the Streamlit backend is running on port 8501.")
      } else {
        setError(errorMessage)
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
    setShowThankYouDialog(false)
    setShowQuotaExceededDialog(false)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header with prominent About button */}
      <div className="relative mb-8">
        {/* Floating About Button - Top Right */}
        <div className="absolute top-0 right-0 z-10">
          <Link href="/about">
            <Button 
              className="relative bg-green-600/90 backdrop-blur-sm hover:bg-green-700 text-white font-semibold px-8 py-3 rounded-semi shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] border border-green-500/40"
              size="sm"
            >
              <User className="h-4 w-4 mr-2" />
              👨‍💻 Meet the Developer
            </Button>
          </Link>
        </div>
        
        {/* Main Header */}
        <div className="text-center pr-48">
          <h1 className="text-4xl font-bold text-foreground mb-4 text-balance">Resume-Job Matching Assistant</h1>
          <p className="text-lg text-muted-foreground text-pretty">
            Upload your resume and job description to get AI-powered matching analysis and recommendations
          </p>
        </div>
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

      {/* Bottom About Section - More prominent */}
      {!analysisResult && (
        <div className="mt-12 text-center">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-semibold mb-2 text-foreground">
              💡 Want to know more about this project?
            </h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Meet the developer behind this AI-powered platform and share your feedback to help make it even better!
            </p>
            <Link href="/about">
              <Button 
                variant="default"
                className="relative bg-green-600/90 backdrop-blur-sm hover:bg-green-700 text-white font-semibold px-8 py-3 rounded-semi shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] border border-green-500/40"
              
              >
                <User className="h-4 w-4 mr-2" />
                👋 About the Developer & Feedback
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Thank You Dialog */}
      <AlertDialog open={showThankYouDialog} onOpenChange={setShowThankYouDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-center">
              <Heart className="h-5 w-5 text-red-500" />
              Thank You for Using Our Website!
            </AlertDialogTitle>
            <div className="text-center space-y-3 text-muted-foreground text-sm">
              <AlertDialogDescription>
                🎉 Your resume analysis has been completed successfully! We hope our AI-powered insights help you in your job search journey.
              </AlertDialogDescription>
              <AlertDialogDescription>
                💡 Love our service? We'd really appreciate your feedback and suggestions to make it even better!
              </AlertDialogDescription>
              <AlertDialogDescription className="flex items-center justify-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Click on "About" to learn more about the developer and share your valuable feedback.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <AlertDialogAction 
              onClick={() => setShowThankYouDialog(false)}
              className="w-full sm:w-auto"
            >
              Continue with Results
            </AlertDialogAction>
            <Link href="/about">
              <Button 
                variant="outline" 
                className="w-full sm:w-auto"
                onClick={() => setShowThankYouDialog(false)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Give Feedback
              </Button>
            </Link>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quota Exceeded Dialog */}
      <AlertDialog open={showQuotaExceededDialog} onOpenChange={setShowQuotaExceededDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-center text-orange-600">
              ⚠️ Server Currently Busy
            </AlertDialogTitle>
            <div className="text-center space-y-3 text-muted-foreground text-sm">
              <AlertDialogDescription>
                🚧 The current AI server has reached its request limit and is temporarily busy.
              </AlertDialogDescription>
              <AlertDialogDescription>
                💡 <strong>Good news!</strong> You can switch to a different server to continue your analysis right away!
              </AlertDialogDescription>
              <AlertDialogDescription className="flex items-center justify-center gap-2 font-medium text-blue-600">
                🔄 Try switching to Server 2 or Server 3 above
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <AlertDialogAction 
              onClick={() => setShowQuotaExceededDialog(false)}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              ✅ Got it, I'll switch servers
            </AlertDialogAction>
            <Button 
              variant="outline" 
              className="w-full sm:w-auto"
              onClick={() => {
                setShowQuotaExceededDialog(false)
                // Auto-switch to a different server
                if (selectedServer === "server2") {
                  setSelectedServer("server3")
                } else if (selectedServer === "server1") {
                  setSelectedServer("server2")
                } else {
                  setSelectedServer("server2")
                }
              }}
            >
              🔄 Auto-Switch Server
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
