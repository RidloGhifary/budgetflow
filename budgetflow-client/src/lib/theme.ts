export type ThemeMode = "light" | "dark";

export const themeStorageKey = "budgetflow-theme";

export function getThemeInitScript() {
  return `
    (function() {
      try {
        var storedTheme = window.localStorage.getItem("${themeStorageKey}");
        var theme = storedTheme === "light" || storedTheme === "dark" ? storedTheme : "dark";
        var root = document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(theme);
        root.style.colorScheme = theme;
      } catch (_) {
        document.documentElement.classList.add("dark");
        document.documentElement.style.colorScheme = "dark";
      }
    })();
  `;
}

