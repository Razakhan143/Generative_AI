# Resume Matcher - Pure Streamlit Backend

## 🎯 Architecture Overview

This is a **pure Streamlit backend** solution with **NO Flask, NO FastAPI** - just Streamlit as requested!

```
┌─────────────────┐    HTTP Requests    ┌─────────────────────┐
│                 │ ────────────────► │                     │
│   Next.js       │                   │   Streamlit App     │
│   Frontend      │                   │   (Pure Backend)    │
│   (Port 3000)   │ ◄──────────────── │   (Port 8501)       │
│                 │    JSON Response   │                     │
└─────────────────┘                    └─────────────────────┘
```

## 🚀 How It Works

### 1. **Pure Streamlit Backend** (`streamlit_backend.py`)
- ✅ Runs on port 8501
- ✅ Handles file uploads directly
- ✅ Processes resume and job data
- ✅ Logs all requests in real-time
- ✅ Pure Streamlit - NO other frameworks

### 2. **Next.js Frontend** (Port 3000)
- ✅ User uploads resume and enters job details
- ✅ Sends data to Next.js API route (`/api/process-resume`)
- ✅ API route processes and logs data (console output)
- ✅ Returns success response to frontend

## 📁 File Structure

```
scripts/
├── streamlit_backend.py     # Pure Streamlit backend server
├── simple_server.py         # [DEPRECATED] Flask server - not used
├── connection-test.html     # Testing page
└── requirements.txt         # Dependencies

app/api/
├── process-resume/route.ts  # Next.js API route (processes data directly)
└── generate-resume/route.ts # Next.js API route
```

## 🔧 Setup Instructions

### 1. Start Streamlit Backend
```bash
# Using Python directly
python -m streamlit run streamlit_backend.py --server.port 8501

# Using the virtual environment
C:/Users/tesla/OneDrive/Desktop/resume-job/.venv/Scripts/python.exe -m streamlit run streamlit_backend.py --server.port 8501
```

### 2. Start Next.js Frontend
```bash
cd resume-matcher
npm run dev
```

### 3. Access Applications
- **Streamlit Backend**: http://localhost:8501
- **Next.js Frontend**: http://localhost:3000

## 📊 Data Flow

1. **User Action**: Upload resume + job description in Next.js
2. **Frontend**: Sends form data to `/api/process-resume`
3. **Next.js API**: Processes data and logs to console
4. **Console Output**: See received data printed in Next.js terminal
5. **Streamlit**: Can also be used for direct testing and monitoring

## 📝 Console Output Example

When you upload a resume through the frontend, you'll see:

```
==================================================
📨 RECEIVED REQUEST FROM FRONTEND
==================================================
📎 Files received:
   resume: John_Doe_Resume.pdf (application/pdf)
   size: 156789 bytes

📝 Form data received:
   jobDescription: Software Engineer position requiring Python, React...
   jobUrl: https://example.com/job/123
==================================================
✅ CONNECTION TEST SUCCESSFUL!
==================================================
```

## 🎯 Benefits of This Approach

✅ **Pure Streamlit**: No Flask, no FastAPI, just Streamlit
✅ **Direct Connection**: Frontend → Next.js API → Console Output
✅ **Real-time Monitoring**: Streamlit UI shows all requests
✅ **Simple Architecture**: Easy to understand and maintain
✅ **Scalable**: Can add more processing logic later

## 🔍 Testing

### Method 1: Use Next.js Frontend
1. Go to http://localhost:3000
2. Upload a resume and enter job details
3. Check Next.js terminal for console output

### Method 2: Use Streamlit Directly
1. Go to http://localhost:8501
2. Use the form to upload resume and job details
3. See real-time processing in Streamlit UI

### Method 3: Use Test Page
1. Open `connection-test.html` in browser
2. Test the connection directly

## 📈 Future Enhancements

When you're ready to add processing logic:

1. **Add AI Processing**: Integrate your helper functions
2. **Database Storage**: Save results in database
3. **File Processing**: Add PDF parsing logic
4. **Response Enhancement**: Return detailed analysis

## 🛠️ Current Status

- ✅ Streamlit backend running on port 8501
- ✅ Next.js frontend running on port 3000
- ✅ Direct communication established
- ✅ Console logging working
- ✅ Pure Streamlit architecture (no middleware)

**Ready for use!** 🎉
