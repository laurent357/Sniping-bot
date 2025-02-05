# Build stage
FROM python:3.9-slim as builder

WORKDIR /app

# Installation des dépendances système nécessaires
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Installation des dépendances Python
COPY requirements.txt .
RUN pip install --user -r requirements.txt

# Production stage
FROM python:3.9-slim

WORKDIR /usr/src/app

# Installation des dépendances système nécessaires
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copie des dépendances depuis le build stage
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copie du code source
COPY . /usr/src/app/

# Configuration des variables d'environnement
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV FLASK_ENV=production
ENV PYTHONPATH=/usr/src/app/src

# Installation de gunicorn
RUN pip install --user gunicorn flask flask-cors

# Exposition du port
EXPOSE 5000

# Commande de démarrage avec gunicorn
CMD ["gunicorn", "src.main:app", "--bind", "0.0.0.0:5000", "--reload"] 