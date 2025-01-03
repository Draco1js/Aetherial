import { remark } from 'remark'
import html from 'remark-html'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'
import remarkGfm from 'remark-gfm'

interface MarkdownFile {
  title: string
  path: string
  section: string
}

const mdnPrimitives = [
  'null', 'undefined', 'boolean', 'number', 'string', 'symbol', 'bigint',
  'object', 'function', 'array'
]

function linkifyPrimitives(content: string): string {
  return content.replace(/`(.*?)`/g, (match, p1) => {
    if (mdnPrimitives.includes(p1.toLowerCase())) {
      return `<a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#${p1.toLowerCase()}" target="_blank" rel="noopener noreferrer" class="mdn-link">${match}</a>`
    }
    return match
  })
}

function linkifyInternalClasses(content: string, allClasses: string[]): string {
  return content.replace(/`(.*?)`/g, (match, p1) => {
    if (allClasses.includes(p1)) {
      return `<a href="/docs/${p1.toLowerCase()}" class="internal-link">${match}</a>`
    }
    return match
  })
}

function improveContent(content: string): string {
  // Remove repetitive lists
  content = content.replace(/(\* \[.*?\]$$#.*?$$\n)+/g, (match) => {
    const uniqueItems = [...new Set(match.split('\n'))];
    return uniqueItems.join('\n');
  });

  // Make content more concise
  content = content.replace(/\n\n+/g, '\n\n');

  return content;
}

export async function getMarkdownContent(filePath: string, allClasses: string[]) {
  try {
    const fullPath = join(process.cwd(), 'gen', 'output', filePath)
    let fileContents = readFileSync(fullPath, 'utf8')

    fileContents = improveContent(fileContents)

    const processedContent = await remark()
      .use(remarkGfm)
      .use(html)
      .process(fileContents)
    
    let contentHtml = processedContent.toString()
    contentHtml = linkifyPrimitives(contentHtml)
    contentHtml = linkifyInternalClasses(contentHtml, allClasses)

    return {
      contentHtml,
      filePath
    }
  } catch (error) {
    console.error('Error processing markdown:', error)
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