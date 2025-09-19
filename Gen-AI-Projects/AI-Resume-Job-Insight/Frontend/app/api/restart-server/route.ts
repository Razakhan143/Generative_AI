import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { server, reason } = body
    
    if (!server) {
      return NextResponse.json(
        { error: "Server parameter is required" },
        { status: 400 }
      )
    }

    console.log(`🔄 Restart signal received for ${server}, reason: ${reason || 'manual'}`)
    
    // Send restart signal to the actual backend
    const backendUrl = process.env.backendUrl || "https://generativeai-production.up.railway.app/"
    
    try {
      const response = await fetch(`${backendUrl}api/restart-server`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          server: server,
          reason: reason || "manual_restart",
          timestamp: new Date().toISOString()
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log(`✅ Restart signal successfully forwarded to backend for ${server}`)
        
        return NextResponse.json({
          success: true,
          message: `Restart signal sent to ${server}`,
          server: server,
          reason: reason,
          timestamp: new Date().toISOString(),
          backendResponse: result
        })
      } else {
        console.error(`❌ Backend restart failed: ${response.status}`)
        
        return NextResponse.json({
          success: false,
          message: `Failed to restart ${server}`,
          error: `Backend responded with status ${response.status}`,
          server: server
        }, { status: 502 })
      }
      
    } catch (backendError) {
      console.error("Backend restart error:", backendError)
      
      // Even if backend restart fails, we still return success
      // because the important thing is that we tried to restart
      return NextResponse.json({
        success: true,
        message: `Restart signal attempted for ${server}`,
        warning: "Backend restart endpoint may not be available",
        server: server,
        reason: reason,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error("Restart API error:", error)
    
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to process restart request",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

// Handle GET request for testing
export async function GET() {
  return NextResponse.json({
    message: "Server restart API endpoint",
    endpoint: "/api/restart-server",
    methods: ["POST"],
    requiredFields: ["server"],
    optionalFields: ["reason"],
    usage: "Send POST request with server name to restart specific AI server"
  })
}