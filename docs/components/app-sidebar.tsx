'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { GalleryVerticalEnd, Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'
import { useDocSearch } from '@/hooks/useDocSearch'

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
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Docs</span>
                  <span className="">v1.0.0</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <form onSubmit={(e) => e.preventDefault()}>
          <SidebarGroup className="py-0">
            <SidebarGroupContent className="relative">
              <Label htmlFor="search" className="sr-only">
                Search
              </Label>
              <Input
                id="search"
                placeholder="Search the docs..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 select-none opacity-50" />
            </SidebarGroupContent>
          </SidebarGroup>
        </form>
      </SidebarHeader>
      <SidebarContent>
        {Object.entries(filteredDocs).map(([section, items]) => (
          <SidebarGroup key={section}>
            <SidebarGroupLabel>{section}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={pathname === `/docs/${item.path.replace('.md', '')}`}
                    >
                      <Link href={`/docs/${item.path.replace('.md', '')}`}>
                        {item.title}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}

