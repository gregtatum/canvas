FROM ubuntu:24.04

RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    python3-pip \
    python3-venv \
    git \
    curl \
    wget \
    vim \
    ffmpeg libsm6 libxext6 \
    && apt-get clean

WORKDIR /app

# Create and use a virtual environment.
RUN python3 -m venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"
RUN pip install --upgrade pip

# Load the requirements into the Dockerimage.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create any aliases needed.
RUN echo 'alias ls="ls -ahl --color"' >> ~/.bashrc

EXPOSE 8765

# Install any additional dependencies or copy your application code here
# Example: COPY your-app /root/your-app
# Example: RUN pip3 install -r /root/your-app/requirements.txt

# Expose ports if needed
# Example: EXPOSE 80

# Set the entrypoint (optional)
# Example: ENTRYPOINT ["python3", "/root/your-app/app.py"]

# For interactive use
# CMD ["bash"]
