import type { CSSProperties } from "react";

export function cssVars(
  values: Readonly<Record<`--${string}`, string | number>>,
): CSSProperties {
  return values;
}
