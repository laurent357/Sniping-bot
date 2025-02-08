# Build stage
FROM rust:1.75-slim-bullseye as builder

WORKDIR /usr/src/app

# Installation des dépendances système nécessaires pour la compilation
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copie de tout le code source
COPY . .

# Build du projet
RUN cargo build --release

# Runtime stage
FROM debian:bullseye-slim

# Installation des dépendances runtime
RUN apt-get update && apt-get install -y \
    ca-certificates \
    wget \
    libssl1.1 \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copie du binaire compilé
COPY --from=builder /usr/src/app/target/release/solana-sniping-bot .

# Configuration des variables d'environnement
ENV RUST_LOG=info
ENV RUST_BACKTRACE=1

# Exposition des ports
EXPOSE 50051
EXPOSE 8080

# Commande de démarrage
CMD ["./solana-sniping-bot"] 