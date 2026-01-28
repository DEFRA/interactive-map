# Architecture Overview 

This framework is a **web mapping platform** designed to let teams add interactive maps to public-facing services in a consistent, extensible, and framework-agnostic way. 

At its core, it provides: 
* A stable map UI with consistent behaviour 
* A plugin system for extending functionality 
* An abstraction layer over multiple mapping engines 

The system is designed so that **the core controls rendering and layout**, while **plugins declaratively contribute behaviour and UI.** ---

## High-level Structure 

The framework consists of five main parts: 
1. **Public API** (Vanilla JS wrapper) 
2. **Core React component**
3. **Map provider abstraction**
4. **Plugin system**
5. **Rendering and slot system** 

---

## 1. Public API (Vanilla JS wrapper) 

The framework is consumed via a **vanilla JavaScript API**, making it easy to integrate into a wide range of environments (including legacy stacks and non-React applications).

This wrapper:

* **Instantiates** the core component  
* **Passes** configuration, plugins, and providers  
* **Exposes** events and methods to the host application  

> **Note:** Internally, the UI is implemented in React, but this is an implementation detail and not required knowledge for consumers. 

---

## 2. Core Component 

The core component is the orchestrator of the application. It: 
* Owns application state 
* Controls rendering and layout 
* Provides consistent map interactions (search, identify, draw, pan, etc.) 
* Manages plugins, providers, and UI composition 

**Stability Guarantee:** Plugins never control the render lifecycle. The core always mounts and renders independently of plugin success or failure. 

---

## 3. Map Provider Abstraction 

The framework is **not tied to a specific mapping library.** It uses a `mapProvider` interface defining semantic operations such as: 
* Fitting the map to bounds 
* Setting the view zoom and centre 
* Querying features 

This allows providers to be swapped without rewriting plugins or UI code.

### MapLibre (Recommended)

Our reference provider, offering the most complete and tested experience:

<table>
  <tr>
    <td><strong>Out of the box</strong></td>
    <td>Works immediately with no additional</td>
  </tr>
  <tr>
    <td><strong>Modern and lightweight</strong></td>
    <td>Better performance with smaller bundle  sizes</td>
  </tr>
  <tr>
    <td><strong>Vector tile support</strong></td>
    <td>Most comprehensive support for vector tiles</td>
  </tr>
  <tr>
    <td><strong>Enhanced accessibility</strong></td>
    <td>The most accessbile offering</td>
  </tr>
</table>

### Esri (Experimental)
An alternative provider with specific advantages:

<table>
  <tr>
    <td><strong>British National Gri</strong></td>
    <td>Native support for BNG coordinate systems</td>
  </tr>
</table>

## 4. Plugin System 

### Declarative by Design 
Plugins describe what they add using a **manifest** (buttons, panels, shortcuts). They are contributors, not "render owners."

### Registration vs Rendering 
* **Registration:** Reads manifests and populates central registries at load time.
* **Rendering:** Controlled entirely by the core, which decides where and how items appear based on current state. 

### Isolation 
Each plugin receives a **ring-fenced slice of state**. They have read access to `appState`, `mapState`, `appConfig`, and `services` (eventBus, geocoding, etc.). 

---

## 5. Rendering and Slot System 

The UI uses a **slot-based system**. Slots represent logical areas (e.g., actions, side panels, modals). 

Plugins declare UI elements with layout hints (which slot to use, modal vs non-modal, mobile vs desktop behavior). The core evaluates these rules to guarantee: 
* Consistent layout and accessibility 
* Centralized responsive design 
* UI stability (plugins cannot "block" the interface) 

---

## Event Bus 

Provides two-way, decoupled communication between the core, plugins, and the vanilla JS layer. This allows external applications to react to internal state changes without tight coupling. 

## Mental Model for Developers 

|||
| :--- | :--- |
| **Core** | The Platform |
| **Plugins** | Declarative Feature Descriptions |
| **Providers** | Adapters for Map Engines |
| **Slots** | Layout Positions |
| **State** | Shared Context |

## Tech stack

|||
| :--- | :--- |
| **React** | UI component framework |
| **MapLibre** | Primary mapping engine |
| **Webpack** | Module bundling (UMD, ESM builds) |
| **Jest** | Testing framework |
| **SCSS** | Styling |
| **Babel** | JavaScript compilation |