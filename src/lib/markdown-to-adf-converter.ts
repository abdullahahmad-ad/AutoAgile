/**
 * Markdown to Atlassian Document Format (ADF) Converter
 * Converts markdown content to ADF format for proper formatting in Jira
 */

export interface ADFNode {
  type: string
  attrs?: Record<string, unknown>
  content?: ADFNode[]
  text?: string
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
}

export interface ADFDocument {
  type: 'doc'
  version: 1
  content: ADFNode[]
}

export class MarkdownToADFConverter {
  
  /**
   * Convert markdown text to ADF format
   */
  convert(markdown: string): ADFDocument {
    const lines = markdown.split('\n')
    const content: ADFNode[] = []
    
    let i = 0
    while (i < lines.length) {
      const line = lines[i]
      const trimmedLine = line.trim()
      
      // Skip empty lines
      if (!trimmedLine) {
        i++
        continue
      }
      
      // Handle headings
      if (trimmedLine.startsWith('#')) {
        const headingNode = this.parseHeading(trimmedLine)
        if (headingNode) {
          content.push(headingNode)
        }
        i++
        continue
      }
      
      // Handle bullet lists
      if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*') || trimmedLine.startsWith('+')) {
        const { listNode, nextIndex } = this.parseList(lines, i, 'bulletList')
        if (listNode) {
          content.push(listNode)
        }
        i = nextIndex
        continue
      }
      
      // Handle numbered lists
      if (/^\d+\./.test(trimmedLine)) {
        const { listNode, nextIndex } = this.parseList(lines, i, 'orderedList')
        if (listNode) {
          content.push(listNode)
        }
        i = nextIndex
        continue
      }
      
      // Handle code blocks
      if (trimmedLine.startsWith('```')) {
        const { codeBlockNode, nextIndex } = this.parseCodeBlock(lines, i)
        if (codeBlockNode) {
          content.push(codeBlockNode)
        }
        i = nextIndex
        continue
      }
      
      // Handle regular paragraphs (with inline formatting)
      const paragraphNode = this.parseParagraph(trimmedLine)
      if (paragraphNode) {
        content.push(paragraphNode)
      }
      i++
    }
    
    return {
      type: 'doc',
      version: 1,
      content
    }
  }
  
  /**
   * Parse heading lines (# ## ### etc.)
   */
  private parseHeading(line: string): ADFNode | null {
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (!match) return null
    
    const level = Math.min(match[1].length, 6)
    const text = match[2].trim()
    
    return {
      type: 'heading',
      attrs: { level },
      content: this.parseInlineText(text)
    }
  }
  
  /**
   * Parse bullet or numbered lists
   */
  private parseList(lines: string[], startIndex: number, listType: 'bulletList' | 'orderedList'): { listNode: ADFNode | null, nextIndex: number } {
    const listItems: ADFNode[] = []
    let i = startIndex
    
    while (i < lines.length) {
      const line = lines[i].trim()
      
      // Check if this line is a list item
      const isBulletItem = listType === 'bulletList' && (line.startsWith('-') || line.startsWith('*') || line.startsWith('+'))
      const isNumberedItem = listType === 'orderedList' && /^\d+\./.test(line)
      
      if (!isBulletItem && !isNumberedItem) {
        // If it's an empty line, continue to next
        if (!line) {
          i++
          continue
        }
        // If it's not a list item and not empty, we're done with the list
        break
      }
      
      // Extract the list item text
      let itemText = ''
      if (isBulletItem) {
        itemText = line.replace(/^[-*+]\s*/, '').trim()
      } else if (isNumberedItem) {
        itemText = line.replace(/^\d+\.\s*/, '').trim()
      }
      
      if (itemText) {
        listItems.push({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: this.parseInlineText(itemText)
          }]
        })
      }
      
      i++
    }
    
    if (listItems.length === 0) {
      return { listNode: null, nextIndex: startIndex + 1 }
    }
    
    return {
      listNode: {
        type: listType,
        content: listItems
      },
      nextIndex: i
    }
  }
  
  /**
   * Parse code blocks (```)
   */
  private parseCodeBlock(lines: string[], startIndex: number): { codeBlockNode: ADFNode | null, nextIndex: number } {
    const startLine = lines[startIndex].trim()
    if (!startLine.startsWith('```')) {
      return { codeBlockNode: null, nextIndex: startIndex + 1 }
    }
    
    // Extract language if specified
    const language = startLine.slice(3).trim() || undefined
    
    const codeLines: string[] = []
    let i = startIndex + 1
    
    // Find the closing ```
    while (i < lines.length) {
      const line = lines[i]
      if (line.trim() === '```') {
        break
      }
      codeLines.push(line)
      i++
    }
    
    const codeText = codeLines.join('\n')
    
    return {
      codeBlockNode: {
        type: 'codeBlock',
        attrs: language ? { language } : undefined,
        content: [{
          type: 'text',
          text: codeText
        }]
      },
      nextIndex: i + 1
    }
  }
  
  /**
   * Parse regular paragraphs with inline formatting
   */
  private parseParagraph(text: string): ADFNode | null {
    if (!text.trim()) return null
    
    return {
      type: 'paragraph',
      content: this.parseInlineText(text)
    }
  }
  
  /**
   * Parse inline text with formatting (bold, italic, code, links)
   */
  private parseInlineText(text: string): ADFNode[] {
    const nodes: ADFNode[] = []
    let currentText = ''
    let i = 0
    
    while (i < text.length) {
      const char = text[i]
      const nextChar = text[i + 1]
      const remaining = text.slice(i)
      
      // Handle bold (**text**)
      if (char === '*' && nextChar === '*') {
        // Add any accumulated text
        if (currentText) {
          nodes.push({ type: 'text', text: currentText })
          currentText = ''
        }
        
        // Find the closing **
        const closeIndex = text.indexOf('**', i + 2)
        if (closeIndex !== -1) {
          const boldText = text.slice(i + 2, closeIndex)
          nodes.push({
            type: 'text',
            text: boldText,
            marks: [{ type: 'strong' }]
          })
          i = closeIndex + 2
          continue
        }
      }
      
      // Handle italic (*text*) - but not if it's part of **
      if (char === '*' && nextChar !== '*' && (i === 0 || text[i - 1] !== '*')) {
        // Add any accumulated text
        if (currentText) {
          nodes.push({ type: 'text', text: currentText })
          currentText = ''
        }
        
        // Find the closing * (but not **)
        let closeIndex = -1
        for (let j = i + 1; j < text.length; j++) {
          if (text[j] === '*' && (j === text.length - 1 || text[j + 1] !== '*')) {
            closeIndex = j
            break
          }
        }
        
        if (closeIndex !== -1) {
          const italicText = text.slice(i + 1, closeIndex)
          nodes.push({
            type: 'text',
            text: italicText,
            marks: [{ type: 'em' }]
          })
          i = closeIndex + 1
          continue
        }
      }
      
      // Handle inline code (`text`)
      if (char === '`') {
        // Add any accumulated text
        if (currentText) {
          nodes.push({ type: 'text', text: currentText })
          currentText = ''
        }
        
        // Find the closing `
        const closeIndex = text.indexOf('`', i + 1)
        if (closeIndex !== -1) {
          const codeText = text.slice(i + 1, closeIndex)
          nodes.push({
            type: 'text',
            text: codeText,
            marks: [{ type: 'code' }]
          })
          i = closeIndex + 1
          continue
        }
      }
      
      // Handle links [text](url)
      if (char === '[') {
        const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/)
        if (linkMatch) {
          // Add any accumulated text
          if (currentText) {
            nodes.push({ type: 'text', text: currentText })
            currentText = ''
          }
          
          const linkText = linkMatch[1]
          const linkUrl = linkMatch[2]
          
          nodes.push({
            type: 'text',
            text: linkText,
            marks: [{
              type: 'link',
              attrs: { href: linkUrl }
            }]
          })
          
          i += linkMatch[0].length
          continue
        }
      }
      
      // Regular character
      currentText += char
      i++
    }
    
    // Add any remaining text
    if (currentText) {
      nodes.push({ type: 'text', text: currentText })
    }
    
    return nodes.length > 0 ? nodes : [{ type: 'text', text: text }]
  }
}

// Export a singleton instance
export const markdownToADFConverter = new MarkdownToADFConverter() 