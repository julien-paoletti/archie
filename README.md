# Archie

A system architecture diagram editor built with TypeScript, Bun and Claude.

Made with ❤️ in Bordeaux

## Features

### Editor

- Canvas-based rendering with crosshair guides
- Grid snapping for precise placement
- Auto-save to localStorage
- Undo/Redo support (Ctrl+Z / Ctrl+Y)
- Zoom & Pan (mouse wheel zoom, Space+drag or middle-click to pan)
- Viewport persistence (zoom and pan saved/restored)
- Minimap for quick navigation in large diagrams
- Export diagram as PNG (whole diagram or selection only)
- Collapsible palette panel

### Elements

- **Component** - Rectangular element with centered title, gradient background, and optional icon
- **User** - Circular element representing human stakeholders
- **Module** - Teal container for grouping components with auto-layout
- **Domain** - Blue container for higher-level grouping
- **Boundary** - Dashed border element for visual grouping (configurable label position)
- **Note** - Multi-line text note with customizable color themes and line-height snapping
- **Numbered Dot** - Small numbered marker, free placement (no grid snap), always on top
- **Label** - Simple text label without background
- **Tag** - Compact colored label for annotations
- Drag and drop from palette to canvas
- Resize using corner and edge handles
- Double-click to edit title (inline editing)
- Ctrl+drag to clone elements
- Shift+drag to constrain movement to a single axis
- Lucide icons support for Components

### Selection

- Click to select single element
- Shift+click to toggle multi-selection
- Box selection - drag on empty canvas to select multiple elements
- Delete/Backspace to remove selected elements
- Escape to clear selection
- Align selected elements via context menu

### Connections

- Click and drag on element border to start a connection
- Drag to another element's border to complete
- Multi-segment Bézier curves with intermediate anchor points
- Draggable control handles for precise curve shaping
- Click to select connections, Delete to remove
- Drag connection endpoints to reconnect
- Configurable line styles (solid, dashed, dotted)
- Configurable arrow types (filled, outline, line, none)
- Customizable stroke color
- Right-click for context menu (edit label, add/remove control points, reset curve)

### Context Menu

- Right-click on connections: Edit Label, Line Style, Arrow Type, Stroke Color, Add/Remove Control Points, Reset Curve, Delete
- Right-click on components: Add/Edit Description
- Right-click on notes: Change color theme, adjust font size
- Right-click on tags: Change color theme
- Right-click on boundaries: Change label position (4 corners)
- Right-click on elements with borders: Change border color
- Multi-selection: Align elements vertically

### File Management

- Save/Open diagrams as JSON files (Ctrl+S / Ctrl+O)
- Remembers file handle for quick subsequent saves (no dialog)
- New diagram (Ctrl+N)
- Toast notifications on save/open

### Keyboard Shortcuts

| Shortcut | Action |
| -------- | ------ |
| `Ctrl+S` | Save diagram |
| `Ctrl+O` | Open diagram |
| `Ctrl+N` | New diagram |
| `Delete` / `Backspace` | Delete selected elements |
| `Escape` | Clear selection |
| `Ctrl+A` | Select all |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Ctrl+C` | Copy selected |
| `Ctrl+V` | Paste |
| `Ctrl+X` | Cut selected |
| `Ctrl+Drag` | Clone element |
| `Shift+Drag` | Constrain to horizontal/vertical |
| `Shift+Click` | Toggle multi-selection |
| `Space+Drag` | Pan canvas |
| `Mouse Wheel` | Zoom in/out |

## Viewer

Consumer usage

```js
import { ArchieViewer } from '@julien-paoletti/viewer';
import type { SerializedDiagram } from '@julien-paoletti/viewer';

const viewer = new ArchieViewer('my-canvas', { fitPadding: 40 });

const diagram: SerializedDiagram = await fetch('/diagrams/infra.json').then(r => r.json());
viewer.load(diagram);
viewer.fitToContent();

// cleanup when unmounting
viewer.destroy();
```

The canvas just needs to exist in the DOM — no required wrapper divs. Panning works with middle-click or Alt+drag; zoom with Ctrl+wheel; scroll-to-pan with normal wheel. Call bun run build:viewer to produce the dist.

### Release flow

bump version in viewer/package.json, then:

```bash
git add viewer/package.json
git commit -m "chore: bump @archie/viewer to 0.2.0"
git tag v0.2.0
git push && git push --tags
```

## Installation

```bash
bun install
```

## Development

```bash
bun run dev     # Watch mode for TypeScript
bun run serve   # Local dev server
```

## Build

```bash
bun run build   # Production build to docs/
```

## Backlog

- [ ] add new elements:

### Structural

Database — cylinder shape, for datastores
Queue / MessageBus — for async messaging / event streams
Actor — distinct from User, for external systems/roles (often a stick figure variant or labeled box)
ExternalSystem — a component that's outside your boundary (distinct styling, e.g., greyed out)

### Annotations / Markers

Milestone / Step — numbered sequence marker (different from NumberedDot, e.g., diamond or flag)
Legend entry — for explaining colors/shapes

### Infrastructure / Deployment

Server / Node — physical or virtual machine
Container (Docker-style) — deployment unit (distinct from the diagram container Module)
Cloud / Region — cloud boundary shape

### Interaction / Flow

Decision — diamond shape for flow diagrams
Process — rounded rectangle with distinct color for process flows
