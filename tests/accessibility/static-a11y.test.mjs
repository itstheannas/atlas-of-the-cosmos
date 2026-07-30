import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);

test("the application exposes keyboard, canvas, and text alternatives", async () => {
  const [app, explorer, layout, scene, chromeCopy, tours, css] =
    await Promise.all([
      readFile(new URL("app/CosmosApp.tsx", root), "utf8"),
      readFile(new URL("app/components/ExplorerView.tsx", root), "utf8"),
      readFile(new URL("app/layout.tsx", root), "utf8"),
      readFile(new URL("app/components/CosmosScene.tsx", root), "utf8"),
      readFile(new URL("lib/i18n-chrome.ts", root), "utf8"),
      readFile(new URL("app/components/ToursView.tsx", root), "utf8"),
      readFile(new URL("app/globals.css", root), "utf8"),
    ]);

  assert.match(app, /className="skip-link"/);
  assert.match(app, /aria-live="polite"/);
  assert.match(explorer, /accessible-scene-list/);
  assert.match(scene, /role="application"/);
  assert.match(scene, /copy\.keyboardInstructions/);
  assert.match(
    chromeCopy,
    /keyboardInstructions:\s*[\r\n]*\s*"Keyboard controls:/,
  );
  assert.match(layout, /lang=\{defaultLocale\}/);
  assert.match(layout, /dir=\{localeDirection\(defaultLocale\)\}/);
  assert.match(tours, /tourTranscript|copy\.tourTranscript/);
  assert.match(tours, /aria-label=\{copy\.toursView\.selectChapter\}/);
  assert.match(tours, /role="progressbar"/);
  assert.match(tours, /onUserInteraction=/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /forced-colors:\s*active/);
});

test("interactive overlays use native dialog, details, and labelled controls", async () => {
  const [search, layers, navigation, objectPanel, explorer, css] =
    await Promise.all([
      readFile(new URL("app/components/SearchDialog.tsx", root), "utf8"),
      readFile(new URL("app/components/LayerManager.tsx", root), "utf8"),
      readFile(new URL("app/components/Navigation.tsx", root), "utf8"),
      readFile(new URL("app/components/ObjectPanel.tsx", root), "utf8"),
      readFile(new URL("app/components/ExplorerView.tsx", root), "utf8"),
      readFile(new URL("app/globals.css", root), "utf8"),
    ]);
  assert.match(search, /<dialog/);
  assert.match(search, /role="listbox"/);
  assert.match(layers, /type="checkbox"/);
  assert.match(layers, /inert=\{!open\}/);
  assert.match(navigation, /navigationOpen \? \(/);
  assert.match(navigation, /inert=\{!navigationOpen\}/);
  assert.match(navigation, /role="dialog"/);
  assert.match(navigation, /aria-modal=/);
  assert.match(navigation, /#main-content/);
  assert.match(navigation, /closeButtonRef\.current\?\.focus/);
  assert.match(navigation, /triggerRef\.current\?\.focus/);
  assert.match(objectPanel, /aria-labelledby="object-panel-title"/);
  assert.match(objectPanel, /role="tablist"/);
  assert.match(objectPanel, /aria-controls=\{tabPanelId\}/);
  assert.match(objectPanel, /role="tabpanel"/);
  assert.match(objectPanel, /event\.key === "ArrowRight"/);
  assert.match(objectPanel, /<dl className="measurement-list"/);
  assert.match(explorer, /explorer-semantic-overlays/);
  assert.match(explorer, /cameraTargetDistance/);
  assert.match(
    css,
    /\.explorer-toolbar button\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px;/s,
  );
  assert.match(css, /\.scale-rail-steps button\s*\{\s*min-height:\s*44px;/s);
});
