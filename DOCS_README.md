# Docusaurus Documentation Setup

This project uses [Docusaurus](https://docusaurus.io/) to generate interactive documentation that can be browsed on GitHub Pages.

## Prerequisites

- Node.js 20.x (use `nvm use` to switch to the correct version)
- npm

## Local Development

1. **Switch to the correct Node version** (if using nvm):
   ```bash
   nvm use
   ```

2. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run docs:dev
   ```

   This command starts a local development server at `http://localhost:3000` and opens up a browser window. Most changes are reflected live without having to restart the server.

4. **Build the documentation**:
   ```bash
   npm run docs:build
   ```

   This command generates static content into the `build` directory and can be served using any static hosting service.

5. **Serve the built documentation locally**:
   ```bash
   npm run docs:serve
   ```