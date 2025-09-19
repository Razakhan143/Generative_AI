"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/hooks/use-toast"
import { 
  Github, 
  Linkedin, 
  Mail, 
  Code, 
  Brain, 
  User, 
  MessageSquare, 
  Send,
  ArrowLeft,
  Star,
  Briefcase
} from "lucide-react"
import Link from "next/link"

interface FeedbackData {
  name: string
  email: string
  feedback: string
}

export function About() {
  const [feedbackData, setFeedbackData] = useState<FeedbackData>({
    name: "",
    email: "",
    feedback: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (field: keyof FeedbackData, value: string) => {
    setFeedbackData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!feedbackData.name || !feedbackData.email || !feedbackData.feedback) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields before submitting.",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(feedbackData)
      })

      if (response.ok) {
        toast({
          title: "Feedback Submitted!",
          description: "Thank you for your feedback. I appreciate your input!",
        })
        // Reset form
        setFeedbackData({ name: "", email: "", feedback: "" })
      } else {
        throw new Error("Failed to submit feedback")
      }
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "Sorry, there was an error submitting your feedback. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const skills = [
    "React", "Next.js", "TypeScript", "Python", "AI/ML", "Firebase", 
    "Node.js", "TailwindCSS", "Streamlit", "Data Science", "LLMs", "Full-Stack Development"
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header with back button */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>
        <div>
          <h1 className="text-4xl font-bold text-foreground">About</h1>
          <p className="text-lg text-muted-foreground">Meet the developer behind AI Resume-Job Insight</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Developer Info Section */}
        <div className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">RAZA KHAN</h2>
                  <p className="text-muted-foreground">Full-Stack Developer & AI Enthusiast</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground leading-relaxed">
                Welcome to AI Resume-Job Insight! I'm Raza Khan, a passionate full-stack developer 
                specializing in AI-powered applications. This platform combines cutting-edge artificial 
                intelligence with intuitive user experience to help job seekers optimize their resumes 
                and improve their chances of landing their dream jobs.
              </p>
              
              <Separator />
              
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Technical Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Connect With Me
                </h3>
                <div className="flex gap-4">
                  <Button variant="outline" size="sm" asChild>
                    <a href="mailto:razakhan@example.com" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://linkedin.com/in/razakhan" target="_blank" className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://github.com/razakhan" target="_blank" className="flex items-center gap-2">
                      <Github className="h-4 w-4" />
                      GitHub
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* About the Project */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                About This Project
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Star className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">AI-Powered Analysis</h4>
                  <p className="text-sm text-muted-foreground">
                    Utilizes advanced Google Gemini models for comprehensive resume and job matching analysis.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Star className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">Real-time Processing</h4>
                  <p className="text-sm text-muted-foreground">
                    Multiple server options with different speed and accuracy trade-offs to suit your needs.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Star className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">Comprehensive Insights</h4>
                  <p className="text-sm text-muted-foreground">
                    Get detailed match percentages, missing skills analysis, and ATS optimization suggestions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feedback Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Your Feedback & Suggestions
              </CardTitle>
              <CardDescription>
                Help me improve this platform by sharing your thoughts, suggestions, or reporting any issues.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitFeedback} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Your Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your name"
                      value={feedbackData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Your Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={feedbackData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="mt-1"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="feedback">Feedback & Suggestions</Label>
                  <Textarea
                    id="feedback"
                    placeholder="Share your feedback, suggestions for improvement, bug reports, or feature requests..."
                    value={feedbackData.feedback}
                    onChange={(e) => handleInputChange("feedback", e.target.value)}
                    rows={6}
                    className="mt-1"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Feedback
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <h3 className="font-semibold">Built with ❤️ by Raza Khan</h3>
                <p className="text-sm text-muted-foreground">
                  Empowering job seekers with AI-driven insights
                </p>
                <p className="text-xs text-muted-foreground">
                  © 2024 AI Resume-Job Insight. All rights reserved.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}