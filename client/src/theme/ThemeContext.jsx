import { useCallback, useState } from "react";
import { ThemeContext } from "./themeContextValue.js";

function getInitialTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light" || savedTheme === "dark") return savedTheme;

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }) {
  const [theme, setCurrentTheme] = useState(getInitialTheme);

  const setTheme = useCallback((nextTheme) => {
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    setCurrentTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
