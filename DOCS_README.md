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

## GitHub Pages Deployment

The documentation is automatically deployed to GitHub Pages when you push to the `main` branch.

### Setup GitHub Pages

1. Go to your repository settings on GitHub
2. Navigate to **Pages** under **Code and automation**
3. Under **Build and deployment**, set:
   - **Source**: GitHub Actions
4. The workflow defined in `.github/workflows/deploy-docs.yml` will handle the deployment

After the first successful workflow run, your documentation will be available at:
`https://<your-org>.github.io/<your-repo>/`

## Documentation Structure

```
docs/
├── index.md                    # Homepage
├── getting-started.md         # Getting started guide
├── api.md                     # API reference
├── architecture.md            # Architecture overview
├── plugins.md                 # Plugins overview
├── building-a-plugin.md       # Plugin development guide
├── govuk-prototype.md         # GOV.UK Prototype Kit integration
├── api/                       # API reference details
│   ├── button-definition.md
│   ├── context.md
│   └── ...
└── plugins/                   # Plugin documentation
    ├── interact.md
    ├── search.md
    └── ...
```

## Configuration Files

- `docusaurus.config.cjs` - Main configuration file
- `sidebars.cjs` - Sidebar navigation structure
- `src/css/custom.css` - Custom styling

## Customization

### Update Site Information

Edit `docusaurus.config.cjs` to update:
- Site title and tagline
- GitHub organization and repository name
- Base URL and deployment settings
- Navigation items
- Footer links

### Modify Sidebar

Edit `sidebars.cjs` to change the documentation structure and navigation.

### Custom Styling

Modify `src/css/custom.css` to customize colors and styling.

## Troubleshooting

### Node.js Version Issues

If you encounter build errors, ensure you're using Node.js 20.x:
```bash
node --version  # Should show v20.x.x
nvm use 20      # If using nvm
```

### Clear Cache

If you encounter issues, try clearing the Docusaurus cache:
```bash
npm run docs:clear
```

## Available Scripts

- `npm run docs:dev` - Start development server
- `npm run docs:build` - Build static site
- `npm run docs:serve` - Serve built site locally
- `npm run docs:clear` - Clear Docusaurus cache
