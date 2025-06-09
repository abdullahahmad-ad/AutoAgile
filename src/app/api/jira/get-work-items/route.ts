import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { jiraInstance, projectKey, workItemType = 'epic', deliveryQuarter } = await request.json()

    if (!jiraInstance?.url || !jiraInstance?.email || !jiraInstance?.apiToken) {
      return NextResponse.json(
        { error: 'Missing Jira connection details' },
        { status: 400 }
      )
    }

    if (!projectKey) {
      return NextResponse.json(
        { error: 'Project key is required' },
        { status: 400 }
      )
    }

    const auth = btoa(`${jiraInstance.email}:${jiraInstance.apiToken}`)
    
    let jql = `project = "${projectKey}"`
    
    // Add issue type filter - be more flexible with case and naming
    if (workItemType && workItemType !== 'all') {
      jql += ` AND issuetype = "${workItemType}"`
    }
    
    if (deliveryQuarter) {
      // Use the exact fix version name as provided from the dropdown
      jql += ` AND fixVersion = "${deliveryQuarter}"`
    }
    
    // Order by created date descending to get most recent items first
    jql += ' ORDER BY created DESC'

    console.log('Search parameters:', { projectKey, workItemType, deliveryQuarter })
    console.log('JQL Query:', jql)
    
    // Standard fields to include in the response
    const fields = 'summary,description,issuetype,status,project,fixVersions,labels'
    
    const searchUrl = `${jiraInstance.url}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=${fields}&maxResults=50`
    console.log('Search URL:', searchUrl)

    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Jira API error details:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText,
        jql: jql,
        url: searchUrl
      })
      throw new Error(`Jira API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    console.log('Work items search response:', {
      total: data.total,
      issueCount: data.issues?.length || 0,
      issues: data.issues?.slice(0, 3).map((issue: any) => ({
        key: issue.key,
        summary: issue.fields?.summary,
        issueType: issue.fields?.issuetype?.name,
        descriptionType: typeof issue.fields?.description,
        descriptionSample: issue.fields?.description
      }))
    })

    const workItems = data.issues.map((issue: { id: string; key: string; fields: any }) => {
      // Handle different description formats from Jira
      let description = ''
      if (issue.fields.description) {
        if (typeof issue.fields.description === 'string') {
          description = issue.fields.description
        } else if (issue.fields.description.content) {
          // Atlassian Document Format - extract text content
          description = extractTextFromADF(issue.fields.description)
        } else if (issue.fields.description.toString) {
          description = issue.fields.description.toString()
        }
      }

      // Extract delivery quarter value if available
      let deliveryQuarter = ''
      if (issue.fields.fixVersions && issue.fields.fixVersions.length > 0) {
        deliveryQuarter = issue.fields.fixVersions[0].name
      }

      return {
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        description: description,
        issueType: issue.fields.issuetype.name,
        status: issue.fields.status.name,
        project: issue.fields.project.key,
        fixVersions: issue.fields.fixVersions?.map((v: any) => v.name) || [],
        labels: issue.fields.labels || [],
        deliveryQuarter: deliveryQuarter
      }
    })

    console.log('Processed work items count:', workItems.length)
    return NextResponse.json({ workItems })

  } catch (error) {
    console.error('Failed to fetch work items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch work items from Jira' },
      { status: 500 }
    )
  }
}

// Helper function to extract text from Atlassian Document Format
function extractTextFromADF(adf: any): string {
  if (!adf || !adf.content) return ''
  
  let text = ''
  
  function extractText(node: any): void {
    if (node.type === 'text') {
      text += node.text || ''
    } else if (node.content && Array.isArray(node.content)) {
      node.content.forEach(extractText)
    }
    
    // Add line breaks for paragraphs
    if (node.type === 'paragraph') {
      text += '\n'
    }
  }
  
  adf.content.forEach(extractText)
  return text.trim()
} 