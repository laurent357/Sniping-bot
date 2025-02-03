#!/bin/bash

# Installation des dépendances système pour Playwright
echo "Installation des dépendances système..."
sudo apt-get update
sudo apt-get install -y \
    libgstreamer1.0-0 \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    libgtk-4-1 \
    libgraphene-1.0-0 \
    libwoff1 \
    libvpx7 \
    libevent-2.1-7 \
    libharfbuzz-icu0 \
    libwebp7 \
    libenchant-2-2 \
    libsecret-1-0 \
    libhyphen0 \
    libmanette-0.2-0 \
    libx264-dev

# Installation des dépendances Playwright avec gestion des conflits
echo "Installation des dépendances de test..."
npm install -D @playwright/test@latest --legacy-peer-deps

# Installation des navigateurs
echo "Installation des navigateurs Playwright..."
npx playwright install

# Installation des dépendances de test avec gestion des conflits
echo "Installation des dépendances supplémentaires..."
npm install -D \
  @testing-library/dom@latest \
  @testing-library/user-event@latest \
  @testing-library/react@latest \
  ts-node@latest \
  typescript@latest \
  --legacy-peer-deps

# Mise à jour de package.json pour les scripts de test
echo "Configuration des scripts de test..."
npm pkg set scripts.test:e2e="playwright test" \
    scripts.test:e2e:ui="playwright test --ui" \
    scripts.test:e2e:report="playwright show-report"

# Création des répertoires nécessaires
echo "Création des répertoires de test..."
mkdir -p tests/e2e/utils tests/e2e/mocks

# Message de confirmation
echo "✅ Installation des dépendances de test e2e terminée"
echo ""
echo "Pour exécuter les tests :"
echo "npm run test:e2e          # Exécuter tous les tests"
echo "npm run test:e2e:ui       # Exécuter les tests avec l'interface utilisateur"
echo "npm run test:e2e:report   # Voir le rapport des tests" 