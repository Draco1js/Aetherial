'use client'

import * as React from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CollapsibleSectionProps {
  title: string
  icon?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
}

export function CollapsibleSection({
  title,
  icon,
  defaultOpen = true,
  children,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <div className={className}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left section-title hover:text-primary/90 transition-colors"
      >
        <ChevronRight
          className={cn(
            'h-5 w-5 transition-transform',
            isOpen && 'transform rotate-90'
          )}
        />
        {icon}
        {title}
      </button>
      {isOpen && <div className="mt-4">{children}</div>}
    </div>
  )
}

