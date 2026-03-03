# Use a Python image optimized for ML
FROM python:3.11-slim

# Set work directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the code
COPY . .

# Expose port (e.g., 5000 for Flask or 8000 for FastAPI)
EXPOSE 5000

# Start with a production server
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]