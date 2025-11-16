import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Button } from './ui/button';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      aria-label={isDark ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
      className="flex items-center gap-2"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      {isDark ? 'Claro' : 'Escuro'}
    </Button>
  );
};

export default ThemeToggle;