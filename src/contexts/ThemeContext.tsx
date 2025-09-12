import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  actualTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: Theme;
  onThemeChange?: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  initialTheme, 
  onThemeChange 
}) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Initialize theme only once to prevent re-renders
    if (initialTheme && ['light', 'dark', 'auto'].includes(initialTheme)) {
      return initialTheme;
    }
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
      return savedTheme;
    }
    return 'light';
  });
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

  // Check system preference
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  // Update actual theme based on theme setting
  useEffect(() => {
    let newActualTheme: 'light' | 'dark';
    
    if (theme === 'auto') {
      newActualTheme = getSystemTheme();
    } else {
      newActualTheme = theme;
    }
    
    setActualTheme(newActualTheme);
    
    // Apply theme to document
    const root = document.documentElement;
    if (newActualTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        const newSystemTheme = getSystemTheme();
        setActualTheme(newSystemTheme);
        
        const root = document.documentElement;
        if (newSystemTheme === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Call the callback to persist to Supabase if provided
    if (onThemeChange) {
      onThemeChange(newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, actualTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};