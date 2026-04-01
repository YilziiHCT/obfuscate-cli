#!/bin/bash
# install.sh - Quick Installation Script for ObfuscateCLI

echo -e "\e[36m"
echo " ██████╗ ██████╗ ███████╗██╗   ██╗███████╗ ██████╗ █████╗ ████████╗███████╗"
echo "██╔═══██╗██╔══██╗██╔════╝██║   ██║██╔════╝██╔════╝██╔══██╗╚══██╔══╝██╔════╝"
echo "██║   ██║██████╔╝█████╗  ██║   ██║███████╗██║     ███████║   ██║   █████╗"
echo "██║   ██║██╔══██╗██╔══╝  ██║   ██║╚════██║██║     ██╔══██║   ██║   ██╔══╝"
echo "╚██████╔╝██████╔╝██║     ╚██████╔╝███████║╚██████╗██║  ██║   ██║   ███████╗"
echo " ╚═════╝ ╚═════╝ ╚═╝      ╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝"
echo "                           ██████╗██╗     ██╗"
echo "                          ██╔════╝██║     ██║"
echo "                          ██║     ██║     ██║"
echo "                          ██║     ██║     ██║"
echo "                          ╚██████╗███████╗██║"
echo "                           ╚═════╝╚══════╝╚═╝"
echo -e "\e[0m"

echo "[*] Setting up ObfuscateCLI..."

# Required commands check
for cmd in node npm git; do
  if ! command -v $cmd &> /dev/null; then
    echo "[-] Error: $cmd is not installed. Please install it first."
    exit 1
  fi
done

# Check if we're in the right directory
if [ -f "package.json" ]; then
    echo "[*] Found package.json, installing dependencies..."
    npm install
else
    echo "[*] Cloning repository..."
    git clone https://github.com/YilziiHCT/obfuscate-cli.git
    cd obfuscate-cli
    npm install
fi

# Make binaries executable
chmod +x bin/cli.js
if [ -f "optimize.sh" ]; then
    chmod +x optimize.sh
fi

echo "[+] Installation complete!"
echo "[i] You can run the CLI with: npm start"
