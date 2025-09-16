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
    if (score >= 90) return "text-green-700"     // Perfect Match
    if (score >= 80) return "text-green-500"     // Excellent Match
    if (score >= 70) return "text-yellow-600"    // Good Match
    if (score >= 50) return "text-orange-500"    // Not Good Match
    return "text-red-600"                        // Needs Improvement
  }

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Perfect Match"
    if (score >= 80) return "Excellent Match"
    if (score >= 70) return "Good Match"
    if (score >= 60) return "Can Be A Match"
    return "Needs Improvement"
  }

  const parseSkills = (skillsInput: string | string[] | undefined | null): string[] => {
    if (!skillsInput) return []
    
    // If it's already an array, clean it up
    if (Array.isArray(skillsInput)) {
      return skillsInput
        .map(skill => (typeof skill === 'string' ? skill.trim() : String(skill).trim()))
        .filter(skill => skill.length > 0)
        .slice(0, 20) // Limit to first 20 skills for display
    }
    
    // If it's a string, split and clean up
    if (typeof skillsInput === 'string') {
      return skillsInput
        .split(/[,;]/) // Split by comma or semicolon
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0)
        .slice(0, 20) // Limit to first 20 skills for display
    }
    
    // Fallback for other types
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

  // Parse experience values with multiple fallbacks
  const candidateExp = parseFloat(
    result.analysis["visual Candidate Experience (years)"] ||
    result.analysis.candidateExperience ||
    result.resumeText.yearOfExperience ||
    "1.67"
  )
  
  // Try multiple sources for required experience
  let requiredExp = parseFloat(
    result.analysis["visual Required Experience (years)"] ||
    result.analysis.requiredExperience ||
    result.jobDescription.yearOfExperience ||
    "0"
  )
  
  // If still 0, try to extract from job description text
  if (requiredExp === 0) {
    const jobText = result.jobDescription.qualifications + " " + result.jobDescription.responsibilities
    const experienceMatch = jobText.match(/(\d+)\+?\s*years?\s*(of\s*)?(experience|exp)/i)
    if (experienceMatch) {
      requiredExp = parseFloat(experienceMatch[1])
    }
  }

  const formatInterviewQA = (qaText: string | null | undefined) => {
    if (!qaText || typeof qaText !== 'string') return "No interview questions available."
    
    // Split by **Q: markers to separate questions
    const questions = qaText.split(/\*\*Q:\s*/).filter(section => section.trim())
    
    return questions.map((questionBlock, index) => {
      // Split each question block by **A: to separate question and answer
      const parts = questionBlock.split(/\*\*A:\s*/)
      const question = parts[0]?.replace(/\*\*/g, '').trim() // Remove ** symbols
      const answer = parts[1]?.replace(/\*\*/g, '').trim() // Remove ** symbols
      
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

  const formatATSContent = (atsText: string | null | undefined) => {
    if (!atsText || typeof atsText !== 'string') return "No ATS optimization tips available."
    
    // Split by ** markers and clean up
    const sections = atsText.split(/\*\*/).filter(section => section.trim())
    
    return sections.map((section, index) => {
      // Clean the section text and make keywords bold
      const cleanedSection = section.replace(/\*/g, '').trim()
      
      if (cleanedSection.length < 10) return null // Skip very short sections
      
      return (
        <div key={index} className="mb-4 p-4 border-l-4 border-blue-500 bg-blue-50 rounded-r-lg">
          <div className="text-gray-700 leading-relaxed">
            {cleanedSection.split('\n').map((line, lineIndex) => {
              // Make text after : bold
              if (line.includes(':')) {
                const [title, ...rest] = line.split(':')
                return (
                  <div key={lineIndex} className="mb-2">
                    <span className="font-bold text-blue-700">{title}:</span>
                    <span className="ml-1">{rest.join(':')}</span>
                  </div>
                )
              }
              return line.trim() ? <div key={lineIndex} className="mb-1">{line}</div> : null
            })}
          </div>
        </div>
      )
    }).filter(Boolean) // Remove null entries
  }

  const generateClientSidePDF = async () => {
    try {
      // Dynamic import for client-side only
      const { jsPDF } = await import('jspdf')
      
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15
      let yPosition = margin

      // Professional color scheme - BLACK ONLY
      const colors = {
        header: [0, 0, 0],           // Black
        section: [0, 0, 0],          // Black  
        text: [0, 0, 0],             // Black
        accent: [200, 200, 200]      // Light Gray for lines only
      }

      // Helper function to add text with advanced formatting
      const addText = (text: string, fontSize: number = 10, isBold: boolean = false, color: number[] = colors.text, align: string = 'left') => {
        doc.setFontSize(fontSize)
        doc.setFont('helvetica', isBold ? 'bold' : 'normal')
        doc.setTextColor(color[0], color[1], color[2])
        
        const textLines = doc.splitTextToSize(text, pageWidth - 2 * margin)
        
        // Check if we need a new page
        if (yPosition + (textLines.length * 5) > pageHeight - margin) {
          doc.addPage()
          yPosition = margin
        }
        
        textLines.forEach((line: string) => {
          if (align === 'center') {
            doc.text(line, pageWidth / 2, yPosition, { align: 'center' })
          } else {
            doc.text(line, margin, yPosition)
          }
          yPosition += 5  // Reduced line height from 6
        })
      }

      // Helper function to add section header with line
      const addSectionHeader = (title: string) => {
        yPosition += 3  // Reduced spacing
        doc.setFontSize(12)  // Reduced from 14
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(colors.header[0], colors.header[1], colors.header[2])
        doc.text(title.toUpperCase(), margin, yPosition)
        yPosition += 6  // Reduced spacing
        
        // Add horizontal line under section header
        doc.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2])
        doc.line(margin, yPosition, pageWidth - margin, yPosition)
        yPosition += 5  // Reduced spacing
      }

      // Helper function to add bullet point
      const addBulletPoint = (text: string) => {
        doc.setFontSize(10)  // Reduced from 11
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
        
        // Add bullet using asterisk instead of Unicode
        doc.text('*', margin, yPosition)
        
        // Add text with proper wrapping
        const textLines = doc.splitTextToSize(text, pageWidth - 2 * margin - 10)
        textLines.forEach((line: string) => {
          doc.text(line, margin + 8, yPosition)
          yPosition += 5  // Reduced line height
        })
      }

      // ============ HEADER SECTION ============
      // Use real personal information from backend parsing
      const personalInfo = {
        name: result.resumeText.name || 'Professional Candidate',
        email: result.resumeText.email || '',
        phone: result.resumeText.phone || '',
        linkedin: result.resumeText.linkedin || '',
        address: result.resumeText.address || ''
      }
      
      const candidateName = personalInfo.name.toUpperCase()

      // Name (Large, Bold, Centered, Black)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(colors.header[0], colors.header[1], colors.header[2])
      doc.text(candidateName, pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 12

      // Determine professional title from actual work experience
      let professionalTitle = "PROFESSIONAL"
      const workExp = result.resumeText.workExperience || ''
      
      // Extract job title from work experience if possible
      const titlePatterns = [
        /(?:Senior|Junior|Lead)?\s*(Software Engineer|Developer|Data Analyst|UI\/UX Designer|Web Developer|Frontend Developer|Backend Developer|Full Stack Developer)/i,
        /(?:worked as|position|role|title)[:\s]*([^.,]+)/i,
        /^([^,\n]+)(?=,| at |\n)/ // First part before comma or "at"
      ]
      
      for (const pattern of titlePatterns) {
        const match = workExp.match(pattern)
        if (match && match[1]) {
          professionalTitle = match[1].toUpperCase()
          break
        }
      }

      // If no title found in work experience, use a generic one based on skills
      if (professionalTitle === "PROFESSIONAL") {
        const skills = result.resumeText.skills || ''
        if (skills.includes('UI') || skills.includes('UX') || skills.includes('Design')) {
          professionalTitle = 'UI/UX DESIGNER'
        } else if (skills.includes('Data') || skills.includes('Analyst') || skills.includes('SQL')) {
          professionalTitle = 'DATA ANALYST'
        } else if (skills.includes('Developer') || skills.includes('Engineer')) {
          professionalTitle = 'SOFTWARE DEVELOPER'
        }
      }

      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(colors.section[0], colors.section[1], colors.section[2])
      doc.text(professionalTitle, pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 8

      // Build contact information from actual extracted data
      const contactParts = []
      if (personalInfo.email) contactParts.push(`Email: ${personalInfo.email}`)
      if (personalInfo.phone) contactParts.push(`Phone: ${personalInfo.phone}`)
      if (personalInfo.linkedin) contactParts.push(`LinkedIn: ${personalInfo.linkedin}`)
      if (personalInfo.address) contactParts.push(`Location: ${personalInfo.address}`)
      
      const contactInfo = contactParts.length > 0 
        ? contactParts.join(' | ') 
        : 'Contact information not available'

      doc.setFontSize(10)
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
      doc.text(contactInfo, pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 10

      // Horizontal separator line
      doc.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2])
      doc.line(margin, yPosition, pageWidth - margin, yPosition)
      yPosition += 8

      // ============ PROFESSIONAL SUMMARY ============
      addSectionHeader('Professional Summary')
      
      // Create summary based on actual resume data
      let summaryText = ""
      
      // Use actual experience value
      const experienceYears = result.resumeText.yearOfExperience || candidateExp
      
      if (professionalTitle.includes('DESIGN')) {
        summaryText = `Experienced ${professionalTitle.toLowerCase()} with ${experienceYears}+ years of expertise in creating user-centered designs. `
        summaryText += `Skilled in ${resumeSkills.slice(0, 3).join(', ')}. `
        summaryText += `Proven ability to deliver high-quality projects and enhance user engagement through thoughtful design.`
      } else if (professionalTitle.includes('DATA')) {
        summaryText = `Results-driven ${professionalTitle.toLowerCase()} with ${experienceYears}+ years of experience in analyzing complex data sets. `
        summaryText += `Proficient in ${resumeSkills.filter(s => s.includes('Data') || s.includes('SQL') || s.includes('Analytics')).slice(0, 3).join(', ')}. `
        summaryText += `Demonstrated ability to deliver actionable insights and drive business growth through data-driven decisions.`
      } else {
        summaryText = `Accomplished ${professionalTitle.toLowerCase()} with ${experienceYears}+ years of experience in developing innovative solutions. `
        summaryText += `Expertise in ${resumeSkills.slice(0, 3).join(', ')}. `
        summaryText += `Strong track record of delivering high-quality projects and driving business growth through technology innovation.`
      }
      
      addText(summaryText, 10, false, colors.text)
      yPosition += 3

      // ============ EDUCATION ============
      if (result.resumeText.education && result.resumeText.education.trim()) {
        addSectionHeader('Education')
        const educationEntries = result.resumeText.education.split('\n').filter(entry => entry.trim())
        educationEntries.forEach(entry => addBulletPoint(entry.trim()))
        yPosition += 2
      }

      // ============ WORK EXPERIENCE ============
      if (result.resumeText.workExperience && result.resumeText.workExperience.trim()) {
        addSectionHeader('Work Experience')
        const workExperiences = result.resumeText.workExperience.split('\n').filter(exp => exp.trim())
        
        workExperiences.forEach(exp => {
          if (exp.trim().length > 10) { // Only add meaningful content
            // Check if this looks like a job title/company line
            if (exp.includes(' at ') || exp.includes(' - ') || 
                exp.match(/\d{4}.*\d{4}/) || // Date ranges
                exp.match(/[A-Z][a-z]+ [A-Z][a-z]+/)) { // Likely company names
              doc.setFont('helvetica', 'bold')
              addText(exp.trim(), 10, true, colors.text)
            } else {
              addBulletPoint(exp.trim())
            }
          }
        })
        yPosition += 2
      }

      // ============ TECHNICAL SKILLS ============
      if (resumeSkills.length > 0) {
        addSectionHeader('Technical Skills')
        
        // Group skills into categories for better presentation
        const skillGroups = []
        let currentGroup = ""
        
        resumeSkills.forEach((skill, index) => {
          if (currentGroup.length + skill.length < 60) {
            currentGroup += (currentGroup ? ', ' : '') + skill
          } else {
            if (currentGroup) skillGroups.push(currentGroup)
            currentGroup = skill
          }
        })
        if (currentGroup) skillGroups.push(currentGroup)
        
        skillGroups.forEach(group => addBulletPoint(group))
      }

      // ============ PROJECTS ============
      if (result.resumeText.projects && result.resumeText.projects.trim()) {
        addSectionHeader('Projects')
        const projects = result.resumeText.projects.split('\n').filter(proj => proj.trim())
        
        projects.forEach(project => {
          if (project.toLowerCase().includes('project') || project.toLowerCase().includes('system')) {
            addText(project.trim(), 11, true, colors.text)
          } else {
            addBulletPoint(project.trim())
          }
        })
      }

      // ============ ACHIEVEMENTS ============
      if (result.resumeText.achievements && result.resumeText.achievements.trim()) {
        addSectionHeader('Achievements')
        const achievements = result.resumeText.achievements.split('\n').filter(ach => ach.trim())
        achievements.forEach(achievement => addBulletPoint(achievement.trim()))
      }

      // ============ CERTIFICATIONS ============
      if (result.resumeText.certificates && result.resumeText.certificates.trim()) {
        addSectionHeader('Certifications')
        const certifications = result.resumeText.certificates.split('\n').filter(cert => cert.trim())
        certifications.forEach(cert => addBulletPoint(cert.trim()))
      }

      // ============ FOOTER ============
      if (yPosition > pageHeight - 30) {
        doc.addPage()
        yPosition = margin
      }
      yPosition = pageHeight - 20
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(128, 128, 128)
      doc.text(`Generated on: ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`, pageWidth / 2, yPosition, { align: 'center' })

      // Save the PDF
      const sanitizedName = personalInfo.name.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-')
      const filename = `${sanitizedName}-Resume-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)
      
      alert("✅ Professional PDF resume generated successfully!")
      
    } catch (error) {
      console.error("❌ Client-side PDF generation failed:", error)
      
      // Fallback - create a formatted text file with .pdf extension
      const resumeContent = formatResumeContent()
      const blob = new Blob([resumeContent], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `professional-resume-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      alert("⚠️ PDF library unavailable. Generated formatted document as PDF file.")
    }
  }

  const handleGenerateResume = async () => {
    try {
      // Set loading state
      const generateButton = document.querySelector('[data-generating="true"]') as HTMLButtonElement
      if (generateButton) {
        generateButton.disabled = true
        generateButton.textContent = 'Generating PDF...'
      }

      // Try to generate PDF using the backend API first
      const response = await fetch("/api/generate-resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeText: {
            name: result.resumeText.name,
            email: result.resumeText.email,
            phone: result.resumeText.phone,
            linkedin: result.resumeText.linkedin,
            address: result.resumeText.address,
            achievements: result.resumeText.achievements,
            certificates: result.resumeText.certificates,
            education: result.resumeText.education,
            experienceLevel: result.resumeText.experienceLevel,
            projects: result.resumeText.projects,
            skills: result.resumeText.skills,
            workExperience: result.resumeText.workExperience,
            yearOfExperience: result.resumeText.yearOfExperience || candidateExp.toString()
          },
          jobDescription: {
            employmentType: result.jobDescription.employmentType,
            experienceLevel: result.jobDescription.experienceLevel,
            jobTitle: result.jobDescription.jobTitle,
            qualifications: result.jobDescription.qualifications,
            requiredSkills: result.jobDescription.requiredSkills,
            responsibilities: result.jobDescription.responsibilities
          },
          analysis: {
            matchPercentage: matchPercentage,
            candidateExperience: candidateExp,
            requiredExperience: requiredExp,
            missingSkills: missingSkills.join(', '),
            resumeSkills: resumeSkills.join(', ')
          },
          improvements: result.compareResponse.suggestedRewrites,
          atsKeywords: result.compareResponse.atsOptimizedKeywordList
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.success) {
          // Check if we have a PDF version
          if (data.pdf_base64 && data.filename) {
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
            a.download = data.filename
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            
            alert("AI-improved resume PDF generated successfully!")
          } else {
            // Generate PDF using client-side PDF library
            await generateClientSidePDF()
          }
        } else {
          // Generate PDF using client-side PDF library
          await generateClientSidePDF()
        }
      } else {
        // Generate PDF using client-side PDF library
        await generateClientSidePDF()
      }
    } catch (error) {
      console.error("❌ Failed to generate improved resume:", error)
      
      // Generate PDF using client-side PDF library as fallback
      await generateClientSidePDF()
    } finally {
      // Reset button state
      const generateButton = document.querySelector('[data-generating="true"]') as HTMLButtonElement
      if (generateButton) {
        generateButton.disabled = false
        generateButton.textContent = 'Generate PDF Resume'
      }
    }
  }

  const formatResumeContent = () => {
    const currentDate = new Date().toLocaleDateString()
    
    return `
IMPROVED RESUME BASED ON AI ANALYSIS
Generated on: ${currentDate}
Match Score: ${matchPercentage}%

======================================
PERSONAL INFORMATION
======================================
Name: ${result.resumeText.name || 'Not specified'}
Email: ${result.resumeText.email || 'Not specified'}
Phone: ${result.resumeText.phone || 'Not specified'}
LinkedIn: ${result.resumeText.linkedin || 'Not specified'}
Location: ${result.resumeText.address || 'Not specified'}

======================================
EDUCATION
======================================
${result.resumeText.education || 'No education information available'}

======================================
WORK EXPERIENCE
======================================
${result.resumeText.workExperience || 'No work experience information available'}

======================================
PROJECTS
======================================
${result.resumeText.projects || 'No projects information available'}

======================================
TECHNICAL SKILLS
======================================
${result.resumeText.skills || 'No skills information available'}

======================================
ACHIEVEMENTS
======================================
${result.resumeText.achievements || 'No achievements information available'}

======================================
CERTIFICATIONS
======================================
${result.resumeText.certificates || 'No certifications information available'}

======================================
JOB MATCH ANALYSIS
======================================
Target Position: ${result.jobDescription.jobTitle}
Match Percentage: ${matchPercentage}%
Experience Gap: ${candidateExp} years (Required: ${requiredExp} years)
Missing Skills: ${missingSkills.join(', ') || 'None identified'}

======================================
IMPROVEMENT RECOMMENDATIONS
======================================
${safeString(result.compareResponse.suggestedRewrites).replace(/\*\*/g, '').replace(/- /g, '• ')}

======================================
ATS OPTIMIZATION KEYWORDS
======================================
${safeString(result.compareResponse.atsOptimizedKeywordList).replace(/\*\*/g, '').replace(/\*/g, '•')}

======================================
INTERVIEW PREPARATION NOTES
======================================
${safeString(result.compareResponse.interviewQA).replace(/\*\*/g, '').substring(0, 500)}...

======================================
SUMMARY
======================================
This resume has been optimized based on AI analysis comparing your profile 
against the job requirements for "${result.jobDescription.jobTitle}".

Key Strengths:
- ${resumeSkills.slice(0, 5).join('\n- ')}

Areas for Improvement:
- ${missingSkills.slice(0, 3).join('\n- ')}

Generated by Resume-Job Matching Assistant
    `.trim()
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
      <Tabs defaultValue="visualization" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="visualization">Overview</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="interview">Interview Prep</TabsTrigger>
          <TabsTrigger value="optimization">ATS Tips</TabsTrigger>
        </TabsList>

        {/* Visualization Tab */}
        <TabsContent value="visualization" className="space-y-6">
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
            {/* Resume vs Job Comparison Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Resume vs Job Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aspect</TableHead>
                      <TableHead>Resume</TableHead>
                      <TableHead>Job Requirement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Experience Level</TableCell>
                      <TableCell>{result.resumeText.experienceLevel}</TableCell>
                      <TableCell>{result.jobDescription.experienceLevel}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Experience (Years)</TableCell>
                      <TableCell>{result.resumeText.yearOfExperience || candidateExp}</TableCell>
                      <TableCell>{requiredExp}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Employment Type</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>{result.jobDescription.employmentType}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

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
          </div>

          {/* Detailed Information Tables */}
          <div className="grid lg:grid-cols-2 gap-6">
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
                    <TableRow>
                      <TableCell className="font-medium">Achievements</TableCell>
                      <TableCell className="text-sm">{result.resumeText.achievements}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Certificates</TableCell>
                      <TableCell className="text-sm">{result.resumeText.certificates}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Job Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Job Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aspect</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Job Title</TableCell>
                      <TableCell className="text-sm">{result.jobDescription.jobTitle}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Qualifications</TableCell>
                      <TableCell className="text-sm">{result.jobDescription.qualifications}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Required Skills</TableCell>
                      <TableCell className="text-sm">{result.jobDescription.requiredSkills}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Responsibilities</TableCell>
                      <TableCell className="text-sm max-w-xs overflow-hidden">{result.jobDescription.responsibilities}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Detailed Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-sm text-muted-foreground">Match Percentage</h4>
                    <p className="text-2xl font-bold text-primary">{matchPercentage}%</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-sm text-muted-foreground">Your Experience</h4>
                    <p className="text-2xl font-bold">{candidateExp} years</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-sm text-muted-foreground">Required Experience</h4>
                    <p className="text-2xl font-bold">{requiredExp} years</p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-semibold mb-2">Missing/Weak Skills Analysis</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.compareResponse.missingWeakSkills}</p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2">Data Debug Info</h4>
                  <div className="text-xs bg-gray-100 p-3 rounded">
                    <p><strong>Resume Skills Source:</strong> {result.analysis.resumeSkills ? 'analysis' : 'resumeText'}</p>
                    <p><strong>Resume Skills Raw:</strong> {result.analysis.resumeSkills || result.resumeText.skills}</p>
                    <p><strong>Job Skills Raw:</strong> {result.analysis.jobSkills || result.jobDescription.requiredSkills}</p>
                    <p><strong>Missing Skills Raw:</strong> {result.analysis.missingWeakSkills || result.compareResponse.missingWeakSkills}</p>
                    <p><strong>Visual Candidate Experience:</strong> {result.analysis["visual Candidate Experience (years)"] || 'Not found'}</p>
                    <p><strong>Visual Required Experience:</strong> {result.analysis["visual Required Experience (years)"] || 'Not found'}</p>
                    <p><strong>Year of Experience (Resume):</strong> {result.resumeText.yearOfExperience || 'Not specified'}</p>
                    <p><strong>Year of Experience (Job):</strong> {result.jobDescription.yearOfExperience || 'Not specified'}</p>
                    <p><strong>Candidate Experience (Analysis):</strong> {result.analysis.candidateExperience}</p>
                    <p><strong>Required Experience (Analysis):</strong> {result.analysis.requiredExperience}</p>
                    <p><strong>Final Parsed Values:</strong> Candidate: {candidateExp}, Required: {requiredExp}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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

        {/* ATS Optimization Tab */}
        <TabsContent value="optimization" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  ATS-Optimized Keywords
                </CardTitle>
                <CardDescription>Keywords to include in your resume for better ATS compatibility</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {formatATSContent(result.compareResponse.atsOptimizedKeywordList)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  Suggested Resume Improvements
                </CardTitle>
                <CardDescription>Specific recommendations to enhance your resume</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50 rounded-r-lg">
                    <h4 className="font-bold text-yellow-700 mb-3 text-lg">Recommended Improvements:</h4>
                    <div className="space-y-3">
                      {safeString(result.compareResponse.suggestedRewrites).split('- **').filter(item => item.trim()).map((improvement, index) => {
                        // Clean up the text and extract title and content
                        const cleanText = improvement.replace(/\*\*/g, '').trim()
                        const [title, ...contentParts] = cleanText.split(':')
                        const content = contentParts.join(':').trim()
                        
                        return (
                          <div key={index} className="mb-4 p-3 bg-white rounded border border-yellow-200">
                            <h5 className="font-semibold text-gray-800 mb-2">{title}:</h5>
                            <p className="text-gray-700 text-sm leading-relaxed">{content}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button onClick={onReset} variant="outline" className="flex items-center gap-2 bg-transparent">
          <RotateCcw className="h-4 w-4" />
          Analyze Another
        </Button>
        <Button 
          onClick={handleGenerateResume} 
          className="flex items-center gap-2"
          data-generating="true"
        >
          <Download className="h-4 w-4" />
          Generate PDF Resume
        </Button>
      </div>
    </div>
  )
}