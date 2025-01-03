'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDocSearch } from '@/hooks/useDocSearch'
import { cn } from '@/lib/utils'

interface DocItem {
  title: string
  path: string
  section: string
}

interface AppSidebarProps {
  docs: DocItem[]
}

export function AppSidebar({ docs }: AppSidebarProps) {
  const pathname = usePathname()
  const { searchQuery, setSearchQuery } = useDocSearch()

  // Group docs by section
  const docsBySection = React.useMemo(() => {
    return docs.reduce((acc, doc) => {
      if (!acc[doc.section]) {
        acc[doc.section] = []
      }
      acc[doc.section].push(doc)
      return acc
    }, {} as Record<string, DocItem[]>)
  }, [docs])

  // Filter docs based on search query
  const filteredDocs = React.useMemo(() => {
    if (!searchQuery) return docsBySection

    const filtered: Record<string, DocItem[]> = {}
    Object.entries(docsBySection).forEach(([section, items]) => {
      const matchingItems = items.filter(
        item => 
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          section.toLowerCase().includes(searchQuery.toLowerCase())
      )
      if (matchingItems.length > 0) {
        filtered[section] = matchingItems
      }
    })
    return filtered
  }, [docsBySection, searchQuery])

  return (
    <div className="fixed inset-y-0 left-0 w-64 border-r bg-background">
      <div className="flex flex-col h-full">
        <div className="border-b p-4">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-xl font-semibold text-primary mb-4"
          >
            Aetherial
          </Link>
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="relative">
              <Label htmlFor="search" className="sr-only">
                Search
              </Label>
              <Input
                id="search"
                placeholder="Search..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </form>
        </div>
        <div className="flex-1 overflow-auto py-4">
          {Object.entries(filteredDocs).map(([section, items]) => (
            <div key={section} className="mb-6">
              <h3 className="px-4 mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {section}
              </h3>
              <ul className="space-y-1">
                {items.map((item) => (
                  <li key={item.path}>
                    <Link
                      href={`/docs/${item.path.replace('.md', '')}`}
                      className={cn(
                        'flex items-center gap-2 px-4 py-1.5 text-sm transition-colors',
                        pathname === `/docs/${item.path.replace('.md', '')}` 
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-muted'
                      )}
                    >
                      <span className="class-indicator w-5 h-5">C</span>
                      <span>{item.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}