export function getSafeNextPath(defaultPath = "/dashboard") {
  if (typeof window === "undefined") {
    return defaultPath;
  }

  const nextPath = new URLSearchParams(window.location.search).get("next");

  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return defaultPath;
  }

  return nextPath;
}
