"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { BarChart3, TrendingUp, Target, User, Award } from "lucide-react"

interface MatchVisualizationProps {
  matchPercentage: number
  candidateExperience: number
  requiredExperience: number
  skillsMatch: {
    total: number
    matching: number
    missing: number
  }
  resumeStrengths: string[]
  missingSkills: string[]
}

export function MatchVisualization({
  matchPercentage,
  candidateExperience,
  requiredExperience,
  skillsMatch,
  resumeStrengths,
  missingSkills
}: MatchVisualizationProps) {
  const experienceGap = Math.abs(candidateExperience - requiredExperience)
  const experienceMatch = requiredExperience === 0 ? 100 : 
                         candidateExperience >= requiredExperience ? 100 : 
                         (candidateExperience / requiredExperience) * 100
  const skillsMatchPercentage = skillsMatch.total > 0 ? (skillsMatch.matching / skillsMatch.total) * 100 : 0

const getScoreColor = (score: number) => {
  if (score >= 90) return "bg-green-600"    // Perfect Match
  if (score >= 80) return "bg-green-400"    // Excellent Match
  if (score >= 70) return "bg-yellow-500"   // Good Match
  if (score >= 50) return "bg-orange-400"   // Not Good Match
  return "bg-red-500"                       // Needs Improvement
}

const getTextColor = (score: number) => {
  if (score >= 90) return "text-green-700"  // Perfect Match
  if (score >= 80) return "text-green-600"  // Excellent Match
  if (score >= 70) return "text-yellow-600" // Good Match
  if (score >= 50) return "text-orange-600" // Not Good Match
  return "text-red-600"                     // Needs Improvement
}


  return (
    <div className="space-y-6">
      {/* Overall Match Score Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Match Score Breakdown
          </CardTitle>
          <CardDescription>Visual analysis of your resume match</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Match */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Overall Match</span>
              <span className={`text-sm font-bold ${getTextColor(matchPercentage)}`}>
                {matchPercentage}%
              </span>
            </div>
            <Progress value={matchPercentage} className="h-3" />
          </div>

          {/* Experience Match */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Experience Match</span>
              <span className={`text-sm font-bold ${getTextColor(experienceMatch)}`}>
                {Math.round(experienceMatch)}%
              </span>
            </div>
            <Progress value={experienceMatch} className="h-3" />
            <div className="text-xs text-muted-foreground">
              You have {candidateExperience} years, required: {requiredExperience} years
              {experienceGap > 0 && candidateExperience < requiredExperience && requiredExperience > 0 && 
                ` (${experienceGap.toFixed(1)} years gap)`
              }
            </div>
          </div>

          {/* Skills Match */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Skills Match</span>
              <span className={`text-sm font-bold ${getTextColor(skillsMatchPercentage)}`}>
                {Math.round(skillsMatchPercentage)}%
              </span>
            </div>
            <Progress value={skillsMatchPercentage} className="h-3" />
            <div className="text-xs text-muted-foreground">
              {skillsMatch.matching} of {skillsMatch.total} required skills found
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skills Distribution */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              Skills Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Skills Chart Representation */}
              <div className="relative h-8 bg-gray-200 rounded-lg overflow-hidden">
                <div 
                  className="absolute left-0 top-0 h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${(skillsMatch.matching / skillsMatch.total) * 100}%` }}
                />
                <div 
                  className="absolute top-0 h-full bg-red-500 transition-all duration-500"
                  style={{ 
                    left: `${(skillsMatch.matching / skillsMatch.total) * 100}%`,
                    width: `${(skillsMatch.missing / skillsMatch.total) * 100}%`
                  }}
                />
              </div>
              
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Matching ({skillsMatch.matching})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>Missing ({skillsMatch.missing})</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Resume Strength Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Circular Progress Representation */}
              <div className="flex items-center justify-center">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - matchPercentage / 100)}`}
                      className={getTextColor(matchPercentage).replace('text-', 'stroke-')}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-lg font-bold ${getTextColor(matchPercentage)}`}>
                      {matchPercentage}%
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {resumeStrengths.length} key strengths identified
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Quick Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className={`text-2xl font-bold ${getTextColor(matchPercentage)}`}>
                {matchPercentage}%
              </div>
              <div className="text-xs text-muted-foreground">Overall Match</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {skillsMatch.matching}
              </div>
              <div className="text-xs text-muted-foreground">Matching Skills</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {skillsMatch.missing}
              </div>
              <div className="text-xs text-muted-foreground">Missing Skills</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {resumeStrengths.length}
              </div>
              <div className="text-xs text-muted-foreground">Strengths</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Priority Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Priority Actions
          </CardTitle>
          <CardDescription>Focus on these areas for maximum impact</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {matchPercentage < 60 && (
              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="w-3 h-3 bg-red-500 rounded-full mt-1 flex-shrink-0"></div>
                <div>
                  <h4 className="font-semibold text-red-700 mb-1">Critical Priority</h4>
                  <span className="text-sm text-red-600">Consider gaining experience in missing skills and highlighting relevant projects more prominently</span>
                </div>
              </div>
            )}
            
            {candidateExperience < requiredExperience && requiredExperience > 0 && (
              <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mt-1 flex-shrink-0"></div>
                <div>
                  <h4 className="font-semibold text-yellow-700 mb-1">Experience Gap</h4>
                  <span className="text-sm text-yellow-600">
                    Highlight relevant experience and projects to bridge the {experienceGap.toFixed(1)} year experience gap
                  </span>
                </div>
              </div>
            )}
            
            {skillsMatch.missing > skillsMatch.matching && (
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="w-3 h-3 bg-blue-500 rounded-full mt-1 flex-shrink-0"></div>
                <div>
                  <h4 className="font-semibold text-blue-700 mb-1">Skills Development</h4>
                  <span className="text-sm text-blue-600">Focus on acquiring high-priority missing skills through courses or projects</span>
                </div>
              </div>
            )}

            {matchPercentage >= 60 && matchPercentage < 80 && (
              <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="w-3 h-3 bg-orange-500 rounded-full mt-1 flex-shrink-0"></div>
                <div>
                  <h4 className="font-semibold text-orange-700 mb-1">Good Match - Optimize Further</h4>
                  <span className="text-sm text-orange-600">Enhance your resume with ATS keywords and quantify your achievements</span>
                </div>
              </div>
            )}
            
            {matchPercentage >= 80 && (
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="w-3 h-3 bg-green-500 rounded-full mt-1 flex-shrink-0"></div>
                <div>
                  <h4 className="font-semibold text-green-700 mb-1">Excellent Match!</h4>
                  <span className="text-sm text-green-600">You're well-qualified for this position. Consider applying with confidence!</span>
                </div>
              </div>
            )}

            {resumeStrengths.length < 3 && (
              <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="w-3 h-3 bg-purple-500 rounded-full mt-1 flex-shrink-0"></div>
                <div>
                  <h4 className="font-semibold text-purple-700 mb-1">Resume Enhancement</h4>
                  <span className="text-sm text-purple-600">Consider adding more details to your projects, achievements, and work experience</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
