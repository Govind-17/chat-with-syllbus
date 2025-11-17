import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

type Theme = 'light' | 'dark'
type ThemeState = {
	theme: Theme
	toggle: () => void
	setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeState | undefined>(undefined)
const STORAGE_KEY = 'mca_theme'

function applyTheme(t: Theme) {
	if (typeof document === 'undefined') return
	const root = document.documentElement
	if (t === 'dark') root.classList.add('dark')
	else root.classList.remove('dark')
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setThemeState] = useState<Theme>('light')

	useEffect(() => {
		const saved = (localStorage.getItem(STORAGE_KEY) as Theme) || 'light'
		setThemeState(saved)
		applyTheme(saved)
	}, [])

	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, theme)
		applyTheme(theme)
	}, [theme])

	const api: ThemeState = useMemo(
		() => ({
			theme,
			toggle: () => setThemeState((t) => (t === 'light' ? 'dark' : 'light')),
			setTheme: (t) => setThemeState(t),
		}),
		[theme]
	)

	return <ThemeContext.Provider value={api}>{children}</ThemeContext.Provider>
}

export function useTheme() {
	const ctx = useContext(ThemeContext)
	if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
	return ctx
}


