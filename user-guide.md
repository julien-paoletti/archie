# Archie — User Guide

Archie is a browser-based diagram editor for designing system architecture diagrams. This guide covers everything you need to create, edit, and export diagrams.

---

## Table of Contents

1. [Interface Overview](#interface-overview)
2. [Elements](#elements)
3. [Working with Elements](#working-with-elements)
4. [Connections](#connections)
5. [Selection and Multi-Selection](#selection-and-multi-selection)
6. [Zoom and Pan](#zoom-and-pan)
7. [Inline Editing](#inline-editing)
8. [Colors and Styling](#colors-and-styling)
9. [Files](#files)
10. [Keyboard Shortcuts](#keyboard-shortcuts)

---

## Interface Overview

```
┌─────────────────────────────────────────────────────────┐
│  [Archie]  New   Open   [Save]   Export PNG             │  ← Toolbar
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│ Palette  │                  Canvas                     │
│          │                                              │
│ [Comp]   │                                              │
│ [User]   │                                              │
│ [Module] │                                         [MM] │  ← Minimap
│ [Domain] │                                              │
│ ...      │                                              │
└──────────┴──────────────────────────────────────────────┘
```

- **Toolbar** (top): File actions and export
- **Palette** (left): Drag elements onto the canvas from here
- **Canvas** (center): Your diagram workspace
- **Minimap** (bottom-right): Bird's-eye navigation for large diagrams

---

## Elements

Archie provides 9 element types, each serving a distinct purpose in system diagrams.

### Component

A rectangular box representing a system component, service, or application.

- Displays a title and optional description
- Can show an icon chosen from the Tabler icon library
- Customizable border and background colors
- Default size: 160 × 80 px

### User

A circular shape representing a human actor or end user.

- Always circular (width = height)
- Title displayed below the circle
- Default size: 60 × 60 px

### Module

A rounded container for grouping related components.

- Can hold Component and User elements inside it
- Light blue background to differentiate from its contents
- Default size: 200 × 150 px

### Domain

A larger container representing a high-level system boundary or bounded context.

- Can hold Modules and Components
- Use as the top-level grouping in your diagram
- Default size: 300 × 200 px

### Boundary

A dashed-border rectangle indicating a logical zone or deployment boundary.

- No fill — elements inside remain fully clickable
- Label appears in one of four configurable corners
- Default size: 200 × 150 px

### Note

A colored sticky note for annotations and free text.

- Supports multi-line text with wrapping
- 8 color themes (yellow, blue, green, red, purple, orange, teal, slate)
- Height snaps to exact line counts when resizing
- Font size adjustable via right-click menu
- Default size: 200 × 100 px

### Label

Plain text with no background — ideal for lightweight annotations.

- No fill or border
- Font size adjustable via right-click menu
- Cannot be connected to other elements
- Default size: 120 × 28 px

### Tag

A compact pill-shaped label for categorizing or tagging elements.

- 8 color themes (blue, red, green, yellow, purple, pink, cyan, slate)
- New tags auto-cycle through color themes
- Not snapped to grid — can be placed freely
- Default size: auto-width × 24 px

### Numbered Dot

A small circular marker with a number, useful for step-by-step annotations.

- Auto-numbered sequentially starting at 1
- Always renders on top of all other elements
- Not snapped to grid
- Fixed size: 32 × 32 px

---

## Working with Elements

### Adding Elements

Drag any element from the **Palette** on the left onto the canvas. The element appears centered under your cursor.

To collapse the palette and free up canvas space, click the toggle button at the top-right of the palette panel. The state is remembered between sessions.

### Moving Elements

Click and drag any element to reposition it. Most elements snap to a 20 px grid. Tags and Numbered Dots move freely without snapping.

### Cloning Elements

Hold **Ctrl** (or **Cmd** on Mac) while dragging an element to create a copy. The original stays in place and the new element follows your cursor.

### Resizing Elements

Select an element, then drag any of the blue resize handles (corners and edges). User elements maintain their circular shape during resize.

### Dropping into Containers

Drag a Component or User over a Module or Domain — a highlight appears to indicate it will be adopted as a child. Drop it to nest it inside the container.

### Deleting Elements

Select one or more elements and press **Delete** or **Backspace**, or use **right-click → Delete**.

---

## Connections

### Creating a Connection

Hover over an element until small connection points appear on its borders. Click and drag from a connection point to another element to create a connection.

### Selecting a Connection

Click on a connection line to select it. Control point handles appear.

### Reshaping a Connection (Bezier)

Drag the circular control point handles at the start and end of the connection to adjust the curve shape.

To add an intermediate anchor point, right-click the connection and choose **Add Control Point**. Drag the new anchor to reshape the path.

To remove an anchor, right-click near it and choose **Remove Control Point**.

To restore the default shape, right-click and choose **Reset Curve**.

### Connection Label

Double-click a connection to add or edit its label. The label appears at the midpoint of the connection.

### Right-Click Options for Connections

| Option | Description |
|--------|-------------|
| Edit Label | Add or change the connection label |
| Add Control Point | Add an intermediate anchor |
| Remove Control Point | Delete the nearest anchor |
| Reset Curve | Restore default shape |
| Solid / Dashed / Dotted Line | Change the line style |
| Filled / Outline / Line / No Arrow | Change the arrowhead style |
| Bezier Curve | Smooth curve with draggable handles |
| Smooth Spline | Catmull-Rom curve that passes through anchors |
| Color | Choose a stroke color from 12 options |
| Delete | Remove the connection |

---

## Selection and Multi-Selection

### Selecting a Single Element

Click an element to select it. A blue dashed outline appears with resize handles.

### Adding to the Selection

Hold **Shift** and click additional elements. Shift-clicking a selected element deselects it.

### Box Selection

Click and drag on an empty area of the canvas to draw a selection rectangle. All elements that touch the box are selected.

### Select All

Press **Ctrl+A** (or **Cmd+A**) to select all elements in the diagram.

### Deselect

Press **Escape** to clear the selection.

### Aligning Elements

With two or more elements selected, right-click and choose **Align Center Vertically** to center them on a shared horizontal axis.

---

## Zoom and Pan

### Zooming

Scroll the mouse wheel to zoom in and out. Zooming centers on the cursor position.

- Minimum zoom: 0.1×
- Maximum zoom: 3.0×

### Panning

- Hold **Space**, then click and drag to pan the canvas.
- Alternatively, click and drag with the **middle mouse button**.

### Auto-Scroll

When dragging an element near the edge of the canvas, the view automatically scrolls in that direction.

### Minimap Navigation

The minimap in the bottom-right shows the full diagram. The highlighted rectangle represents your current viewport.

- Click anywhere in the minimap to jump to that area.
- Drag the viewport rectangle in the minimap to pan smoothly.

---

## Inline Editing

### Editing Titles

Double-click any element to edit its title. Press **Enter** to save, **Escape** to cancel.

Alternatively, right-click and choose **Edit Title**.

### Editing Descriptions (Components)

Double-click the lower portion of a Component, or right-click and choose **Edit Description**. Press **Enter** to save, **Escape** to cancel.

### Editing Notes

Double-click a Note to enter edit mode. A text area appears for multi-line input. Press **Escape** when done.

### Editing Labels and Tags

Double-click to open a single-line text field. Press **Enter** to save, **Escape** to cancel.

### Editing Numbered Dots

Double-click to edit the number. Press **Enter** to save, **Escape** to cancel.

### Editing Connection Labels

Double-click the connection line, or right-click and choose **Edit Label**. Press **Enter** to save, **Escape** to cancel.

---

## Colors and Styling

### Border Color

Right-click any element with a border and choose a color from the **Border Color** palette (12 colors).

### Note Colors

Right-click a Note and choose from 8 coordinated color themes:

| Theme | Style |
|-------|-------|
| Yellow | Warm, default |
| Blue | Cool |
| Green | Natural |
| Red | Alert |
| Purple | Creative |
| Orange | Energetic |
| Teal | Calm |
| Slate | Neutral |

### Tag Colors

Right-click a Tag and choose from 8 color options: Blue, Red, Green, Yellow, Purple, Pink, Cyan, Slate.

### Font Size

Right-click a **Note** or **Label** and choose **Increase Font Size** or **Decrease Font Size** (adjusts by 2 px).

### Boundary Label Position

Right-click a Boundary and choose from four label corner positions: Top-Left, Top-Right, Bottom-Left, Bottom-Right.

---

## Files

### Saving

Click **Save** in the toolbar or press **Ctrl+S** (**Cmd+S**).

- **First save**: A file picker opens — choose a location and filename. Files are saved as `.json`.
- **Subsequent saves**: The file is updated automatically without a dialog.

A toast notification confirms the save with the filename.

The diagram is also continuously saved to browser local storage as a backup.

### Opening

Click **Open** in the toolbar or press **Ctrl+O** (**Cmd+O**). A file picker opens for `.json` files. The diagram, zoom level, and pan position are all restored.

### New Diagram

Click **New** in the toolbar or press **Ctrl+N** (**Cmd+N**). If there are unsaved changes, you will be prompted to save first.

### Exporting as PNG

Click **Export PNG** in the toolbar. The diagram is saved as `diagram.png` and downloaded automatically.

### Undo and Redo

| Action | Shortcut |
|--------|----------|
| Undo | Ctrl+Z / Cmd+Z |
| Redo | Ctrl+Y / Cmd+Y |
| Redo (alternate) | Ctrl+Shift+Z / Cmd+Shift+Z |

Archie maintains up to 50 undo steps. The history is cleared when a new file is opened.

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| New Diagram | Ctrl+N / Cmd+N |
| Open Diagram | Ctrl+O / Cmd+O |
| Save Diagram | Ctrl+S / Cmd+S |
| Select All | Ctrl+A / Cmd+A |
| Copy | Ctrl+C / Cmd+C |
| Cut | Ctrl+X / Cmd+X |
| Paste | Ctrl+V / Cmd+V |
| Undo | Ctrl+Z / Cmd+Z |
| Redo | Ctrl+Y / Cmd+Y |
| Delete Selected | Delete / Backspace |
| Deselect All | Escape |
| Pan Mode | Space (hold) |

---

## Tips

- **Use Domains and Modules** to organize your diagram hierarchically before adding components.
- **Numbered Dots** work well for annotating a sequence of steps alongside a flow diagram.
- **Boundaries** are useful for overlaying deployment zones (e.g. cloud regions, networks) on top of an existing diagram without blocking clicks.
- **Catmull-Rom splines** give a clean, natural-looking curve when you have multiple waypoints — the curve passes through every anchor you place.
- **Tags** are great for labeling elements with versions, owners, or status without cluttering the main title.
- Collapse the palette to maximize canvas space when working on dense diagrams.
