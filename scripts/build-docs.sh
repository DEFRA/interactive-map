#!/bin/bash
# Workaround for Docusaurus build with "type": "module" in package.json
# Temporarily rename package.json type field during build

# Create backup
cp package.json package.json.backup

# Remove "type": "module" line
sed -i.tmp '/"type": "module",/d' package.json && rm -f package.json.tmp

# Build
npm run docs:build

# Restore original package.json
mv package.json.backup package.json
