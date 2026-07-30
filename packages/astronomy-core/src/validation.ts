import type {
  CatalogueObject,
  ObjectType,
  Unit,
} from "../../shared-types/src/index.ts";

export interface ValidationIssue {
  readonly path: string;
  readonly code: string;
  readonly message: string;
  readonly severity: "error" | "warning";
}

export type ValidationResult<T> =
  | {
      readonly valid: true;
      readonly value: T;
      readonly issues: readonly ValidationIssue[];
    }
  | { readonly valid: false; readonly issues: readonly ValidationIssue[] };

const OBJECT_TYPES: ReadonlySet<ObjectType> = new Set([
  "star",
  "planet",
  "dwarf-planet",
  "moon",
  "asteroid",
  "comet",
  "exoplanet",
  "nebula",
  "open-cluster",
  "globular-cluster",
  "supernova-remnant",
  "pulsar",
  "magnetar",
  "black-hole-candidate",
  "galaxy",
  "galaxy-group",
  "galaxy-cluster",
  "large-scale-structure",
  "spacecraft",
  "other",
]);

const UNITS: ReadonlySet<Unit> = new Set([
  "km",
  "au",
  "ly",
  "pc",
  "kpc",
  "Mpc",
  "rad",
  "deg",
  "hour-angle",
  "arcmin",
  "arcsec",
  "mas",
  "s",
  "day",
  "Julian-year",
  "km/s",
  "km/s/Mpc",
  "mas/Julian-year",
  "kg",
  "earth-mass",
  "solar-mass",
  "earth-radius",
  "solar-radius",
  "K",
  "mag",
  "dimensionless",
  "redshift",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function pushError(
  issues: ValidationIssue[],
  path: string,
  code: string,
  message: string,
): void {
  issues.push({ path, code, message, severity: "error" });
}

function validateQuantity(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  expectedUnits?: ReadonlySet<Unit>,
): void {
  if (!isRecord(value)) {
    pushError(
      issues,
      path,
      "quantity.type",
      "Expected an explicit { value, unit } quantity.",
    );
    return;
  }
  if (typeof value.value !== "number" || !Number.isFinite(value.value)) {
    pushError(
      issues,
      `${path}.value`,
      "quantity.finite",
      "Quantity value must be finite.",
    );
  }
  if (!nonEmptyString(value.unit) || !UNITS.has(value.unit as Unit)) {
    pushError(
      issues,
      `${path}.unit`,
      "quantity.unit",
      "Quantity unit is unsupported.",
    );
  } else if (expectedUnits && !expectedUnits.has(value.unit as Unit)) {
    pushError(
      issues,
      `${path}.unit`,
      "quantity.dimension",
      "Quantity uses an incompatible unit.",
    );
  }
}

function validateMeasurement(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  expectedUnits?: ReadonlySet<Unit>,
): void {
  if (!isRecord(value)) {
    pushError(
      issues,
      path,
      "measurement.type",
      "Expected a measurement object.",
    );
    return;
  }
  validateQuantity(value.quantity, `${path}.quantity`, issues, expectedUnits);
  const measurementUnit =
    isRecord(value.quantity) &&
    nonEmptyString(value.quantity.unit) &&
    UNITS.has(value.quantity.unit as Unit)
      ? (value.quantity.unit as Unit)
      : undefined;
  if (
    !["observed", "derived", "estimated", "modelled"].includes(
      String(value.status),
    )
  ) {
    pushError(
      issues,
      `${path}.status`,
      "measurement.status",
      "Measurement status must describe its evidence basis.",
    );
  }
  if (value.uncertainty !== undefined) {
    if (!isRecord(value.uncertainty)) {
      pushError(
        issues,
        `${path}.uncertainty`,
        "uncertainty.type",
        "Invalid uncertainty.",
      );
    } else if (value.uncertainty.kind === "symmetric") {
      validateQuantity(
        value.uncertainty.plusMinus,
        `${path}.uncertainty.plusMinus`,
        issues,
        measurementUnit ? new Set([measurementUnit]) : expectedUnits,
      );
      if (
        isRecord(value.uncertainty.plusMinus) &&
        typeof value.uncertainty.plusMinus.value === "number" &&
        value.uncertainty.plusMinus.value < 0
      ) {
        pushError(
          issues,
          `${path}.uncertainty.plusMinus.value`,
          "uncertainty.negative",
          "Symmetric uncertainty cannot be negative.",
        );
      }
    } else if (value.uncertainty.kind === "asymmetric") {
      validateQuantity(
        value.uncertainty.lower,
        `${path}.uncertainty.lower`,
        issues,
        measurementUnit ? new Set([measurementUnit]) : expectedUnits,
      );
      validateQuantity(
        value.uncertainty.upper,
        `${path}.uncertainty.upper`,
        issues,
        measurementUnit ? new Set([measurementUnit]) : expectedUnits,
      );
      for (const side of ["lower", "upper"] as const) {
        const uncertainty = value.uncertainty[side];
        if (
          isRecord(uncertainty) &&
          typeof uncertainty.value === "number" &&
          uncertainty.value < 0
        ) {
          pushError(
            issues,
            `${path}.uncertainty.${side}.value`,
            "uncertainty.negative",
            "Asymmetric uncertainty offsets cannot be negative.",
          );
        }
      }
    } else if (value.uncertainty.kind === "interval") {
      validateQuantity(
        value.uncertainty.minimum,
        `${path}.uncertainty.minimum`,
        issues,
        measurementUnit ? new Set([measurementUnit]) : expectedUnits,
      );
      validateQuantity(
        value.uncertainty.maximum,
        `${path}.uncertainty.maximum`,
        issues,
        measurementUnit ? new Set([measurementUnit]) : expectedUnits,
      );
      if (
        isRecord(value.uncertainty.minimum) &&
        isRecord(value.uncertainty.maximum) &&
        typeof value.uncertainty.minimum.value === "number" &&
        typeof value.uncertainty.maximum.value === "number" &&
        value.uncertainty.minimum.value > value.uncertainty.maximum.value
      ) {
        pushError(
          issues,
          `${path}.uncertainty`,
          "uncertainty.interval-order",
          "Uncertainty interval minimum cannot exceed its maximum.",
        );
      }
    } else {
      pushError(
        issues,
        `${path}.uncertainty.kind`,
        "uncertainty.kind",
        "Unknown uncertainty representation.",
      );
    }
    const confidence = isRecord(value.uncertainty)
      ? value.uncertainty.confidence
      : undefined;
    if (
      confidence !== undefined &&
      (typeof confidence !== "string" ||
        ![
          "1-sigma",
          "2-sigma",
          "3-sigma",
          "68-percent",
          "90-percent",
          "95-percent",
        ].includes(confidence))
    ) {
      pushError(
        issues,
        `${path}.uncertainty.confidence`,
        "uncertainty.confidence",
        "Unsupported uncertainty confidence level.",
      );
    }
  }
}

function validateCoordinate(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  if (!isRecord(value)) {
    pushError(issues, path, "coordinate.type", "Expected a coordinate object.");
    return;
  }
  let longitude: unknown;
  let latitude: unknown;
  let longitudePath: string;
  let latitudePath: string;
  if (value.kind === "equatorial") {
    longitude = value.rightAscension;
    latitude = value.declination;
    longitudePath = `${path}.rightAscension`;
    latitudePath = `${path}.declination`;
    if (!["ICRS", "FK5"].includes(String(value.frame))) {
      pushError(
        issues,
        `${path}.frame`,
        "coordinate.frame",
        "Unsupported equatorial frame.",
      );
    }
  } else if (value.kind === "galactic") {
    longitude = value.longitude;
    latitude = value.latitude;
    longitudePath = `${path}.longitude`;
    latitudePath = `${path}.latitude`;
    if (value.frame !== "IAU-1958-J2000-realisation") {
      pushError(
        issues,
        `${path}.frame`,
        "coordinate.frame",
        "Unsupported galactic frame.",
      );
    }
  } else if (value.kind === "ecliptic") {
    longitude = value.longitude;
    latitude = value.latitude;
    longitudePath = `${path}.longitude`;
    latitudePath = `${path}.latitude`;
    if (value.frame !== "mean-ecliptic") {
      pushError(
        issues,
        `${path}.frame`,
        "coordinate.frame",
        "Unsupported ecliptic frame.",
      );
    }
  } else {
    pushError(
      issues,
      `${path}.kind`,
      "coordinate.kind",
      "Coordinate kind must be equatorial, galactic, or ecliptic.",
    );
    return;
  }
  validateQuantity(longitude, longitudePath, issues, new Set<Unit>(["deg"]));
  validateQuantity(latitude, latitudePath, issues, new Set<Unit>(["deg"]));
  if (
    isRecord(longitude) &&
    typeof longitude.value === "number" &&
    (longitude.value < 0 || longitude.value >= 360)
  ) {
    pushError(
      issues,
      `${longitudePath}.value`,
      "coordinate.longitude.range",
      "Longitude/right ascension must be in [0, 360) degrees.",
    );
  }
  if (
    isRecord(latitude) &&
    typeof latitude.value === "number" &&
    (latitude.value < -90 || latitude.value > 90)
  ) {
    pushError(
      issues,
      `${latitudePath}.value`,
      "coordinate.latitude.range",
      "Latitude/declination must be in [-90, +90] degrees.",
    );
  }
  if (
    !["observer", "solar-system-barycentre", "galactic-centre"].includes(
      String(value.origin),
    )
  ) {
    pushError(
      issues,
      `${path}.origin`,
      "coordinate.origin",
      "Coordinate origin must be explicit.",
    );
  }
  if (
    !isRecord(value.epoch) ||
    typeof value.epoch.value !== "number" ||
    !Number.isFinite(value.epoch.value) ||
    value.epoch.scale !== "Julian-year"
  ) {
    pushError(
      issues,
      `${path}.epoch`,
      "coordinate.epoch",
      "Coordinate epoch must be an explicit Julian year.",
    );
  }
}

function validateProvenance(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  if (!isRecord(value)) {
    pushError(issues, path, "provenance.type", "Expected a provenance record.");
    return;
  }
  for (const key of [
    "provider",
    "dataset",
    "datasetVersion",
    "recordIdentifier",
    "accessedAt",
    "sourceUrl",
    "citation",
    "licence",
    "attribution",
  ] as const) {
    if (!nonEmptyString(value[key])) {
      pushError(
        issues,
        `${path}.${key}`,
        "provenance.required",
        `${key} is required for catalogue-backed data.`,
      );
    }
  }
  if (
    !Array.isArray(value.transformations) ||
    value.transformations.length === 0
  ) {
    pushError(
      issues,
      `${path}.transformations`,
      "provenance.transformations",
      "At least one transformation statement is required.",
    );
  } else if (!value.transformations.every(nonEmptyString)) {
    pushError(
      issues,
      `${path}.transformations`,
      "provenance.transformations",
      "Transformation statements must be non-empty strings.",
    );
  }
  if (!Array.isArray(value.knownLimitations)) {
    pushError(
      issues,
      `${path}.knownLimitations`,
      "provenance.limitations",
      "Known limitations must be an array, even when empty.",
    );
  } else if (!value.knownLimitations.every(nonEmptyString)) {
    pushError(
      issues,
      `${path}.knownLimitations`,
      "provenance.limitations",
      "Known limitations must be non-empty strings.",
    );
  }
  if (nonEmptyString(value.sourceUrl) && !/^https:\/\//.test(value.sourceUrl)) {
    pushError(
      issues,
      `${path}.sourceUrl`,
      "provenance.url",
      "Provenance source URL must use HTTPS.",
    );
  }
  if (
    nonEmptyString(value.accessedAt) &&
    !/^\d{4}-\d{2}-\d{2}(?:T.*Z)?$/.test(value.accessedAt)
  ) {
    pushError(
      issues,
      `${path}.accessedAt`,
      "provenance.date",
      "Access date must be an ISO 8601 date or UTC timestamp.",
    );
  }
}

const PROPERTY_UNITS: Readonly<Record<string, ReadonlySet<Unit>>> = {
  distance: new Set(["km", "au", "ly", "pc", "kpc", "Mpc"]),
  parallax: new Set(["mas"]),
  properMotionRightAscension: new Set(["mas/Julian-year"]),
  properMotionDeclination: new Set(["mas/Julian-year"]),
  radialVelocity: new Set(["km/s"]),
  apparentMagnitude: new Set(["mag"]),
  absoluteMagnitude: new Set(["mag"]),
  redshift: new Set(["redshift"]),
  mass: new Set(["kg", "earth-mass", "solar-mass"]),
  radius: new Set(["km", "earth-radius", "solar-radius"]),
  temperature: new Set(["K"]),
  age: new Set(["Julian-year"]),
};

export function validateCatalogueObject(
  value: unknown,
): ValidationResult<CatalogueObject> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [
        {
          path: "$",
          code: "object.type",
          message: "Catalogue object must be a JSON object.",
          severity: "error",
        },
      ],
    };
  }

  if (!nonEmptyString(value.id))
    pushError(issues, "$.id", "object.id", "Object ID is required.");
  if (value.dataOrigin !== "catalogue") {
    pushError(
      issues,
      "$.dataOrigin",
      "object.origin",
      "Catalogue validator refuses objects not explicitly marked catalogue-backed.",
    );
  }
  if (
    !nonEmptyString(value.objectType) ||
    !OBJECT_TYPES.has(value.objectType as ObjectType)
  ) {
    pushError(
      issues,
      "$.objectType",
      "object.type",
      "Unsupported astronomical object type.",
    );
  }
  if (
    !isRecord(value.names) ||
    !nonEmptyString(value.names.primary) ||
    !Array.isArray(value.names.common) ||
    !value.names.common.every(nonEmptyString)
  ) {
    pushError(
      issues,
      "$.names",
      "object.names",
      "A primary name and common-name array are required.",
    );
  }
  if (
    !Array.isArray(value.catalogueIdentifiers) ||
    value.catalogueIdentifiers.length === 0
  ) {
    pushError(
      issues,
      "$.catalogueIdentifiers",
      "object.identifiers",
      "Catalogue-backed objects require at least one identifier.",
    );
  } else {
    const identifiersSeen = new Set<string>();
    let canonicalIdentifiers = 0;
    value.catalogueIdentifiers.forEach((identifier, index) => {
      if (
        !isRecord(identifier) ||
        !nonEmptyString(identifier.catalogue) ||
        !nonEmptyString(identifier.value) ||
        typeof identifier.canonical !== "boolean"
      ) {
        pushError(
          issues,
          `$.catalogueIdentifiers[${index}]`,
          "object.identifier",
          "Invalid catalogue identifier.",
        );
      } else {
        const key = `${identifier.catalogue}\u0000${identifier.value}`;
        if (identifiersSeen.has(key)) {
          pushError(
            issues,
            `$.catalogueIdentifiers[${index}]`,
            "object.identifier-duplicate",
            "Duplicate catalogue identifier.",
          );
        }
        identifiersSeen.add(key);
        if (identifier.canonical) canonicalIdentifiers += 1;
      }
    });
    if (canonicalIdentifiers === 0) {
      pushError(
        issues,
        "$.catalogueIdentifiers",
        "object.identifier-canonical",
        "At least one identifier must be marked canonical.",
      );
    }
  }
  if (value.coordinate !== undefined) {
    validateCoordinate(value.coordinate, "$.coordinate", issues);
  }
  if (value.constellation !== undefined) {
    if (
      !isRecord(value.constellation) ||
      !nonEmptyString(value.constellation.abbreviation) ||
      !/^[A-Za-z0-9]{3}$/.test(value.constellation.abbreviation) ||
      !nonEmptyString(value.constellation.name)
    ) {
      pushError(
        issues,
        "$.constellation",
        "object.constellation",
        "Constellation requires a three-character catalogue abbreviation and full name.",
      );
    }
  }
  if (!isRecord(value.properties)) {
    pushError(
      issues,
      "$.properties",
      "object.properties",
      "Properties must be an object.",
    );
  } else {
    Object.entries(value.properties).forEach(([key, measurement]) => {
      if (key === "spectralType") {
        if (!nonEmptyString(measurement)) {
          pushError(
            issues,
            `$.properties.${key}`,
            "object.spectralType",
            "Spectral type must be non-empty.",
          );
        }
      } else if (!(key in PROPERTY_UNITS)) {
        pushError(
          issues,
          `$.properties.${key}`,
          "object.property",
          `Unsupported scientific property "${key}".`,
        );
      } else {
        validateMeasurement(
          measurement,
          `$.properties.${key}`,
          issues,
          PROPERTY_UNITS[key],
        );
        if (
          (key === "apparentMagnitude" || key === "absoluteMagnitude") &&
          (!isRecord(measurement) || !nonEmptyString(measurement.passband))
        ) {
          pushError(
            issues,
            `$.properties.${key}.passband`,
            "photometry.passband",
            "Photometric measurements require an explicit passband.",
          );
        }
      }
    });
  }
  if (!Array.isArray(value.provenance) || value.provenance.length === 0) {
    pushError(
      issues,
      "$.provenance",
      "object.provenance",
      "Catalogue-backed objects require provenance.",
    );
  } else {
    value.provenance.forEach((item, index) =>
      validateProvenance(item, `$.provenance[${index}]`, issues),
    );
  }

  return issues.some((issue) => issue.severity === "error")
    ? { valid: false, issues }
    : { valid: true, value: value as unknown as CatalogueObject, issues };
}

export function assertValidCatalogueObject(value: unknown): CatalogueObject {
  const result = validateCatalogueObject(value);
  if (!result.valid) {
    throw new TypeError(
      result.issues
        .map((issue) => `${issue.path} [${issue.code}]: ${issue.message}`)
        .join("\n"),
    );
  }
  return result.value;
}
