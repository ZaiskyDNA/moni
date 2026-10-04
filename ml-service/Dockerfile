# syntax=docker/dockerfile:1

# Pakai slim (bukan alpine): numpy/pandas/scikit-learn punya wheel siap pakai untuk glibc,
# alpine (musl) sering harus build dari source dan jadi lambat/berat.
FROM python:3.12-slim AS base
RUN useradd --create-home --shell /bin/bash appuser
ENV PATH="/home/appuser/.local/bin:${PATH}" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
WORKDIR /app
USER appuser

# ---- dev: dipakai docker compose untuk development (auto-reload) ----
FROM base AS dev
COPY --chown=appuser:appuser requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir --user -r requirements-dev.txt
COPY --chown=appuser:appuser . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ---- production: image yang nanti di-deploy terpisah dari backend Node (lihat ML_Architecture.md 5) ----
FROM base AS production
COPY --chown=appuser:appuser requirements.txt ./
RUN pip install --no-cache-dir --user -r requirements.txt
COPY --chown=appuser:appuser app ./app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health').status==200 else 1)"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
