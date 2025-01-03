import './globals.css'
import { Inter } from 'next/font/google'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { getAllMarkdownFiles } from '@/lib/markdown'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'API Documentation',
  description: 'Generated API documentation from markdown files',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const docs = getAllMarkdownFiles()

  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${inter.className} antialiased`}>
        <SidebarProvider>
          <AppSidebar docs={docs} />
          <SidebarTrigger className="ml-3 mt-3" />
          <main className="flex-1 overflow-auto p-8 pt-16">{children}</main>
        </SidebarProvider>
      </body>
    </html>
  )
}