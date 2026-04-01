# Use a slim Python image
FROM python:3.11-slim

# Install uv for fast package management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Copy dependency files
copy pyproject.toml uv.lock ./

# Install dependencies using uv
# Syncing without installing the project itself first
RUN uv sync --frozen --no-dev --no-install-project

# Copy the rest of the application
copy . .

# Install the project
RUN uv sync --frozen --no-dev

# Expose the port
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PATH="/app/.venv/bin:$PATH"

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
