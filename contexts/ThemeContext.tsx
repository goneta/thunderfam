import { createContext, useEffect } from "react";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: "light" | "dark";
};

export const ThemeContext = createContext({ theme: "light" });

export function ThemeProvider({ children, defaultTheme = "light" }: ThemeProviderProps) {
  useEffect(() => {
    document.documentElement.classList.toggle("dark", defaultTheme === "dark");
  }, [defaultTheme]);

  return <ThemeContext.Provider value={{ theme: defaultTheme }}>{children}</ThemeContext.Provider>;
}
