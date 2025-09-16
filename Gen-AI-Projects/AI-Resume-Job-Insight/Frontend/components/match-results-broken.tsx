"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  User, 
  Download, 
  RotateCcw, 
  Lightbulb, 
  Briefcase,
  FileText,
  BarChart3,
  Target,
  MessageSquare
} from "lucide-react"
import { MatchVisualization } from "@/components/match-visualization"

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
    address?: string
    achievements: string
    certificates: string
    education: string
    experienceLevel: string
    projects: string
    skills: string
    workExperience: string
    yearOfExperience?: string
  }
  resume_id?: string
  personal_info?: {
    name: string
    email: string
    phone: string
    linkedin: string
  }
  success: boolean
}

interface MatchResultsProps {
  result: AnalysisResult
  onReset: () => void
}

export function MatchResults({ result, onReset }: MatchResultsProps) {
  // Utility function to safely convert any value to string
  const safeString = (value: any): string => {
    if (typeof value === 'string') return value
    if (value === null || value === undefined) return ''
    return String(value)
  }

  // Extract match percentage from different possible sources
  const matchPercentage = parseInt(result.analysis.matchPercentage) || 
                         parseInt(result.compareResponse.matchPercentage?.replace('%', '')) || 
                         0
  
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-700"
    if (score >= 80) return "text-green-500"
    if (score >= 70) return "text-yellow-600"
    if (score >= 50) return "text-orange-500"
    return "text-red-600"
  }

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Perfect Match"
    if (score >= 80) return "Excellent Match"
    if (score >= 70) return "Good Match"
    if (score >= 60) return "Can Be A Match"
    return "Needs Improvement"
  }

  const parseSkills = (skillsInput: string | string[] | undefined | null): string[] => {
    console.log("Parsing skills from:", skillsInput)
    if (!skillsInput) return []
    
    if (Array.isArray(skillsInput)) {
      return skillsInput
        .map(skill => (typeof skill === 'string' ? skill.trim() : String(skill).trim()))
        .filter(skill => skill.length > 0)
        .slice(0, 20)
    }
    
    if (typeof skillsInput === 'string') {
      const skills = skillsInput
        .split(/[,;]/)
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0)
        .slice(0, 20)
      console.log("Parsed skills:", skills)
      return skills
    }
    
    return []
  }

  const resumeSkills = parseSkills(
    result.analysis.resumeSkills || 
    result.resumeText.skills
  )
  const jobSkills = parseSkills(
    result.analysis.jobSkills || 
    result.jobDescription.requiredSkills
  )
  const missingSkills = parseSkills(
    result.analysis.missingWeakSkills || 
    result.compareResponse.missingWeakSkills
  )

  console.log("Final skills data:", { resumeSkills, jobSkills, missingSkills })

  // Parse experience values with multiple fallbacks
  const candidateExp = parseFloat(
    result.analysis.candidateExperience ||
    result.resumeText.yearOfExperience ||
    "1.67"
  )
  
  let requiredExp = parseFloat(
    result.analysis.requiredExperience ||
    result.jobDescription.yearOfExperience ||
    "0"
  )
  
  if (requiredExp === 0) {
    const jobText = result.jobDescription.qualifications + " " + result.jobDescription.responsibilities
    const experienceMatch = jobText.match(/(\d+)\+?\s*years?\s*(of\s*)?(experience|exp)/i)
    if (experienceMatch) {
      requiredExp = parseFloat(experienceMatch[1])
      console.log("Extracted required experience from job text:", requiredExp)
    }
  }
  
  console.log("Experience values:", { candidateExp, requiredExp })
  console.log("============= Match Results ============")
  console.log("Resume Text for PDF Generation:", result.resumeText)
  console.log("Personal Info:", result.personal_info)
  console.log("Resume ID:", result.resume_id)
  console.log("========================================")

  const handleGenerateResume = async () => {
    try {
      console.log("🔄 Generating PDF resume...")
      console.log("Sending data:", {
        resume_id: result.resume_id,
        personal_info: result.personal_info,
        resumeText: result.resumeText
      })
      
      const response = await fetch("/api/generate-resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resume_id: result.resume_id,
          resumeText: result.resumeText,
          jobDescription: result.jobDescription,
          analysis: {
            matchPercentage: matchPercentage,
            candidateExperience: candidateExp,
            requiredExperience: requiredExp,
            missingSkills: missingSkills.join(', '),
            resumeSkills: resumeSkills.join(', ')
          },
          improvements: result.compareResponse.suggestedRewrites,
          atsKeywords: result.compareResponse.atsOptimizedKeywordList,
          name: result.personal_info?.name || result.resumeText.name || 'Professional_Candidate'
        }),
      })

      console.log("API Response status:", response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log("✅ Backend response:", data)
        
        if (data.success && data.pdf_base64) {
          console.log("✅ Downloading PDF version:", data.filename)
          
          // Convert base64 to blob and download PDF
          const pdfBytes = atob(data.pdf_base64)
          const pdfArray = new Uint8Array(pdfBytes.length)
          for (let i = 0; i < pdfBytes.length; i++) {
            pdfArray[i] = pdfBytes.charCodeAt(i)
          }
          
          const blob = new Blob([pdfArray], { type: "application/pdf" })
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = data.filename || "resume.pdf"
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          
          alert("✅ Resume PDF generated successfully!")
        } else {
          console.error("❌ No PDF data received:", data)
          alert("❌ Failed to generate PDF: " + (data.error || "No PDF data"))
        }
      } else {
        const errorText = await response.text()
        console.error("❌ HTTP error:", response.status, errorText)
        alert("❌ Backend error: " + response.status)
      }
    } catch (error) {
      console.error("❌ Error:", error)
      alert("❌ Failed to generate resume: " + (error instanceof Error ? error.message : String(error)))
    }
  }

  const formatInterviewQA = (qaText: string | null | undefined) => {
    if (!qaText || typeof qaText !== 'string') return "No interview questions available."
    
    const questions = qaText.split(/\*\*Q:\s*/).filter(section => section.trim())
    
    return questions.map((questionBlock, index) => {
      const parts = questionBlock.split(/\*\*A:\s*/)
      const question = parts[0]?.replace(/\*\*/g, '').trim()
      const answer = parts[1]?.replace(/\*\*/g, '').trim()
      
      return (
        <div key={index} className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h4 className="font-bold text-lg mb-3 text-blue-600">
            Question {index + 1}:
          </h4>
          <p className="mb-4 text-gray-800 font-medium text-base leading-relaxed">{question}</p>
          {answer && (
            <>
              <h5 className="font-semibold mb-2 text-green-600 text-base">Suggested Answer:</h5>
              <p className="text-gray-700 italic leading-relaxed">{answer}</p>
            </>
          )}
        </div>
      )
    })
  }

  return (
    <div className="space-y-6">
      {/* Header with Score */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-center">
              <div className={`text-4xl font-bold ${getScoreColor(matchPercentage)}`}>
                {matchPercentage}%
              </div>
              <p className="text-sm text-muted-foreground">Match Score</p>
            </div>
            <div className="w-32">
              <Progress value={matchPercentage} className="h-3" />
            </div>
          </div>
          <CardTitle className="text-2xl">{getScoreLabel(matchPercentage)}</CardTitle>
          <CardDescription>Complete resume analysis with detailed comparison</CardDescription>
        </CardHeader>
      </Card>

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
          <TabsTrigger value="interview">Interview Prep</TabsTrigger>
          <TabsTrigger value="debug">Debug Info</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <MatchVisualization
            matchPercentage={matchPercentage}
            candidateExperience={candidateExp}
            requiredExperience={requiredExp}
            skillsMatch={{
              total: Math.max(jobSkills.length, resumeSkills.length),
              matching: resumeSkills.filter(skill => 
                jobSkills.some(jobSkill => 
                  jobSkill.toLowerCase().includes(skill.toLowerCase()) || 
                  skill.toLowerCase().includes(jobSkill.toLowerCase())
                )
              ).length,
              missing: missingSkills.length
            }}
            resumeStrengths={[
              result.resumeText.education,
              result.resumeText.workExperience,
              result.resumeText.projects,
              result.resumeText.achievements
            ].filter(item => item && typeof item === 'string' && item.trim().length > 0)}
            missingSkills={missingSkills}
          />
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Skills Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Skills Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2 text-green-600">Your Skills ({resumeSkills.length})</h4>
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                    {resumeSkills.length > 0 ? resumeSkills.slice(0, 15).map((skill, index) => (
                      <Badge key={index} variant="default" className="bg-green-100 text-green-800 text-xs">
                        {skill}
                      </Badge>
                    )) : (
                      <p className="text-sm text-gray-500">No skills parsed</p>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2 text-red-600">Missing Skills ({missingSkills.length})</h4>
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                    {missingSkills.length > 0 ? missingSkills.slice(0, 10).map((skill, index) => (
                      <Badge key={index} variant="outline" className="border-red-200 text-red-700 text-xs">
                        {skill}
                      </Badge>
                    )) : (
                      <p className="text-sm text-gray-500">No missing skills identified</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resume Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Resume Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Section</TableHead>
                      <TableHead>Content</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Education</TableCell>
                      <TableCell className="text-sm">{result.resumeText.education}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Work Experience</TableCell>
                      <TableCell className="text-sm">{result.resumeText.workExperience}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Projects</TableCell>
                      <TableCell className="text-sm">{result.resumeText.projects}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Interview Prep Tab */}
        <TabsContent value="interview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Interview Preparation
              </CardTitle>
              <CardDescription>Tailored questions and answers based on your profile</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {formatInterviewQA(result.compareResponse.interviewQA || "")}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Debug Tab */}
        <TabsContent value="debug" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Debug Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm font-mono">
                <p><strong>Resume ID:</strong> {result.resume_id || 'Not available'}</p>
                <p><strong>Personal Info Name:</strong> {result.personal_info?.name || 'Not found'}</p>
                <p><strong>Personal Info Email:</strong> {result.personal_info?.email || 'Not found'}</p>
                <p><strong>Personal Info Phone:</strong> {result.personal_info?.phone || 'Not found'}</p>
                <p><strong>Personal Info LinkedIn:</strong> {result.personal_info?.linkedin || 'Not found'}</p>
                <p><strong>Resume Text Name:</strong> {result.resumeText.name || 'Not found'}</p>
                <p><strong>Resume Text Email:</strong> {result.resumeText.email || 'Not found'}</p>
                <p><strong>Match Percentage:</strong> {matchPercentage}%</p>
                <p><strong>Candidate Experience:</strong> {candidateExp} years</p>
                <p><strong>Required Experience:</strong> {requiredExp} years</p>
                <p><strong>Resume Skills Count:</strong> {resumeSkills.length}</p>
                <p><strong>Missing Skills Count:</strong> {missingSkills.length}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button onClick={onReset} variant="outline" className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4" />
          Analyze Another
        </Button>
        <Button 
          onClick={handleGenerateResume} 
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Generate PDF Resume
        </Button>
      </div>
    </div>
  )
}