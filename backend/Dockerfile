FROM python:3.12-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Install dependencies before copying source for better layer caching
COPY pyproject.toml uv.lock ./
RUN uv sync --no-group dev --frozen

# Copy source
COPY . .

EXPOSE 8000

CMD ["sh", "-c", "uv run --no-sync python manage.py migrate && exec uv run --no-sync gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2"]
