import { type NextRequest, NextResponse } from "next/server"

// Function to detect quota exceeded errors
function isQuotaExceededError(errorText: string): boolean {
  const quotaIndicators = [
    "Quota exceeded",
    "You exceeded your current quota",
    "generativelanguage.googleapis.com/generate_content_free_tier_requests",
    "quota_metric",
    "ResourceExhausted: 429",
    "rate limit",
    "too many requests"
  ]
  
  return quotaIndicators.some(indicator => 
    errorText.toLowerCase().includes(indicator.toLowerCase())
  )
}

// Function to attempt backend restart
async function attemptBackendRestart(backendUrl: string, selectedServer: string): Promise<boolean> {
  try {
    console.log(`🔄 Attempting to restart backend server: ${selectedServer}`)
    
    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    // Send restart signal to backend
    const restartResponse = await fetch(`${backendUrl}api/restart-server`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({ 
        server: selectedServer,
        reason: "quota_exceeded" 
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (restartResponse.ok) {
      console.log(`✅ Backend restart signal sent successfully for ${selectedServer}`)
      // Wait a moment for restart to take effect
      await new Promise(resolve => setTimeout(resolve, 2000))
      return true
    } else {
      console.log(`⚠️ Backend restart signal failed: ${restartResponse.status}`)
      return false
    }
  } catch (error) {
    console.log(`⚠️ Backend restart attempt failed: ${error}`)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const selectedServer = formData.get("selectedServer") as string || "server2"

    // Send data directly to FastAPI backend API
    const backendUrl = process.env.backendUrl || "https://generativeai-production.up.railway.app/"
        // const backendUrl = process.env.FASTAPI_BACKEND_URL || "http://localhost:8503/";
    console.log("🚀 Forwarding request to FastAPI backend...")

    // Forward the entire form data to FastAPI backend
    const response = await fetch(`${backendUrl}api/process-resume`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Backend error: ${response.status} - ${errorText}`)
      
      // Check if this is a quota exceeded error
      if (isQuotaExceededError(errorText)) {
        console.log(`🚨 Quota exceeded detected for ${selectedServer}`)
        
        // Attempt to restart the backend server
        const restartSuccess = await attemptBackendRestart(backendUrl, selectedServer)
        
        if (restartSuccess) {
          // Return a special error that the frontend can handle
          return NextResponse.json(
            {
              success: false,
              error: "Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests",
              quotaExceeded: true,
              serverRestarted: true,
              selectedServer: selectedServer,
              message: "Server has been restarted. Please try switching to a different server."
            },
            { status: 429 }
          )
        } else {
          // Restart failed, but still inform frontend about quota issue
          return NextResponse.json(
            {
              success: false,
              error: "Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests",
              quotaExceeded: true,
              serverRestarted: false,
              selectedServer: selectedServer,
              message: "Server quota exceeded. Please try switching to a different server."
            },
            { status: 429 }
          )
        }
      }
      
      // For other errors, throw as before
      throw new Error(`Backend error: ${response.status}`)
    }

    const result = await response.json()
    console.log("✅ Data successfully sent to backend")
    console.log("📋 Check your backend terminal for the printed data!")
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error communicating with backend:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to communicate with backend. Please ensure backend is running.",
      },
      { status: 500 }
    )
  }
}
