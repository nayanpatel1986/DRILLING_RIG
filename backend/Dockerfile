FROM python:3.11-slim

# Install system-level dependencies needed by psycopg2 and lxml
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    libxml2-dev \
    libxslt-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV PYTHONUNBUFFERED=1

# Copy requirements first to leverage Docker layer cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source after dependencies are installed
COPY . .

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
