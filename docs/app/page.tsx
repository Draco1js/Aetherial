import { Metadata } from 'next'
import { getMarkdownContent } from '@/lib/markdown'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'Getting Started | Aetherial Documentation',
  description: 'Learn how to get started with Aetherial, a powerful Discord bot library',
}

export default async function GettingStarted() {
  const content = await getMarkdownContent('getting-started.md')

  return (
    <main className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Aetherial</h1>
        <div className="flex justify-center space-x-2 mb-4">
          <Badge variant="secondary">
            <a href="https://npmjs.com/package/aetherial" target="_blank" rel="noopener noreferrer">
              npm version
            </a>
          </Badge>
          <Badge variant="secondary">
            <a href="https://www.npmjs.com/package/aetherial" target="_blank" rel="noopener noreferrer">
              npm downloads
            </a>
          </Badge>
          <Badge variant="secondary">
            <a href="https://www.npmjs.com/package/aetherial" target="_blank" rel="noopener noreferrer">
              npm unpacked size
            </a>
          </Badge>
          <Badge variant="secondary">
            <a href="https://github.com/pyxelcodes/aetherial/actions" target="_blank" rel="noopener noreferrer">
              Tests status
            </a>
          </Badge>
          <Badge variant="secondary">
            <a href="https://codecov.io/gh/PyxelCodes/Aetherial" target="_blank" rel="noopener noreferrer">
              Code coverage
            </a>
          </Badge>
        </div>
      </div>
      {content && (
        <div 
          dangerouslySetInnerHTML={{ __html: content.contentHtml }}
          className="markdown-content"
        />
      )}
    </main>
  )
}
