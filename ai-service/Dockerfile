FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY app ./app
COPY models ./models
# Chỉ mục cho recommender (AI_RECOMMENDER_INDEX_PATH mặc định data/synthetic_campaigns.csv)
COPY data/synthetic_campaigns.csv ./data/synthetic_campaigns.csv

RUN useradd --create-home --uid 1001 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
