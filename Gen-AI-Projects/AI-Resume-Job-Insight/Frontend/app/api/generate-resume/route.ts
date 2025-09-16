// app/api/generate-resume/route.ts
// Updated to work with FastAPI backend instead of Streamlit

export async function POST(request: Request) {
  try {
    const body = await request.json();
     
    // Use your Railway FastAPI backend URL
    const backendUrl = process.env.FASTAPI_BACKEND_URL || "https://generativeai-production.up.railway.app/";
    // const backendUrl = process.env.FASTAPI_BACKEND_URL || "http://localhost:8502/";
    // console.log("Forwarding request to FastAPI backend:", backendUrl);
    // console.log("Request body:", body);

    // Forward the request directly to FastAPI backend
    const response = await fetch(`${backendUrl}api/generate-resume`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      // console.error("FastAPI backend error:", response.status, errorText);
      throw new Error(`FastAPI backend error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    // console.log("FastAPI response:", result);
    
    return Response.json(result);

  } catch (error) {
    // console.error("Error communicating with backend:", error);
    
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Backend communication failed",
        details: "Failed to connect to FastAPI backend. Please check if the backend is running."
      },
      { status: 500 }
    );
  }
}