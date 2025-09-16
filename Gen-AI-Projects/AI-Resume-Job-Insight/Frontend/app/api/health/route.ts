import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Check if the backend is running
    const backendUrl = process.env.BACKEND_URL || "https://generativeai-production.up.railway.app/"
    
    const response = await fetch(`${backendUrl}health`, {
      method: "GET",
    })

    if (!response.ok) {
      throw new Error(`Backend health check failed: ${response.status}`)
    }

    const result = await response.json()
    return NextResponse.json({
      status: "healthy",
      backend: result,
      frontend: "Next.js API is running"
    })
  } catch (error) {
    console.error("Health check failed:", error)
    return NextResponse.json(
      {
        status: "unhealthy",
        error: "Backend service is not available",
        frontend: "Next.js API is running"
      },
      { status: 503 }
    )
  }
}
