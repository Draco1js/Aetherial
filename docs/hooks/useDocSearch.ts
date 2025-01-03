'use client'

import { create } from 'zustand'

interface DocSearchState {
  searchQuery: string
  setSearchQuery: (query: string) => void
}

export const useDocSearch = create<DocSearchState>((set) => ({
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
}))

