import { notFound } from 'next/navigation'
import { getMarkdownContent, getAllMarkdownFiles } from '@/lib/markdown'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { Wrench, Box } from 'lucide-react'

export async function generateStaticParams() {
  const files = getAllMarkdownFiles()
  return files.map(file => ({
    slug: file.path.replace('.md', '').split('/')
  }))
}

function formatClassName(name: string) {
  return name.replace(/([A-Z])/g, ' $1').trim()
}

export default async function DocPage({
  params,
}: {
  params: { slug: string[] }
}) {
  const filePath = `${params.slug.join('/')}.md`
  const allClasses = getAllMarkdownFiles().map(file => file.title)
  const content = await getMarkdownContent(filePath, allClasses)

  if (!content) {
    notFound()
  }

  const className = params.slug[params.slug.length - 1]

  return (
    <div className="doc-content">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="class-indicator">C</span>
          <h1 className="text-3xl font-bold">
            {formatClassName(className)}
          </h1>
        </div>
        <div className="text-sm text-muted-foreground font-mono">
          extends Base
        </div>
      </div>

      <div className="space-y-8">
        <div className="prose prose-invert max-w-none">
          <div 
            dangerouslySetInnerHTML={{ __html: content.contentHtml }}
            className="markdown-content"
          />
        </div>

        <CollapsibleSection 
          title="Properties" 
          icon={<Box className="h-5 w-5" />}
          className="border-t border-secondary pt-6"
        >
          <div className="grid gap-4">
            {/* Properties would be dynamically generated here */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="property-name">client</span>
                <span className="type-signature">Client</span>
              </div>
              <p className="text-muted-foreground">
                The client that instantiated this
              </p>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection 
          title="Methods" 
          icon={<Wrench className="h-5 w-5" />}
          className="border-t border-secondary pt-6"
        >
          <div className="grid gap-6">
            {/* Methods would be dynamically generated here */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="method-name">setEnabled()</span>
                <span className="type-signature">Promise&lt;this&gt;</span>
              </div>
              <p className="text-muted-foreground">
                Enables or disables this auto moderation rule
              </p>
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  )
}