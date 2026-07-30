# Browser support policy

## Supported experience

Atlas targets the current and previous major releases of:

- Chrome and Edge on desktop;
- Firefox on desktop;
- Safari on macOS;
- Safari on iOS/iPadOS; and
- Chrome on Android.

The exact release matrix should be recorded for each production verification.
Browsers without JavaScript receive only whatever server-rendered content the
current build exposes; a complete no-JavaScript experience is not claimed.
Internet Explorer is not supported.

## Graphics

WebGL-capable hardware is required for the enhanced 3D scene. The semantic
catalogue, object information, tours/transcripts, and settings must remain
useful when WebGL cannot initialise or a context is lost. WebGPU is not a
requirement and the current reference renderer does not claim a WebGPU path.

Hardware, driver, energy-saving, privacy, and enterprise policies can disable
or degrade graphics even in a supported browser. Quality reduction and a
non-3D fallback are part of support; identical visual fidelity is not.

## Input and preferences

Supported browsers must be checked with keyboard, pointer, touch where
applicable, high-density displays, portrait/landscape, text zoom, high
contrast, and `prefers-reduced-motion`. The renderer polls the standard Gamepad
API mapping for movement, look, zoom, selection, and reset where available.
Controller mappings, browser permissions, and hardware vary, so broad gamepad
compatibility is not guaranteed until a release matrix records it.

## Upgrade policy

Review the matrix at least quarterly and before a major vinext, React, Three.js,
build-tool, or managed-runtime upgrade. Dropping a browser requires usage/support
evidence, an accessibility review, documentation, and a usable fallback.
