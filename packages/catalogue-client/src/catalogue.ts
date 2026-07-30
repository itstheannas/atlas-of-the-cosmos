import type { CatalogueObject } from "../../shared-types/src/index.ts";
import {
  validateCatalogueObject,
  type ValidationIssue,
} from "../../astronomy-core/src/validation.ts";

export interface CatalogueDataset {
  readonly schemaVersion: "1.0.0";
  readonly datasetId: string;
  readonly datasetVersion: string;
  readonly generatedAt: string;
  readonly pipelineVersion: string;
  readonly completeness: string;
  readonly dataOrigin: "catalogue";
  readonly objects: readonly CatalogueObject[];
}

export type CatalogueDatasetParseResult =
  | {
      readonly valid: true;
      readonly value: CatalogueDataset;
      readonly issues: readonly ValidationIssue[];
    }
  | {
      readonly valid: false;
      readonly issues: readonly ValidationIssue[];
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function issue(path: string, code: string, message: string): ValidationIssue {
  return { path, code, message, severity: "error" };
}

export function parseCatalogueDataset(
  value: unknown,
): CatalogueDatasetParseResult {
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [
        issue("$", "dataset.type", "Catalogue dataset must be a JSON object."),
      ],
    };
  }
  const issues: ValidationIssue[] = [];
  if (value.schemaVersion !== "1.0.0") {
    issues.push(
      issue(
        "$.schemaVersion",
        "dataset.schema-version",
        "Unsupported catalogue dataset schema; expected 1.0.0.",
      ),
    );
  }
  for (const key of [
    "datasetId",
    "datasetVersion",
    "generatedAt",
    "pipelineVersion",
    "completeness",
  ] as const) {
    if (typeof value[key] !== "string" || value[key].trim().length === 0) {
      issues.push(
        issue(
          `$.${key}`,
          "dataset.required",
          `${key} must be a non-empty string.`,
        ),
      );
    }
  }
  if (value.dataOrigin !== "catalogue") {
    issues.push(
      issue(
        "$.dataOrigin",
        "dataset.origin",
        "Catalogue datasets must be explicitly labelled catalogue-backed.",
      ),
    );
  }
  if (!Array.isArray(value.objects)) {
    issues.push(
      issue("$.objects", "dataset.objects", "objects must be an array."),
    );
  } else {
    const ids = new Set<string>();
    value.objects.forEach((object, index) => {
      const validation = validateCatalogueObject(object);
      if (!validation.valid) {
        issues.push(
          ...validation.issues.map((item) => ({
            ...item,
            path: `$.objects[${index}]${item.path === "$" ? "" : item.path.slice(1)}`,
          })),
        );
        return;
      }
      if (ids.has(validation.value.id)) {
        issues.push(
          issue(
            `$.objects[${index}].id`,
            "dataset.duplicate-id",
            `Duplicate object ID "${validation.value.id}".`,
          ),
        );
      }
      ids.add(validation.value.id);
    });
  }

  return issues.length > 0
    ? { valid: false, issues }
    : {
        valid: true,
        value: value as unknown as CatalogueDataset,
        issues,
      };
}

export function assertCatalogueDataset(value: unknown): CatalogueDataset {
  const result = parseCatalogueDataset(value);
  if (!result.valid) {
    throw new TypeError(
      result.issues
        .map((item) => `${item.path} [${item.code}]: ${item.message}`)
        .join("\n"),
    );
  }
  return result.value;
}
