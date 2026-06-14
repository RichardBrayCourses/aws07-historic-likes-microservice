#!/bin/bash

set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "This script is designed for macOS only."
    exit 1
fi

if ! command -v brew >/dev/null 2>&1; then
    echo "Homebrew is required. Install it from https://brew.sh/ and run this script again."
    exit 1
fi

formulas=(
    flyway
)

casks=(
    pgadmin4
)

echo "Updating Homebrew..."
brew update --quiet

echo "Installing Homebrew formulas..."
for formula in "${formulas[@]}"; do
    echo "Installing $formula..."
    brew install "$formula" --quiet
done

echo "Installing Homebrew casks..."
for cask in "${casks[@]}"; do
    echo "Installing $cask..."
    brew install --cask "$cask" --force --quiet
done

echo "Flyway and pgAdmin installation complete."
