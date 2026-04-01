#!/bin/bash
# optimize.sh - Optimization and Cleanup Script for ObfuscateCLI

echo -e "\e[32m[*] Starting ObfuscateCLI Optimization...\e[0m"

# 1. Clean NPM Cache
echo "[~] Cleaning NPM cache..."
npm cache clean --force

# 2. Rebuild dependencies
echo "[~] Reinstalling clean dependencies..."
rm -rf node_modules
rm -f package-lock.json
npm install --no-audit --no-fund --production=false

# 3. Clean processed directories
echo "[~] Cleaning up old obfuscated files..."
if [ -d "obfuscated" ]; then
    rm -rf obfuscated/*
    touch obfuscated/.gitkeep
fi

# 4. Optional optimization (e.g. running terser manually if needed, or warming up caches)
echo "[~] Checking environment paths..."
chmod +x bin/cli.js 2>/dev/null

echo -e "\e[32m[+] Optimization complete! The environment is fresh and ready.\e[0m"
