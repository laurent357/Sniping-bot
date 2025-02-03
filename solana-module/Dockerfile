# Build stage
FROM rust:1.70-slim-buster as builder

WORKDIR /usr/src/solana-module

# Installation des dépendances système
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copie des fichiers de configuration Cargo
COPY Cargo.toml Cargo.lock ./

# Création d'un projet factice pour mettre en cache les dépendances
RUN mkdir src && \
    echo "fn main() {println!(\"dummy\")}" > src/main.rs && \
    cargo build --release && \
    rm -rf src

# Copie du code source réel
COPY . .

# Build du projet
RUN cargo build --release

# Production stage
FROM debian:buster-slim

WORKDIR /app

# Installation des dépendances runtime
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl1.1 \
    && rm -rf /var/lib/apt/lists/*

# Copie de l'exécutable depuis le build stage
COPY --from=builder /usr/src/solana-module/target/release/solana-module /app/

# Configuration des variables d'environnement
ENV RUST_LOG=info
ENV RUST_BACKTRACE=1

# Exposition du port IPC
EXPOSE 50051

# Commande de démarrage
CMD ["./solana-module"] 