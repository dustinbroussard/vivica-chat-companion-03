
import {
  useState,
  useEffect,
  createContext,
  useContext,
} from 'react';

export type ThemeVariant = 'dark' | 'light';
export type ThemeColor = 'default' | 'blue' | 'red' | 'green' | 'purple';

interface ThemeContextValue {
  color: ThemeColor;
  variant: ThemeVariant;
  setColor: (color: ThemeColor) => void;
  setVariant: (variant: ThemeVariant) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [color, setColor] = useState<ThemeColor>('default');
  const [variant, setVariant] = useState<ThemeVariant>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('vivica-theme');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { color: ThemeColor; variant: ThemeVariant };
        setColor(parsed.color);
        setVariant(parsed.variant);
      } catch {
        // ignore invalid values
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', `${color}-${variant}`);
    localStorage.setItem('vivica-theme', JSON.stringify({ color, variant }));
  }, [color, variant]);

  return (
    <ThemeContext.Provider value={{ color, variant, setColor, setVariant }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
