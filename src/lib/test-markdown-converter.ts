/**
 * Test file for the Markdown to ADF Converter
 * This file can be used to test the converter functionality
 */

import { markdownToADFConverter } from './markdown-to-adf-converter'

// Test markdown content with various formatting
const testMarkdown = `### Problem Description

This is a **bold** statement about the problem. We need to address *italic* issues in our system.

### Solution Description

The solution involves:

- First step with **bold** text
- Second step with *italic* text  
- Third step with \`inline code\`

### Technical Details

Here's a numbered list:

1. Configure the system
2. Test the implementation
3. Deploy to production

### Code Example

\`\`\`javascript
function example() {
  console.log("Hello World");
}
\`\`\`

### Links and References

Check out [our documentation](https://example.com) for more details.

### Acceptance Criteria

- [ ] Feature works as expected
- [ ] Tests are passing
- [ ] Documentation is updated`

// Function to test the converter
export function testMarkdownConverter() {
  console.log('Testing Markdown to ADF Converter...')
  
  const result = markdownToADFConverter.convert(testMarkdown)
  
  console.log('Input Markdown:')
  console.log(testMarkdown)
  console.log('\nOutput ADF:')
  console.log(JSON.stringify(result, null, 2))
  
  return result
}

// Export for use in other files
export { testMarkdown } 