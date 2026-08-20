FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml ./
COPY app ./app
COPY companies.seed.yaml ./companies.seed.yaml

RUN uv pip install --system -e .

ENV PYTHONUNBUFFERED=1
EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
