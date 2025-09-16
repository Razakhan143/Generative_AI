export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const endpoint = formData.get("endpoint") as string

    if (!endpoint) {
      return Response.json(
        { success: false, error: "No endpoint specified" },
        { status: 400 }
      )
    }

    const streamlitUrl = process.env.STREAMLIT_URL || "https://generativeai-production.up.railway.app"

    // Handle different endpoints
    if (endpoint === "process-resume") {
      const file = formData.get("resume") as File
      const jobDescription = formData.get("jobDescription") as string
      const jobUrl = formData.get("jobUrl") as string || ""

      if (!file || !jobDescription) {
        return Response.json(
          { success: false, error: "Missing required parameters" },
          { status: 400 }
        )
      }

      // Convert file to base64
      const fileBuffer = await file.arrayBuffer()
      const fileBase64 = Buffer.from(fileBuffer).toString('base64')

      const apiUrl = `${streamlitUrl}/?api_endpoint=process-resume&resume_b64=${encodeURIComponent(fileBase64)}&job_description=${encodeURIComponent(jobDescription)}&job_url=${encodeURIComponent(jobUrl)}`

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: { "Accept": "application/json" },
      })

      if (!response.ok) {
        throw new Error(`Streamlit backend error: ${response.status}`)
      }

      const result = await response.json()
      return Response.json(result)

    } else if (endpoint === "generate-resume") {
      const resumeText = formData.get("resumeText") as string
      const jobDescription = formData.get("jobDescription") as string

      if (!resumeText || !jobDescription) {
        return Response.json(
          { success: false, error: "Missing required parameters" },
          { status: 400 }
        )
      }

      const apiUrl = `${streamlitUrl}/?api_endpoint=generate-resume&resume_text=${encodeURIComponent(resumeText)}&job_description=${encodeURIComponent(jobDescription)}`

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: { "Accept": "application/json" },
      })

      if (!response.ok) {
        throw new Error(`Streamlit backend error: ${response.status}`)
      }

      const result = await response.json()
      return Response.json(result)

    } else {
      return Response.json(
        { success: false, error: "Invalid endpoint" },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error("Streamlit proxy error:", error)

    return Response.json(
      {
        success: false,
        error: "Backend service unavailable. Please ensure Streamlit backend is running.",
      },
      { status: 503 },
    )
  }
}
