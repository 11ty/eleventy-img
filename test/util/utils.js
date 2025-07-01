export function normalizeEscapedPaths(p) {
  return p.replaceAll("%5C", "%2F");
}
