import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = ({ className = '' }) => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <motion.button
      onClick={toggleTheme}
      className={`
        relative inline-flex items-center justify-center
        w-10 h-5 rounded-full transition-colors duration-300 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-offset-2
        ${isDarkMode 
          ? 'bg-dark-primary focus:ring-dark-primary' 
          : 'bg-light-primary focus:ring-light-primary'
        }
        ${className}
      `}
      whileTap={{ scale: 0.95 }}
      aria-label={isDarkMode ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
    >
      <motion.div
        className={`
          absolute w-4 h-4 rounded-full flex items-center justify-center
          ${isDarkMode ? 'bg-dark-bg' : 'bg-light-bg'}
          shadow-md
        `}
        animate={{
          x: isDarkMode ? 20 : 2,
        }}
        transition={{
          type: "spring",
          stiffness: 700,
          damping: 30
        }}
      >
        {isDarkMode ? (
          <Moon className="w-2.5 h-2.5 text-dark-primary" />
        ) : (
          <Sun className="w-2.5 h-2.5 text-light-primary" />
        )}
      </motion.div>
    </motion.button>
  );
};

export default ThemeToggle;