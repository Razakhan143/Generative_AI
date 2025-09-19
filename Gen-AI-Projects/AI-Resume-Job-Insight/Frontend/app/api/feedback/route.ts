import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"

interface FeedbackData {
  name: string
  email: string
  feedback: string
}

export async function POST(request: NextRequest) {
  try {
    const body: FeedbackData = await request.json()
    
    // Validate required fields
    if (!body.name || !body.email || !body.feedback) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, and feedback are required" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Save feedback to Firebase
    const feedbackDoc = await addDoc(collection(db, "feedback"), {
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      feedback: body.feedback.trim(),
      timestamp: serverTimestamp(),
      status: "new", // To help track which feedback has been reviewed
      userAgent: request.headers.get("user-agent") || "unknown",
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    })

    console.log("Feedback saved successfully with ID:", feedbackDoc.id)

    return NextResponse.json(
      { 
        success: true, 
        message: "Feedback submitted successfully",
        feedbackId: feedbackDoc.id 
      },
      { status: 200 }
    )

  } catch (error) {
    console.error("Error saving feedback to Firebase:", error)
    
    return NextResponse.json(
      { 
        error: "Failed to submit feedback. Please try again later.",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

// Handle GET request for testing
export async function GET() {
  return NextResponse.json(
    { 
      message: "Feedback API endpoint is working",
      endpoint: "/api/feedback",
      methods: ["POST"],
      requiredFields: ["name", "email", "feedback"]
    },
    { status: 200 }
  )
}