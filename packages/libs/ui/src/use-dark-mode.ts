import { useCallback, useEffect, useState } from "react";

const THEME_STORAGE_KEY = "d12-theme";

type ThemeMode = "light" | "dark";

function getStoredTheme(): ThemeMode | null {
	if (typeof window === "undefined") return null;

	const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
	return storedTheme === "dark" || storedTheme === "light" ? storedTheme : null;
}

function getPreferredTheme(): ThemeMode {
	if (typeof window === "undefined") return "light";

	const storedTheme = getStoredTheme();
 
	if (storedTheme) {
		return storedTheme;
	}

	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: ThemeMode) {
	if (typeof document === "undefined") return;

	document.documentElement.classList.toggle("dark", theme === "dark");
	document.documentElement.style.colorScheme = theme;
}

export function initializeTheme() {
	applyTheme(getPreferredTheme());
}

export function useDarkMode() {
	const [isDark, setIsDark] = useState(false);

	useEffect(() => {
		const theme = getPreferredTheme();
		applyTheme(theme);
		setIsDark(theme === "dark");

		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const handleChange = (event: MediaQueryListEvent) => {
			if (getStoredTheme()) return;

			const nextTheme: ThemeMode = event.matches ? "dark" : "light";
			applyTheme(nextTheme);
			setIsDark(nextTheme === "dark");
		};

		mediaQuery.addEventListener("change", handleChange);

		return () => {
			mediaQuery.removeEventListener("change", handleChange);
		};
	}, []);

	const setTheme = useCallback((theme: ThemeMode) => {
		window.localStorage.setItem(THEME_STORAGE_KEY, theme);
		applyTheme(theme);
		setIsDark(theme === "dark");
	}, []);

	const toggleDark = useCallback(() => {
		setTheme(isDark ? "light" : "dark");
	}, [isDark, setTheme]);

	return { isDark, setTheme, toggleDark };
}