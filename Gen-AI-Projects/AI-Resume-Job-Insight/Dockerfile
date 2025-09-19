# Use Python 3.9 slim image
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY Backend/requirements.txt ./Backend/

# Install Python dependencies
RUN cd Backend && pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt

# Copy the entire project
COPY . .

# Expose port
EXPOSE $PORT

# Command to run the application
CMD cd Backend && python -m uvicorn Server:app --host 0.0.0.0 --port $PORT