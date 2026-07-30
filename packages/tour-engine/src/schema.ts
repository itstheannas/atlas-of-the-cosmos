import type { DistanceUnit, Quantity } from "../../shared-types/src/index.ts";

export type TourTransitionStyle = "fly" | "cut" | "fade";

export interface TourSource {
  readonly id: string;
  readonly title: string;
  readonly provider: string;
  readonly url: string;
  readonly accessedAt: string;
}

export interface TourWaypoint {
  readonly targetObjectId: string;
  readonly cameraDistance?: Quantity<DistanceUnit>;
  readonly orientation?: {
    readonly yaw: Quantity<"deg">;
    readonly pitch: Quantity<"deg">;
    readonly roll: Quantity<"deg">;
  };
  readonly targetLock: boolean;
}

export interface TourChapter {
  readonly id: string;
  readonly title: string;
  readonly caption: string;
  readonly transcript: string;
  readonly sourceIds: readonly string[];
  readonly narration?: {
    readonly script: string;
    readonly audioUrl?: string;
    readonly audioDuration?: Quantity<"s">;
  };
  readonly duration: Quantity<"s">;
  readonly waypoint: TourWaypoint;
  readonly transition: {
    readonly style: TourTransitionStyle;
    readonly duration: Quantity<"s">;
  };
  readonly pauseAtEnd: boolean;
  readonly contentBasis:
    "observed" | "derived" | "estimated" | "modelled" | "illustrative";
  readonly caveat?: string;
}

export interface TourDefinition {
  readonly schemaVersion: "1.0.0";
  readonly id: string;
  readonly version: string;
  readonly language: string;
  readonly title: string;
  readonly summary: string;
  readonly chapters: readonly TourChapter[];
  readonly sources: readonly TourSource[];
}

export interface TourValidationIssue {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

export type TourValidationResult =
  | {
      readonly valid: true;
      readonly value: TourDefinition;
      readonly issues: readonly TourValidationIssue[];
    }
  | {
      readonly valid: false;
      readonly issues: readonly TourValidationIssue[];
    };

const DISTANCE_UNITS: ReadonlySet<DistanceUnit> = new Set([
  "km",
  "au",
  "ly",
  "pc",
  "kpc",
  "Mpc",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isSafeAudioUrl(value: string): boolean {
  if (isHttpsUrl(value)) return true;
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return false;
  }
  return !value.split("/").includes("..");
}

function isSafeReferenceUrl(value: string): boolean {
  return isSafeAudioUrl(value);
}

function addIssue(
  issues: TourValidationIssue[],
  path: string,
  code: string,
  message: string,
): void {
  issues.push({ path, code, message });
}

function validateSlug(
  value: unknown,
  path: string,
  issues: TourValidationIssue[],
): void {
  if (!isNonEmptyString(value) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    addIssue(
      issues,
      path,
      "id.slug",
      "ID must be a lowercase, hyphen-separated stable slug.",
    );
  }
}

function validateSeconds(
  value: unknown,
  path: string,
  issues: TourValidationIssue[],
  allowZero: boolean,
): void {
  if (
    !isRecord(value) ||
    value.unit !== "s" ||
    typeof value.value !== "number" ||
    !Number.isFinite(value.value) ||
    (allowZero ? value.value < 0 : value.value <= 0)
  ) {
    addIssue(
      issues,
      path,
      "quantity.seconds",
      `Expected a finite ${allowZero ? "non-negative" : "positive"} duration in seconds.`,
    );
  }
}

function validateWaypoint(
  value: unknown,
  path: string,
  issues: TourValidationIssue[],
): void {
  if (!isRecord(value)) {
    addIssue(issues, path, "waypoint.type", "Waypoint must be an object.");
    return;
  }
  if (!isNonEmptyString(value.targetObjectId)) {
    addIssue(
      issues,
      `${path}.targetObjectId`,
      "waypoint.target",
      "Waypoint requires a catalogue or declared scene target ID.",
    );
  }
  if (typeof value.targetLock !== "boolean") {
    addIssue(
      issues,
      `${path}.targetLock`,
      "waypoint.lock",
      "targetLock must be explicit.",
    );
  }
  if (value.cameraDistance !== undefined) {
    if (
      !isRecord(value.cameraDistance) ||
      typeof value.cameraDistance.value !== "number" ||
      !Number.isFinite(value.cameraDistance.value) ||
      value.cameraDistance.value < 0 ||
      !DISTANCE_UNITS.has(value.cameraDistance.unit as DistanceUnit)
    ) {
      addIssue(
        issues,
        `${path}.cameraDistance`,
        "waypoint.distance",
        "Camera distance must be finite, non-negative, and use an explicit distance unit.",
      );
    }
  }
  if (value.orientation !== undefined) {
    if (!isRecord(value.orientation)) {
      addIssue(
        issues,
        `${path}.orientation`,
        "waypoint.orientation",
        "Orientation must be an object.",
      );
    } else {
      for (const axis of ["yaw", "pitch", "roll"] as const) {
        const angle = value.orientation[axis];
        if (
          !isRecord(angle) ||
          angle.unit !== "deg" ||
          typeof angle.value !== "number" ||
          !Number.isFinite(angle.value)
        ) {
          addIssue(
            issues,
            `${path}.orientation.${axis}`,
            "waypoint.angle",
            `${axis} must be a finite angle in degrees.`,
          );
        }
      }
      const pitch = value.orientation.pitch;
      if (
        isRecord(pitch) &&
        typeof pitch.value === "number" &&
        (pitch.value < -90 || pitch.value > 90)
      ) {
        addIssue(
          issues,
          `${path}.orientation.pitch.value`,
          "waypoint.pitch.range",
          "Pitch must be between -90 and +90 degrees.",
        );
      }
    }
  }
}

function validateChapter(
  value: unknown,
  path: string,
  issues: TourValidationIssue[],
): string | undefined {
  if (!isRecord(value)) {
    addIssue(issues, path, "chapter.type", "Chapter must be an object.");
    return undefined;
  }
  validateSlug(value.id, `${path}.id`, issues);
  for (const key of ["title", "caption", "transcript"] as const) {
    if (!isNonEmptyString(value[key])) {
      addIssue(
        issues,
        `${path}.${key}`,
        "chapter.copy",
        `${key} must be non-empty so the tour has an accessible text alternative.`,
      );
    }
  }
  if (!Array.isArray(value.sourceIds) || value.sourceIds.length === 0) {
    addIssue(
      issues,
      `${path}.sourceIds`,
      "chapter.sources",
      "Every chapter requires at least one declared scientific source ID.",
    );
  } else {
    const sourceIds = new Set<string>();
    value.sourceIds.forEach((sourceId, index) => {
      validateSlug(sourceId, `${path}.sourceIds[${index}]`, issues);
      if (typeof sourceId === "string" && sourceIds.has(sourceId)) {
        addIssue(
          issues,
          `${path}.sourceIds[${index}]`,
          "chapter.source-duplicate",
          `Duplicate chapter source ID "${sourceId}".`,
        );
      }
      if (typeof sourceId === "string") sourceIds.add(sourceId);
    });
  }
  validateSeconds(value.duration, `${path}.duration`, issues, false);
  validateWaypoint(value.waypoint, `${path}.waypoint`, issues);
  if (!isRecord(value.transition)) {
    addIssue(
      issues,
      `${path}.transition`,
      "transition.type",
      "Transition must be an object.",
    );
  } else {
    if (!["fly", "cut", "fade"].includes(String(value.transition.style))) {
      addIssue(
        issues,
        `${path}.transition.style`,
        "transition.style",
        "Transition style must be fly, cut, or fade.",
      );
    }
    validateSeconds(
      value.transition.duration,
      `${path}.transition.duration`,
      issues,
      true,
    );
  }
  if (typeof value.pauseAtEnd !== "boolean") {
    addIssue(
      issues,
      `${path}.pauseAtEnd`,
      "chapter.pause",
      "pauseAtEnd must be explicit.",
    );
  }
  if (
    !["observed", "derived", "estimated", "modelled", "illustrative"].includes(
      String(value.contentBasis),
    )
  ) {
    addIssue(
      issues,
      `${path}.contentBasis`,
      "chapter.evidence",
      "Chapter must distinguish its scientific evidence basis.",
    );
  }
  if (
    ["estimated", "modelled", "illustrative"].includes(
      String(value.contentBasis),
    ) &&
    !isNonEmptyString(value.caveat)
  ) {
    addIssue(
      issues,
      `${path}.caveat`,
      "chapter.caveat",
      "Estimated, modelled, and illustrative content requires a caveat.",
    );
  }
  if (value.narration !== undefined) {
    if (
      !isRecord(value.narration) ||
      !isNonEmptyString(value.narration.script)
    ) {
      addIssue(
        issues,
        `${path}.narration`,
        "narration.script",
        "Narration requires a non-empty script.",
      );
    } else {
      if (
        value.narration.audioUrl !== undefined &&
        (!isNonEmptyString(value.narration.audioUrl) ||
          !isSafeAudioUrl(value.narration.audioUrl))
      ) {
        addIssue(
          issues,
          `${path}.narration.audioUrl`,
          "narration.url",
          "Narration audio URL must use HTTPS or a safe root-relative path.",
        );
      }
      if (value.narration.audioDuration !== undefined) {
        validateSeconds(
          value.narration.audioDuration,
          `${path}.narration.audioDuration`,
          issues,
          false,
        );
      }
    }
  }
  return isNonEmptyString(value.id) ? value.id : undefined;
}

export function validateTourDefinition(value: unknown): TourValidationResult {
  const issues: TourValidationIssue[] = [];
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [
        {
          path: "$",
          code: "tour.type",
          message: "Tour must be a JSON object.",
        },
      ],
    };
  }
  if (value.schemaVersion !== "1.0.0") {
    addIssue(
      issues,
      "$.schemaVersion",
      "tour.schema-version",
      "Unsupported tour schema version; expected 1.0.0.",
    );
  }
  validateSlug(value.id, "$.id", issues);
  for (const key of ["version", "language", "title", "summary"] as const) {
    if (!isNonEmptyString(value[key])) {
      addIssue(issues, `$.${key}`, "tour.required", `${key} is required.`);
    }
  }

  if (!Array.isArray(value.chapters) || value.chapters.length === 0) {
    addIssue(
      issues,
      "$.chapters",
      "tour.chapters",
      "Tour requires at least one chapter.",
    );
  } else {
    if (value.chapters.length > 100) {
      addIssue(
        issues,
        "$.chapters",
        "tour.chapter-limit",
        "Tour cannot contain more than 100 chapters.",
      );
    }
    const chapterIds = new Set<string>();
    value.chapters.forEach((chapter, index) => {
      const id = validateChapter(chapter, `$.chapters[${index}]`, issues);
      if (id && chapterIds.has(id)) {
        addIssue(
          issues,
          `$.chapters[${index}].id`,
          "chapter.duplicate",
          `Duplicate chapter ID "${id}".`,
        );
      }
      if (id) chapterIds.add(id);
    });
  }

  if (!Array.isArray(value.sources) || value.sources.length === 0) {
    addIssue(
      issues,
      "$.sources",
      "tour.sources",
      "Scientific tours require at least one source.",
    );
  } else {
    if (value.sources.length > 100) {
      addIssue(
        issues,
        "$.sources",
        "tour.source-limit",
        "Tour cannot contain more than 100 sources.",
      );
    }
    const sourceIds = new Set<string>();
    let externalSourceCount = 0;
    value.sources.forEach((source, index) => {
      if (!isRecord(source)) {
        addIssue(
          issues,
          `$.sources[${index}]`,
          "source.type",
          "Source must be an object.",
        );
        return;
      }
      validateSlug(source.id, `$.sources[${index}].id`, issues);
      if (typeof source.id === "string" && sourceIds.has(source.id)) {
        addIssue(
          issues,
          `$.sources[${index}].id`,
          "source.duplicate",
          `Duplicate source ID "${source.id}".`,
        );
      }
      if (typeof source.id === "string") sourceIds.add(source.id);
      for (const key of ["title", "provider", "accessedAt"] as const) {
        if (!isNonEmptyString(source[key])) {
          addIssue(
            issues,
            `$.sources[${index}].${key}`,
            "source.required",
            `${key} is required.`,
          );
        }
      }
      if (!isNonEmptyString(source.url) || !isSafeReferenceUrl(source.url)) {
        addIssue(
          issues,
          `$.sources[${index}].url`,
          "source.url",
          "Source URL must use HTTPS or a safe root-relative methodology path.",
        );
      } else if (isHttpsUrl(source.url)) {
        externalSourceCount += 1;
      }
      if (
        isNonEmptyString(source.accessedAt) &&
        !/^\d{4}-\d{2}-\d{2}$/.test(source.accessedAt)
      ) {
        addIssue(
          issues,
          `$.sources[${index}].accessedAt`,
          "source.date",
          "Source access date must use YYYY-MM-DD.",
        );
      }
    });
    if (externalSourceCount === 0) {
      addIssue(
        issues,
        "$.sources",
        "tour.external-source",
        "A scientific tour requires at least one authoritative HTTPS source.",
      );
    }

    if (Array.isArray(value.chapters)) {
      value.chapters.forEach((chapter, chapterIndex) => {
        if (!isRecord(chapter) || !Array.isArray(chapter.sourceIds)) return;
        chapter.sourceIds.forEach((sourceId, sourceIndex) => {
          if (typeof sourceId === "string" && !sourceIds.has(sourceId)) {
            addIssue(
              issues,
              `$.chapters[${chapterIndex}].sourceIds[${sourceIndex}]`,
              "chapter.source-unknown",
              `Chapter source ID "${sourceId}" is not declared by the tour.`,
            );
          }
        });
      });
    }
  }

  return issues.length > 0
    ? { valid: false, issues }
    : {
        valid: true,
        value: value as unknown as TourDefinition,
        issues,
      };
}

export function assertValidTourDefinition(value: unknown): TourDefinition {
  const result = validateTourDefinition(value);
  if (!result.valid) {
    throw new TypeError(
      result.issues
        .map((issue) => `${issue.path} [${issue.code}]: ${issue.message}`)
        .join("\n"),
    );
  }
  return result.value;
}
