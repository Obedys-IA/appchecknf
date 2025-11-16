import React from 'react'
import { cn } from '../lib/utils'
import { Card, CardContent } from './ui/card'
import { useTheme } from '../context/ThemeContext'

const PageHeader = ({
  title,
  subtitle,
  icon,
  className
}) => {
  const { theme } = useTheme()

  const isDark = theme === 'dark'
  const containerClasses = cn(
    'rounded-xl border shadow-sm',
    isDark ? 'bg-card text-card-foreground border-[color:var(--border-color)]' : 'bg-card text-card-foreground',
    className
  )

  const titleClasses = cn(
    'text-3xl md:text-4xl font-bold tracking-tight',
    isDark
      ? 'bg-gradient-to-r from-gray-200 to-white bg-clip-text text-transparent'
      : 'bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent'
  )

  const subtitleClasses = cn(
    'text-sm md:text-base mt-2',
    isDark ? 'text-gray-300' : 'text-gray-600'
  )

  return (
    <Card className={containerClasses}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {icon && (
            <div className={cn('p-3 rounded-lg', isDark ? 'bg-gray-800' : 'bg-green-50')}>
              {icon}
            </div>
          )}
          <div className="flex-1">
            <h1 className={titleClasses}>{title}</h1>
            {subtitle && (
              <p className={subtitleClasses}>{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default PageHeader