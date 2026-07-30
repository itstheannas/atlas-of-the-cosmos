import path from "node:path";

/**
 * True only when candidate resolves to a strict descendant of parent.
 * `pathApi` is injectable so both POSIX and Windows semantics are testable on
 * every CI host.
 */
export function isStrictChildPath(parent, candidate, pathApi = path) {
  const resolvedParent = pathApi.resolve(parent);
  const resolvedCandidate = pathApi.resolve(candidate);
  const relativePath = pathApi.relative(resolvedParent, resolvedCandidate);
  return (
    relativePath.length > 0 &&
    relativePath !== ".." &&
    !relativePath.startsWith(`..${pathApi.sep}`) &&
    !pathApi.isAbsolute(relativePath)
  );
}
