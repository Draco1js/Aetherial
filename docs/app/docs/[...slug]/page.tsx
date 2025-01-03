import { notFound } from 'next/navigation'
import { getMarkdownContent, getAllMarkdownFiles } from '@/lib/markdown'

export async function generateStaticParams() {
  const files = getAllMarkdownFiles()
  return files.map(file => ({
    slug: file.path.replace('.md', '').split('/')
  }))
}

export default async function DocPage({
  params,
}: {
  params: { slug: string[] }
}) {
  const filePath = `${params.slug.join('/')}.md`
  const content = await getMarkdownContent(filePath)

  if (!content) {
    notFound()
  }

  return (
    <div className="prose prose-slate dark:prose-invert max-w-3xl mx-auto">
      <div 
        dangerouslySetInnerHTML={{ __html: content.contentHtml }}
        className="markdown-content"
      />
    </div>
  )
}

