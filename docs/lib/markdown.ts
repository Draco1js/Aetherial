import { remark } from 'remark'
import html from 'remark-html'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

interface MarkdownFile {
  title: string
  path: string
  section: string
}

export async function getMarkdownContent(filePath: string) {
  try {
    // Read markdown file
    const fullPath = join(process.cwd(), 'gen', 'output', filePath)
    const fileContents = readFileSync(fullPath, 'utf8')

    // Use remark to convert markdown into HTML string
    const processedContent = await remark()
      .use(html)
      .process(fileContents)
    
    const contentHtml = processedContent.toString()

    return {
      contentHtml,
      filePath
    }
  } catch (error) {
    return null
  }
}

export function getAllMarkdownFiles(): MarkdownFile[] {
  const docsDirectory = join(process.cwd(), 'gen', 'output')
  return getMarkdownFilesRecursively(docsDirectory)
}

function getMarkdownFilesRecursively(dir: string): MarkdownFile[] {
  const files: MarkdownFile[] = []

  try {
    readdirSync(dir).forEach(file => {
      const fullPath = join(dir, file)
      const relativePath = relative(join(process.cwd(), 'gen', 'output'), fullPath)
      
      if (statSync(fullPath).isDirectory()) {
        files.push(...getMarkdownFilesRecursively(fullPath))
      } else if (file.endsWith('.md')) {
        const pathParts = relativePath.split('/')
        const section = pathParts.length > 1 ? pathParts[0] : 'root'
        const title = file.replace('.md', '')
        
        files.push({
          title,
          path: relativePath,
          section
        })
      }
    })
  } catch (error) {
    console.error('Error reading docs directory:', error)
  }

  return files
}