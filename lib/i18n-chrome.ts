/**
 * English interface chrome. Scientific catalogue records and authored learning
 * content remain in their domain datasets; controls, state, headings, helper
 * text, and accessibility labels live here so another locale can replace the
 * complete interface without editing React components.
 */
export const englishChromeCopy = {
  metadata: {
    defaultTitle: "Atlas of the Cosmos — Explore our scientific cosmic address",
    titleTemplate: "%s · Atlas of the Cosmos",
    description:
      "A provenance-aware, interactive astronomical atlas with a 3D explorer, curated catalogue, guided tours, learning tools, and accessible text alternatives.",
    applicationName: "Atlas of the Cosmos",
    category: "science",
    keywords: [
      "astronomy",
      "cosmos",
      "space",
      "planetarium",
      "scientific visualisation",
    ],
    socialTitle: "Atlas of the Cosmos",
    socialDescription:
      "A scientific journey through scale, evidence, and our cosmic address.",
    socialImageAlt: "Atlas of the Cosmos — a scientific journey through scale",
    author: "Annas M. Ishtiaq",
  },
  navigation: {
    explorer: { label: "Universe explorer", shortLabel: "Explore" },
    tours: { label: "Guided tours", shortLabel: "Tours" },
    catalogue: { label: "Object catalogue", shortLabel: "Catalogue" },
    "solar-system": { label: "Solar System", shortLabel: "Solar" },
    stars: { label: "Stars", shortLabel: "Stars" },
    exoplanets: { label: "Exoplanets", shortLabel: "Exoplanets" },
    "deep-sky": { label: "Deep-sky objects", shortLabel: "Deep sky" },
    "milky-way": { label: "Milky Way", shortLabel: "Milky Way" },
    galaxies: { label: "Galaxies", shortLabel: "Galaxies" },
    "cosmic-scale": { label: "Cosmic scale", shortLabel: "Scale" },
    learning: { label: "Learning centre", shortLabel: "Learn" },
    saved: { label: "Saved objects", shortLabel: "Saved" },
    settings: { label: "Settings", shortLabel: "Settings" },
    "about-data": { label: "About the data", shortLabel: "Data" },
    methodology: { label: "Methodology", shortLabel: "Method" },
    accessibility: { label: "Accessibility", shortLabel: "Access" },
    privacy: { label: "Privacy", shortLabel: "Privacy" },
    security: { label: "Security", shortLabel: "Security" },
    attributions: { label: "Attributions", shortLabel: "Credits" },
    primary: "Primary",
    allSections: "All sections",
    copyright: "Copyright © 2026 Annas M. Ishtiaq. All rights reserved.",
  },
  app: {
    loadingExplorer: "Preparing the scale-aware 3D scene…",
    loadingTours: "Preparing guided tour controls…",
    recoveryEyebrow: "View recovery",
    recoveryTitle: "This interactive view could not be loaded.",
    recoveryBody:
      "The catalogue and learning sections remain available. Retry after checking the connection, or use the non-3D catalogue.",
    retryView: "Retry view",
    openCatalogue: "Open catalogue",
    storageUnavailable:
      "Browser storage is unavailable. This session will continue in memory without saving changes.",
    storageWriteFailed:
      "Changes could not be saved in this browser. This session will continue in memory.",
    offlineCachingUnavailable:
      "Offline caching is unavailable in this browser; bundled data remains usable while the page is open.",
    fallbackObjectName: "Object",
    removedFromSaved: "{name} removed from saved objects.",
    savedOnDevice: "{name} saved on this device.",
    resetStorageUnavailable:
      "Local Atlas data has been reset. Browser storage remains unavailable; the reset applies to this session.",
    selectedObjectAnnouncement: "Selected {name}.",
  },
  domains: {
    "solar-system": {
      title: "Worlds within the Sun’s domain",
      description:
        "A provenance-labelled path through planets, major moons, dwarf planets, belts, the heliosphere, and the explicitly conceptual Oort Cloud.",
    },
    stars: {
      title: "Stars as measured, changing objects",
      description:
        "Nearby stars, stellar evolution, remnants, and black-hole candidates—without treating mass-dependent outcomes as one universal sequence.",
    },
    exoplanets: {
      title: "Worlds found through their effects",
      description:
        "Confirmed examples across transit, radial-velocity, direct-imaging, and microlensing discoveries, with selection bias and habitability caveats intact.",
    },
    "deep-sky": {
      title: "Nebulae, clusters, and stellar remnants",
      description:
        "Catalogue anchors and derived structures from molecular clouds to supernova remnants, with reconstruction and observation kept visibly separate.",
    },
    "milky-way": {
      title: "Inside a galaxy we cannot photograph from outside",
      description:
        "Observed anchors and an explicitly illustrative structural reconstruction of the disc, bar, bulge, halo, Galactic Centre, and satellites.",
    },
    galaxies: {
      title: "Galaxies, groups, clusters, and the web",
      description:
        "A curated route from the Local Group to galaxy interactions, Virgo, and modelled large-scale structure—never a claim to map every galaxy.",
    },
  },
  catalogueView: {
    eyebrow: "Catalogue / local reference dataset",
    datasetStatus: "Dataset status",
    snapshot: "snapshot 2026.07",
    searchPlaceholder: "Name, identifier, or class",
    evidenceNotice:
      "Catalogue-backed, derived, conceptual, and modelled entries carry distinct evidence labels.",
    pagesLabel: "Catalogue pages",
    previousPage: "← Previous",
    nextPage: "Next →",
    pageStatus: "Page {current} of {total}",
  },
  comparisonView: {
    fields: {
      physicalSize: "Physical size",
      mass: "Mass",
      temperature: "Temperature",
      distance: "Distance",
      luminosity: "Luminosity",
      age: "Age",
      orbitalPeriod: "Orbital period",
      discoveryMethod: "Discovery method",
    },
    diameterFromRadius: "Compared as diameter (2 × the sourced radius).",
    sideBySideDescription:
      "Diagrammatic mode: icons use equal diameters. Sourced values, units, evidence, and uncertainty remain in the table.",
    trueScaleDescription:
      "Linear true-scale mode: each icon diameter is directly proportional to its canonical physical diameter. No visibility floor is applied; very small objects may be imperceptible.",
    logarithmicDescription:
      "Diagrammatic logarithmic mode: icon diameters use a labelled visibility floor, and compatible table values are positioned across each row’s logarithmic range. This is not true scale.",
    normalisedDescription:
      "Diagrammatic normalised mode: compatible values are converted to one canonical unit, then shown as a linear fraction of that row’s maximum. Mixed dimensions are not plotted.",
    normalisedRatio: "Linear ratios in canonical {unit}.",
    logarithmicPosition: "Logarithmic positions in canonical {unit}.",
    incompatibleRatio: "No ratio: mixed dimensions ({dimensions}).",
    nonRatio: "No ratio: {dimension} values are not linear quantities.",
    insufficientRatio: "No ratio: fewer than two compatible numeric values.",
    eyebrow: "Scientific comparison",
    modeLabel: "Comparison mode",
    removeObject: "Remove {name} from comparison",
    sizeUnavailable: "Size unavailable",
    trueScaleRatio:
      "Icon diameter: {percentage} of the largest selected physical diameter.",
    fixedDiagram:
      "Fixed diagram icon: fewer than two compatible physical sizes.",
    logarithmicFloor: "Logarithmic diagram with an 18% visibility floor.",
    accessibleCaption:
      "Accessible textual comparison of selected astronomical objects. Bar ratios are shown only for compatible physical dimensions.",
    property: "Property",
    logarithmicRowPosition: "Logarithmic row position: {percentage}.",
    linearRowRatio: "Linear ratio to row maximum: {percentage}.",
    evidenceAndSource: "Evidence: {evidence} · Source: {source}",
    intervalMidpoint: "Interval midpoint used for this diagram.",
    uncertainty: "Uncertainty: ± {value}",
    note: "Note: {value}",
  },
  explorerView: {
    sceneLabel: "{instructions} Current target: {name}.",
    currentPosition: "Current position",
    scaleLocalSchematic: "scale-local schematic",
    cameraRelativePosition: "Camera-relative position",
    cameraTargetDistance: "Distance from target",
    schematicRenderUnits: "{value} schematic render units",
    initialising: "initialising…",
    renderCoordinateCaveat:
      "Render coordinates are bounded visual positions, never scientific coordinates or an implied common physical scale.",
    controls: "Explorer controls",
    cameraSpeedLabel: "Camera speed: {speed}×",
    selectedScience: "Selected-object scientific labels",
    identifiers: "Identifiers",
    coordinates: "Coordinates",
    evidenceAndSource: "Evidence and source",
    noIdentifiers: "No catalogue identifier",
    noCoordinates: "No catalogue coordinates",
    uncertaintyOverlay: "Selected-object uncertainty",
    noStatedUncertainty:
      "No additional numeric uncertainty is stated for this selected record.",
    habitableZoneLimitation: "Habitable-zone model limitation",
    habitableZoneUnavailable:
      "No reviewed habitable-zone geometry is available for {name}. No zone is drawn; habitability or life cannot be inferred from orbital distance alone.",
  },
  cosmosScene: {
    defaultAriaLabel:
      "Interactive three-dimensional atlas of a curated astronomical sample. Drag to rotate, use the wheel or pinch to zoom, and use W A S D, Q E, or arrow keys to navigate.",
    canvasAlternative:
      "The interactive canvas is optional. Use the synchronised catalogue and tour transcripts to explore the same objects without 3D graphics.",
    illustrativeBackground: "Illustrative background",
    retryView: "Retry 3D view",
    keyboardInstructions:
      "Keyboard controls: W and S move forward and back; A and D move sideways; Q and E move vertically; arrow keys rotate; plus and minus zoom; Enter selects the object at the centre; Home resets the view; and Escape interrupts an automated flight.",
    proceduralDescription:
      "Catalogue markers are selectable. Background points are deterministic procedural context, have no catalogue identifiers, and can be disabled with the procedural-background layer control. Render positions, marker sizes, grid bands, and orbit rings are schematic and not one physical distance scale.",
    fallbackContextLost:
      "The 3D view was interrupted. Atlas is attempting to restore the graphics context; the catalogue and object details remain available.",
    fallbackUnsupported:
      "This browser or device does not expose WebGL 2. Use the synchronised catalogue and tours as the non-3D alternative.",
    fallbackFailed:
      "The 3D view could not start or recover. Use the synchronised catalogue and object details, then retry when graphics resources are available.",
    statusContextLost:
      "The graphics context was interrupted. Atlas is attempting to restore it.",
    statusContextRecoveryFailed:
      "The graphics context did not recover. The catalogue remains available outside the 3D view.",
    statusContextRestored:
      "The graphics context was restored and rendering resumed.",
    statusReady: "The WebGL 2 renderer is ready in {quality} quality.",
    statusUnsupported:
      "WebGL 2 is unavailable. The non-3D catalogue remains usable.",
    statusInitialisationFailed:
      "The 3D renderer failed to initialise. The non-3D catalogue remains usable.",
    recordLabels: {
      catalogue: "catalogue",
      derivedStructure: "derived structure",
      proceduralContext: "procedural context",
      conceptualModel: "conceptual model",
    },
  },
  layerManager: {
    groups: {
      solarSystem: "Solar System",
      stellar: "Stars & exoplanets",
      deepSky: "Deep sky",
      galactic: "Galaxy",
      cosmological: "Cosmic context",
      reference: "Reference overlays",
      education: "Education",
    },
    eyebrow: "Visibility & evidence",
    intro:
      "Layers respond to scale. Catalogue, modelled, and procedural content remain visibly distinguished.",
    outsideScale: "Outside this scale; preference retained",
    dataModes: {
      catalogue: "catalogue",
      procedural: "procedural",
      mixed: "mixed",
      model: "model",
    },
  },
  timeControls: {
    utcDateTime: "UTC date and time",
    showLocalTime: "Show local time",
    local: "Local",
    speedLabel: "Time speed",
    minutePerSecond: "{sign}1 min/s",
    hourPerSecond: "{sign}1 hr/s",
    dayPerSecond: "{sign}1 day/s",
    multiplier: "{sign}{value}×",
    meanOrbitalPhase: "{name} mean orbital phase",
    rotationPhase: "{name} rotation phase",
    degrees: "{value}\u00b0",
    moonPhase: "Moon phase",
    moonIllumination: "{phase}, {percentage}% lit",
    modelWindow: "Model window",
    withinRange: "Within educational range",
    outsideRange: "Outside range; scene clamped to {date}",
    historicalEvent: "Historical astronomical event",
    chooseEvent: "Choose an event\u2026",
    eventOption: "{date} \u2014 {title}",
    modelNote:
      "{validity} Positions use rounded mean periods and circular paths; moon illumination and rotation are phase indicators. {precisionNote}",
  },
  learningView: {
    eyebrow: "Evidence / uncertainty / method",
    explanationLevel: "Explanation level",
    topics: "Learning topics",
    explanationHeading: "{level} explanation",
    exploreEvidence: "Explore the evidence",
    sources: "Sources for this explanation",
    glossaryCount: "Thirty-two terms",
    searchGlossary: "Search glossary",
    glossaryPlaceholder: "Search scientific terms",
    expandedDefinition: "Expanded definition",
    correctResult: "Correct.",
    tryAgainResult: "Not quite.",
  },
  searchDialog: {
    placeholder: "Name, ID, const:Orion, cone:83,-5,8…",
    escapeKey: "ESC",
    advancedHint:
      "Advanced: const:Orion, cone:RA\u00b0,Dec\u00b0,radius\u00b0, or near:andromeda-galaxy,5deg.",
    recentSearches: "Recent searches",
    searchResults: "Search results",
  },
  savedView: {
    eyebrow: "Private / device-local",
    savedCount: "saved",
    removeObject: "{action}: {name}",
    historyEyebrow: "Local history",
    recentlyViewed: "Recently viewed",
  },
  settingsView: {
    eyebrow: "Display / motion / rendering",
    intro:
      "Settings are versioned and stored only in this browser. System reduced-motion preferences are honoured automatically.",
    appearanceDescription:
      "Choose a legible palette for your viewing conditions.",
    themeLabel: "Theme",
    qualityDescription:
      "Automatic adapts detail to the device; Scientific suppresses decorative effects and prioritises stable labels.",
    motionDescription: "Every automated transition remains interruptible.",
    reducedMotionDescription:
      "Use cuts and short fades instead of long flights.",
    overlaysTitle: "Scene overlays",
    overlaysDescription:
      "Control context and reference markings independently.",
    proceduralBackgroundDescription:
      "Unlabelled visual context, never catalogue data.",
    coordinateGridDescription: "Scale-local coordinate reference.",
    orbitPathsDescription:
      "Diagrammatic paths unless an epoch model is stated.",
    educationalLabelsDescription:
      "Density-limited labels for important targets.",
  },
  scaleView: {
    eyebrow: "{journey} / 10³ to 10²⁷ metres",
    title: "Eight reference frames, one connected address",
    intro:
      "The atlas never places the whole cosmos in one naïve coordinate space. Each step changes origin, precision, representation, and evidence density.",
    coordinateStrategy: "Coordinate strategy",
    representation: "Representation",
  },
  objectPanel: {
    history: "Object history",
    details: "Object details",
    overview: "Overview",
    scaleLocal: "Scale-local",
    relationships: "Relationships",
    parent: "Parent",
    child: "Child",
    related: "Related",
    relationshipDescription: "{relationship} · {objectType}",
    relatedTourChapters: "Related tour chapters",
    chapterLink: "Chapter {number}: {title}",
    measurements: "Measurements and stated values",
    provenanceSummary: "Retrieved {date}. {status}.",
    uncertaintyValue: "± {value}",
  },
  toursView: {
    indexEyebrow: "Seven journeys / fifty-seven chapters",
    durationMinutes: "{minutes} min",
    guidedJourney: "Guided journey",
    moreChapters: "+ {count} more",
    experienceEyebrow: "Guided tour",
    chapter: "Chapter",
    selectChapter: "Select tour chapter",
    tourProgress: "Tour progress",
    sceneLabel: "Guided 3D view for {title}. {caption}",
    cosmicContext: "Cosmic context",
    chapterEyebrow: "Chapter {number}",
    methodNote: "Method note · {caveat}",
    pausedForExploration:
      "Tour paused for manual exploration. Resume when you are ready.",
    playingChapter: "Playing chapter {number}.",
    tourComplete: "Tour complete.",
    pausedAtChapter: "Paused at chapter {number}.",
    elapsedTime: "{elapsed}s / {duration}s",
  },
  referenceView: {
    methodology: {
      eyebrow: "Scientific method / coordinate strategy",
      title: "Methodology",
      intro:
        "Every display passes through an evidence-aware editorial layer. Measured, derived, estimated, modelled, conceptual, and illustrative content remain distinct.",
      sections: [
        {
          title: "Coordinates and scale",
          body: "Local body-fixed, heliocentric-ecliptic, ICRS, galactocentric, Local Group, and comoving cosmological frames are used at different scales. Camera-relative rendering and origin rebasing prevent distant coordinates from eroding local precision.",
        },
        {
          title: "Distances are not all measured alike",
          body: "Radar, parallax, standard candles, redshift-based model distances, and comoving distances answer different questions. Missing or negative parallax is never silently inverted into an exact distance.",
        },
        {
          title: "Visual reconstruction",
          body: "Catalogue points anchor known objects. Dust, galaxy structure, filaments, and the Oort Cloud may use diagrammatic or statistical representations, each labelled by evidence basis and disableable when procedural.",
        },
        {
          title: "Time limits",
          body: "The bundled reference build animates display time but does not include a precision ephemeris. Production orbital work should query a recognised, epoch-valid source such as JPL Horizons.",
        },
      ],
    },
    accessibility: {
      eyebrow: "WCAG AA target / multimodal access",
      title: "Accessibility",
      intro:
        "The 3D scene is one path through the atlas, never the only path. Catalogue, relationships, tours, sources, and learning content remain available as semantic text.",
      sections: [
        {
          title: "Keyboard and focus",
          body: "Navigation, search, object selection, layer controls, time controls, tours, and settings use native controls with visible focus. The scene supports arrow-key rotation and plus/minus zoom.",
        },
        {
          title: "Motion and contrast",
          body: "System reduced-motion is honoured and can be overridden locally. High-contrast and light themes are available. Evidence is always encoded with text as well as colour.",
        },
        {
          title: "Canvas alternative",
          body: "A synchronized, searchable object list follows the scene. Tour captions and complete transcripts provide an equivalent path through guided content.",
        },
        {
          title: "Known audit boundary",
          body: "Automated checks are useful but incomplete. The repository includes a manual checklist; assistive-technology and zoom testing must be repeated for every release.",
        },
      ],
    },
    privacy: {
      eyebrow: "Data minimisation / anonymous exploration",
      title: "Privacy",
      intro:
        "Anonymous exploration is the default. This reference release has no account system, advertising, behavioural profile, or third-party analytics.",
      sections: [
        {
          title: "What stays on this device",
          body: "Theme, quality, accessibility preferences, bookmarks, recent objects, recent searches, and tour progress use one versioned local-storage record. Resetting settings removes that record.",
        },
        {
          title: "What the server receives",
          body: "Normal HTTP request metadata is processed to deliver the site and local API responses. The application does not intentionally persist IP addresses, search terms, or catalogue activity.",
        },
        {
          title: "External references",
          body: "Opening an authoritative source leaves the atlas and subjects the request to that provider’s policies. Links are explicit and never loaded as invisible tracking pixels.",
        },
      ],
    },
    security: {
      eyebrow: "Threat model / least privilege",
      title: "Security",
      intro:
        "This release minimises attack surface: read-only bundled data, no accounts, no secrets in the client, no uploads, and no public administration interface.",
      sections: [
        {
          title: "Input and output",
          body: "API query lengths, filters, cursors, identifiers, and request bodies are validated. React performs output escaping; the application uses no unsafe HTML injection or dynamic executable code.",
        },
        {
          title: "HTTP boundaries",
          body: "Versioned routes return consistent errors, correlation identifiers, conservative cache controls, ETags, and no wildcard cross-origin policy. Production security headers are declared at the edge.",
        },
        {
          title: "Supply chain",
          body: "Exact versions and a lockfile are committed. CI runs static checks, dependency audit, secret scanning, CodeQL, tests, build, and SBOM generation. Findings remain release-gating evidence—not a claim of absolute security.",
        },
        {
          title: "Residual risk",
          body: "Browser graphics drivers, upstream dependency vulnerabilities, denial-of-service across distributed isolates, and source-data errors remain possible. The runbook defines update and incident procedures.",
        },
      ],
    },
    attributions: {
      eyebrow: "Scientific and legal traceability",
      title: "Attributions",
      intro:
        "Every bundled value and editorial statement points to a declared provider. This release ships no third-party imagery, textures, audio, or 3D models.",
      sections: [
        {
          title: "Application",
          body: "Atlas of the Cosmos is an original Annas M. Ishtiaq project. Project-authored code, content, design, and artwork are Copyright © 2026 Annas M. Ishtiaq. All rights reserved. The scene uses code-generated geometry, CSS, and a deterministic procedural context layer. Third-party scientific data retain their respective licences and required attribution.",
        },
        {
          title: "OpenNGC development sample",
          body: "The four-record ETL fixture derives from OpenNGC v20231203 under CC BY-SA 4.0, with its checksum, transformation report, and attribution bundled in the data manifest.",
        },
        {
          title: "Provider references",
          body: "NASA, JPL, ESA/Gaia, the NASA Exoplanet Archive, SIMBAD/CDS, the Event Horizon Telescope, Planck/ESA, and OpenNGC are credited for their respective reference material. Inclusion does not imply endorsement.",
        },
      ],
    },
    aboutData: {
      eyebrow: "Provenance / licences / limits",
      declaredSources: "declared sources",
      noHiddenImagery: "no hidden imagery",
      sourceLink: "Source ↗",
      version: "Version",
      snapshotPublication: "Snapshot / publication",
      access: "Access",
      licence: "Licence",
      attribution: "Attribution",
      citation: "Citation",
      updateStrategy: "Update strategy",
      transformationsAndLimitations:
        "Transformations, scientific fields, and known limitations",
      transformations: "Transformations",
      knownLimitations: "Known limitations",
      coordinatesAndUnits: "Coordinates and units",
      uncertaintyFields: "Uncertainty fields",
      validationRules: "Validation rules",
    },
    attributionTable: {
      caption: "Editorial source registry",
      provider: "Provider",
      dataset: "Dataset",
      version: "Version",
      date: "Snapshot / publication",
      licenceStatement: "Licence statement",
      attribution: "Required attribution",
      citation: "Citation / source link",
      transformations: "Transformations",
      limitations: "Known limitations",
    },
  },
  statusLabels: {
    recordKinds: {
      "catalogue-backed": "catalogue-backed",
      "derived-structure": "derived structure",
      "conceptual-model": "conceptual model",
      "procedural-context": "procedural context",
    },
    evidence: {
      observed: "Observed",
      derived: "Derived",
      estimated: "Estimated",
      modelled: "Modelled",
      illustrative: "Illustrative",
      conceptual: "Conceptual",
      unknown: "Unknown",
    },
  },
} as const;
