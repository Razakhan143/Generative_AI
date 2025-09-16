import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // Send data directly to FastAPI backend API
    const backendUrl = process.env.backendUrl || "https://generativeai-production.up.railway.app/"
        // const backendUrl = process.env.FASTAPI_BACKEND_URL || "http://localhost:8502/";
    console.log("🚀 Forwarding request to FastAPI backend...")

    // Forward the entire form data to FastAPI backend
    const response = await fetch(`${backendUrl}api/process-resume`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Streamlit backend error: ${response.status} - ${errorText}`)
      throw new Error(`Streamlit backend error: ${response.status}`)
    }

    const result = await response.json()
    console.log("✅ Data successfully sent to Streamlit backend")
    console.log("📋 Check your Streamlit terminal for the printed data!")
    
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error communicating with Streamlit backend:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to communicate with Streamlit backend. Please ensure Streamlit is running on port 8502.",
      },
      { status: 500 }
    )
  }
}
