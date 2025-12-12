# Use the official Python 3.10 image just to be safe and compatible with most ML libraries
FROM python:3.10-slim

# Set the working directory to /app
WORKDIR /app

# Copy the requirements file into the container at /app
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
# --no-cache-dir reduces image size
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Explicitly copy critical data files to ensure they are present
COPY enhanced_models.pkl .
COPY forecast_data.csv.gz .

# Copy the rest of the current directory contents into the container at /app
COPY . .

# Create a non-root user for security (optional but good practice, though HF often forces user 1000)
# Hugging Face Spaces runs as ID 1000 by default, so we can stick to that or just run as root if lazy, 
# but let's be standard.
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
	PATH=/home/user/.local/bin:$PATH

# Expose port 7860 (Hugging Face Spaces default)
EXPOSE 7860

# Command to run the application
# host 0.0.0.0 is crucial for Docker
# port 7860 is crucial for HF Spaces
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
