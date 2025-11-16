import React from 'react';
import { motion } from 'framer-motion';

function PageHeader({ title, subtitle, icon: Icon, actions, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`rounded-lg p-4 sm:p-5 mb-4 sm:mb-5 bg-gradient-to-r from-emerald-400 to-cyan-500 dark:from-emerald-500 dark:to-cyan-600 text-white shadow-md ${className}`}
    >
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          {Icon && (
            <div className="shrink-0 p-2 rounded-lg bg-white/20 backdrop-blur">
              <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold leading-tight">{title}</h1>
            {subtitle && (
              <p className="text-xs sm:text-sm mt-1 text-white/90">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2">{actions}</div>
        )}
      </div>
    </motion.div>
  );
}

export default PageHeader;