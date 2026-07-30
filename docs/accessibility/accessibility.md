# Accessibility statement

## Commitment and scope

Atlas targets WCAG 2.2 Level AA for the public web experience. The 3D scene is
an enhancement, not the sole source of critical information. Users must be
able to navigate sections, search the sample catalogue, read object
descriptions and provenance, use tour transcripts/chapters, change settings,
and manage saved objects without operating the canvas.

This is a target and implementation statement, not a third-party conformance
certification. Automated checks cover only part of WCAG; each release still
needs the manual checks below.

## Design requirements

- A skip link and semantic landmarks expose a predictable document structure.
- Navigation and controls use native elements where possible.
- Every interactive element is keyboard reachable, visibly focused, and has an
  accessible name.
- Selection, saved state, and expanded/collapsed state are not communicated by
  colour alone.
- The visualisation has a concise text description and a synchronised semantic
  catalogue/selection alternative.
- Important updates use restrained status announcements; camera frames and
  decorative motion are never announced continuously.
- Dialogs and drawers keep a logical focus sequence, support Escape where
  appropriate, and restore focus to their trigger.
- Tour captions/transcripts contain the educational content conveyed by
  visuals; optional audio must not be the only channel.
- Controls remain usable at 200% text zoom, narrow viewport widths, touch
  target sizes, and portrait orientation.
- Motion follows both the OS preference and the in-app reduced-motion setting.
- High contrast and colour-vision-safe labels do not depend on opacity alone.

## Three-dimensional alternative

The canvas may be hidden from the accessibility tree when equivalent controls
and content exist outside it. If the canvas itself is focusable, it needs a
clear name, instructions, and a way to leave it without a keyboard trap.

An object represented visually must be reachable through search or the
catalogue. Its text view includes identity, object class, distance/status,
provenance, and uncertainty/illustrative disclosure when available. Decorative
procedural points are not exposed as hundreds of meaningless list items.

When WebGL fails, the app must retain section navigation and semantic content;
the error should not become a permanent spinner.

## Motion

Reduced motion replaces long camera travel and animated transitions with
immediate state changes, fades, or short restrained movement. Users can
interrupt automated travel and tours. No required control depends on
animation completing.

## Automated checks

Run:

```bash
npm run test:a11y
npm run build
npm run test:rendered
npm run test:e2e
```

`test:a11y` inspects source invariants such as landmarks, names/labels, motion
CSS, non-canvas alternatives, and labelled controls. `test:rendered` checks
representative final HTML. Playwright includes one desktop catalogue axe smoke
audit plus desktop/mobile interaction coverage. These checks cannot establish
focus order, screen-reader quality, visual contrast in every state, touch
behaviour, or motion comfort.

## Manual release checklist

Record browser, OS, viewport, assistive technology, commit, and result.

### Keyboard

- Use the entire principal flow with Tab, Shift+Tab, Enter, Space, arrows where
  documented, and Escape.
- Confirm the skip link works and focus is never lost behind an overlay.
- Start, pause, resume, and exit a tour without a pointer.
- Search, inspect an object, toggle a layer, change quality, and save/remove a
  bookmark.

### Screen reader

- Check landmarks, page title, headings, navigation current state, buttons,
  search status, selection details, settings, and tour progress with at least
  one desktop screen reader/browser pair.
- Confirm changes are announced once and decorative scene updates are quiet.
- Confirm source/procedural/uncertainty labels make sense without colour.

### Visual

- Verify text and non-text contrast in default, light, and high-contrast modes.
- Test 200% and 400% zoom/reflow without clipped controls or two-dimensional
  scrolling for ordinary text.
- Check narrow mobile portrait and landscape layouts.
- Confirm visible focus against every panel/scene background.

### Motion and input

- Enable OS reduced motion before page load and during a session.
- Interrupt every automated camera/tour movement.
- Test touch targets and gestures without hover.
- Confirm scene interactions do not trap keyboard or prevent normal page
  navigation.

### Failure alternative

- Block or disable WebGL and confirm useful catalogue/tour content.
- Corrupt stored settings and confirm a safe default/reset path.
- Simulate an asset failure and confirm a calm error rather than endless
  loading.

## Reporting barriers

Report accessibility barriers through the project issue channel unless the
report contains a security/privacy concern, in which case use the private
process in `SECURITY.md`. Include the route, interaction, browser/assistive
technology, and desired outcome; personal medical information is unnecessary.
