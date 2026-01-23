# Interactive map

[![CI](https://github.com/defra/interactive-map/workflows/CI/badge.svg)](https://github.com/defra/interactive-map/actions)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_interactive-map&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DEFRA_interactive-map)
[![npm version](https://img.shields.io/npm/v/@defra/interactive-map.svg)](https://www.npmjs.com/package/@defra/interactive-map)
[![Dependencies](https://img.shields.io/librariesio/release/npm/@defra/interactive-map)](https://libraries.io/npm/@defra%2Finteractive-map)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A lightweight, accessible map component for frontend applications. Built with accessibility at its core, this component delivers best-in-class mapping experiences that work for everyone.

**⚠️ This project is currently in beta and is not yet stable. Documentation and support are not yet available.**

<p align="center">
  <img src="docs/assets/screens-white.jpg" alt="Screenshots of map component" width="800">
</p>

## What is this?

Interactive Map is an open-source mapping solution designed for government services, but available for anyone to use. It provides a core map component that can be extended with plugins to suit your specific needs.

The component takes an accessibility-first approach, ensuring mapping tools in government services are usable by all citizens, regardless of their abilities or assistive technologies.

## Features

### Flexible architecture
- **Core component** - Lightweight base map with essential functionality
- **Plugin system** - Add only the capabilities you need:
  - Drawing tools (ES and MapLibre variants)
  - Search functionality
  - Custom datasets
  - Map styling controls
  - Scale bars
  - Location services
  - Interaction handlers
  - Framing and layout tools

### Government-ready
- Built to GOV.UK standards
- Designed for integration with government services
- Follows established design patterns and principles

## Tech Stack

- **React** - UI component framework
- **MapLibre** - Primary mapping engine
- **Webpack** - Module bundling (UMD, ESM builds)
- **Jest** - Testing framework
- **SCSS** - Styling
- **Babel** - JavaScript compilation

## Map Providers

The component uses an injectable provider architecture, allowing you to choose the mapping engine that best suits your needs. Application teams can select the provider based on their specific requirements.

### MapLibre (Recommended)

Our reference provider, offering the most complete and tested experience:

- **Out of the box** - Works immediately with no additional configuration
- **Modern and lightweight** - Better performance with smaller bundle sizes
- **Vector tile support** - Most comprehensive support for vector tiles
- **Enhanced accessibility** - Improved support for assistive technologies

### Esri (Experimental)

An alternative provider with specific advantages:

- **British National Grid** - Native support for BNG coordinate systems

**Note:** Esri provider support is experimental and still under development. Some features may be incomplete or subject to change.

## Getting Started

Documentation and installation instructions will be published when the project reaches stable release.

## Status

This project is in active development and not yet ready for production use. APIs may change without notice.
