import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from './ui/button';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = ({ variant = "ghost", size = "sm", showText = false }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className="transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {isDark ? (
        <>
          <Sun className="h-4 w-4" />
          {showText && <span className="ml-2">Claro</span>}
        </>
      ) : (
        <>
          <Moon className="h-4 w-4" />
          {showText && <span className="ml-2">Oscuro</span>}
        </>
      )}
    </Button>
  );
};

export default ThemeToggle;