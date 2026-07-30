import { englishChromeCopy } from "./i18n-chrome.ts";

export const supportedLocales = ["en"] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

export const defaultLocale: SupportedLocale = "en";

export type AppSection =
  | "explorer"
  | "tours"
  | "catalogue"
  | "solar-system"
  | "stars"
  | "exoplanets"
  | "deep-sky"
  | "milky-way"
  | "galaxies"
  | "cosmic-scale"
  | "learning"
  | "saved"
  | "settings"
  | "about-data"
  | "methodology"
  | "accessibility"
  | "privacy"
  | "security"
  | "attributions";

export interface NavigationItem {
  readonly id: AppSection;
  readonly symbol: string;
  readonly group: "explore" | "discover" | "reference";
}

export const navigationItems: readonly NavigationItem[] = [
  { id: "explorer", symbol: "✦", group: "explore" },
  { id: "tours", symbol: "▶", group: "explore" },
  { id: "catalogue", symbol: "⌕", group: "explore" },
  { id: "solar-system", symbol: "☉", group: "discover" },
  { id: "stars", symbol: "✧", group: "discover" },
  { id: "exoplanets", symbol: "◌", group: "discover" },
  { id: "deep-sky", symbol: "⌁", group: "discover" },
  { id: "milky-way", symbol: "⊙", group: "discover" },
  { id: "galaxies", symbol: "∞", group: "discover" },
  { id: "cosmic-scale", symbol: "↗", group: "discover" },
  { id: "learning", symbol: "◇", group: "reference" },
  { id: "saved", symbol: "☆", group: "reference" },
  { id: "settings", symbol: "⚙", group: "reference" },
  { id: "about-data", symbol: "◫", group: "reference" },
  { id: "methodology", symbol: "∴", group: "reference" },
  { id: "accessibility", symbol: "◎", group: "reference" },
  { id: "privacy", symbol: "◐", group: "reference" },
  { id: "security", symbol: "▣", group: "reference" },
  { id: "attributions", symbol: "†", group: "reference" },
] as const;

const englishUiCopy = {
  ...englishChromeCopy,
  brand: "Atlas of the Cosmos",
  brandShort: "ATLAS / COSMOS",
  edition: "An Annas M. Ishtiaq project",
  openNavigation: "Open navigation",
  closeNavigation: "Close navigation",
  skipToContent: "Skip to main content",
  commandSearch: "Search objects, catalogues, and classes",
  searchShortcut: "⌘ K",
  searchTitle: "Search the cosmos",
  searchHint: "Try “Andromeda”, “M 87”, “exoplanet”, or “type:galaxy”.",
  noSearchResults:
    "No objects match this query in the loaded reference sample.",
  searchDisclosure:
    "Results come from the curated local reference sample. Procedural background points are never searchable.",
  flyTo: "Fly to object",
  inspect: "Inspect",
  bookmark: "Save object",
  removeBookmark: "Remove saved object",
  back: "Previous object",
  forward: "Next object",
  resetView: "Reset to Earth",
  layers: "Layers",
  close: "Close",
  data: "Data",
  observed: "Observed",
  derived: "Derived",
  estimated: "Estimated",
  modelled: "Modelled",
  illustrative: "Illustrative",
  conceptual: "Conceptual",
  unknown: "Unknown",
  catalogueBacked: "Catalogue-backed",
  procedural: "Procedural context",
  curatedSample: "Curated educational sample",
  provenance: "Provenance",
  uncertainties: "Uncertainty & limits",
  relatedObjects: "Related objects",
  externalReferences: "Authoritative references",
  currentTarget: "Current target",
  referenceFrame: "Reference frame",
  coordinateSystem: "Coordinate system",
  targetDistance: "Distance",
  cameraSpeed: "Camera speed",
  cameraMode: "Camera mode",
  cinematic: "Cinematic",
  scientific: "Scientific",
  screenshotMode: "Clean screenshot mode",
  exitScreenshot: "Exit screenshot mode",
  scale: "Scale",
  scaleJourney: "Scale journey",
  time: "Time",
  play: "Play",
  pause: "Pause",
  reverse: "Reverse",
  present: "Now",
  julianDate: "Julian date",
  utc: "UTC",
  timeModelNote:
    "Precision ephemerides are not bundled; use JPL Horizons or another maintained ephemeris for observation and navigation.",
  catalogueTitle: "A navigable scientific reference",
  catalogueDek:
    "Search, filter, compare, and open every provenance-labelled object in the curated educational sample.",
  filters: "Filters",
  allTypes: "All object types",
  allSources: "All sources",
  sortBy: "Sort by",
  name: "Name",
  distance: "Distance",
  objectType: "Object type",
  source: "Source",
  evidence: "Evidence",
  results: "results",
  compare: "Compare",
  comparisonTitle: "Object comparison",
  comparisonEmpty:
    "Select two or three objects from the catalogue to compare them.",
  sideBySide: "Side by side",
  trueScale: "True-scale size",
  logarithmic: "Logarithmic",
  normalised: "Normalised",
  comparisonCaveat:
    "Illustrations are diagrammatic unless true-scale mode is available. Distance and size are never shown on the same linear scale.",
  toursTitle: "Guided journeys through evidence and scale",
  toursDek:
    "Seven data-driven tours pair interruptible camera travel with captions, transcripts, sources, and scientific caveats.",
  chapters: "chapters",
  startTour: "Start tour",
  resumeTour: "Resume",
  previousChapter: "Previous chapter",
  nextChapter: "Next chapter",
  replayChapter: "Replay chapter",
  exitTour: "Exit tour",
  tourTranscript: "Transcript",
  tourSources: "Tour sources",
  deviceNarration: "Read with device voice",
  stopNarration: "Stop narration",
  manualExploration:
    "Manual exploration pauses the tour; resume whenever you are ready.",
  reducedTour:
    "Reduced-motion mode replaces long flights with immediate target changes and short fades.",
  learningTitle: "Learn how astronomy becomes knowledge",
  learningDek:
    "Change the explanation depth without losing uncertainty, method, or the distinction between observation and inference.",
  beginner: "Beginner",
  student: "Student",
  advanced: "Advanced",
  howWeKnow: "How do we know this?",
  misconception: "Common misconception",
  knowledgeCheck: "Knowledge check",
  checkAnswer: "Check answer",
  correct: "Correct",
  tryAgain: "Not quite",
  glossary: "Glossary",
  savedTitle: "Your local observing list",
  savedDek:
    "Bookmarks stay on this device. No account, tracking profile, or cloud sync is used.",
  noSaved: "No saved objects yet. Use the star button on any object.",
  settingsTitle: "Experience settings",
  appearance: "Appearance",
  darkTheme: "Dark",
  lightTheme: "Light",
  contrastTheme: "High contrast",
  quality: "Visual quality",
  automatic: "Automatic",
  low: "Low",
  medium: "Medium",
  high: "High",
  ultra: "Ultra",
  motion: "Motion",
  reducedMotion: "Reduce motion",
  proceduralBackground: "Procedural background",
  coordinateGrid: "Coordinate grid",
  orbitPaths: "Orbit paths",
  educationalLabels: "Educational labels",
  resetPreferences: "Reset all local data",
  resetConfirm: "Local Atlas data has been reset.",
  accessibleList: "Synchronized accessible object list",
  sceneFallback:
    "The 3D scene is unavailable. Search, tours, catalogue data, and object relationships remain available below.",
  sceneInstructions:
    "Drag or use arrow keys to rotate. Scroll or use plus and minus to zoom. Select a visible object or use search to travel.",
  loadedSample: "Loaded reference sample",
  catalogueObjects: "catalogue and derived exhibits",
  proceduralPoints: "batched procedural context points",
  aboutDataTitle: "About the data",
  methodologyTitle: "Methodology",
  accessibilityTitle: "Accessibility",
  privacyTitle: "Privacy",
  securityTitle: "Security",
  attributionsTitle: "Attributions",
  returnExplorer: "Open in explorer",
  menuExplore: "Explore",
  menuDiscover: "Discover",
  menuReference: "Reference",
  offlineReady: "Local sample available",
  networkStatusOnline: "Online",
  networkStatusOffline: "Offline — using bundled data",
} as const;

type LocalisedShape<T> = T extends string
  ? string
  : T extends readonly (infer Item)[]
    ? readonly LocalisedShape<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: LocalisedShape<T[Key]> }
      : T;

export type UiCopy = LocalisedShape<typeof englishUiCopy>;

export const uiCopy = {
  en: englishUiCopy,
} satisfies Readonly<Record<SupportedLocale, UiCopy>>;

export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return supportedLocales.includes(locale as SupportedLocale);
}

export function getUiCopy(locale: string = defaultLocale): UiCopy {
  return isSupportedLocale(locale) ? uiCopy[locale] : uiCopy[defaultLocale];
}

const rtlLanguages = new Set([
  "ar",
  "ckb",
  "dv",
  "fa",
  "he",
  "ku",
  "ps",
  "sd",
  "ug",
  "ur",
  "yi",
]);
const rtlScripts = new Set(["adlm", "arab", "hebr", "nkoo", "rohg", "thaa"]);
const ltrScripts = new Set(["cyrl", "latn"]);

export function localeDirection(locale: string): "ltr" | "rtl" {
  const subtags = locale.trim().toLocaleLowerCase("en").split(/[-_]/);
  const language = subtags[0];
  const script = subtags.find((subtag) => subtag.length === 4);
  if (script && rtlScripts.has(script)) return "rtl";
  if (script && ltrScripts.has(script)) return "ltr";
  return rtlLanguages.has(language ?? "") ? "rtl" : "ltr";
}

export type UiMessageValue = string | number;

export function formatUiMessage(
  template: string,
  values: Readonly<Record<string, UiMessageValue>>,
): string {
  return template.replace(
    /\{([A-Za-z][A-Za-z0-9]*)\}/g,
    (placeholder, key: string) =>
      Object.prototype.hasOwnProperty.call(values, key)
        ? String(values[key])
        : placeholder,
  );
}

export function formatNumber(
  value: number,
  locale: string = defaultLocale,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatDateTime(
  value: Date | number,
  locale: string = defaultLocale,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, options).format(value);
}

function translationLeafKeys(value: unknown, prefix = ""): readonly string[] {
  if (typeof value === "string") return [prefix];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      translationLeafKeys(item, `${prefix}[${index}]`),
    );
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) =>
      translationLeafKeys(item, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [];
}

export interface TranslationKeyValidation {
  readonly locale: string;
  readonly missing: readonly string[];
  readonly extra: readonly string[];
}

export function validateTranslationKeys(
  resources: Readonly<Record<string, unknown>> = uiCopy,
  fallbackLocale: string = defaultLocale,
): readonly TranslationKeyValidation[] {
  const fallback = resources[fallbackLocale];
  if (!fallback) {
    return [
      {
        locale: fallbackLocale,
        missing: ["<fallback locale>"],
        extra: [],
      },
    ];
  }
  const fallbackKeys = new Set(translationLeafKeys(fallback));
  return Object.entries(resources).map(([locale, resource]) => {
    const localeKeys = new Set(translationLeafKeys(resource));
    return {
      locale,
      missing: [...fallbackKeys].filter((key) => !localeKeys.has(key)).sort(),
      extra: [...localeKeys].filter((key) => !fallbackKeys.has(key)).sort(),
    };
  });
}

const sectionIds = new Set<AppSection>(navigationItems.map((item) => item.id));

export function normalizeSection(value: string | undefined): AppSection {
  return value && sectionIds.has(value as AppSection)
    ? (value as AppSection)
    : "explorer";
}

export function sectionHref(section: AppSection): string {
  return section === "explorer" ? "/" : `/${section}`;
}
