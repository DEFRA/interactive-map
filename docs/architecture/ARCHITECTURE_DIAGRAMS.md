# Architecture Diagrams

Interactive C4 architecture diagrams for the Interactive Map component.

## View Online

The diagrams are deployed to GitHub Pages:

**[View Architecture Diagrams](https://defra.github.io/interactive-map/)**

## Available Views

### System Context
High-level view showing how the Interactive Map fits into the ecosystem - developers, end users, host applications, and external map providers.

### Container Diagram
Internal building blocks of the Interactive Map: entry point, React application, registries, services, state management, and plugin system.

### Available Plugins
Optional plugins that consumers can include: Draw, Datasets, Search, Interact, Map Styles, Scale Bar, Use Location, and Frame.

## View Locally

To view the diagrams locally with live reload:

```bash
npx likec4 start docs/architecture
```

## Source

The diagram source is in [interactive-map.likec4](./interactive-map.likec4).

## Updating Diagrams

1. Edit `interactive-map.likec4`
2. Validate changes: `npx likec4 validate docs/architecture`
3. Commit and push - diagrams will auto-deploy to GitHub Pages
