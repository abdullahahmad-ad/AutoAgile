import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { jiraInstance, issueKey } = await request.json()

    if (!jiraInstance || !issueKey) {
      return NextResponse.json(
        { error: 'Missing required parameters: jiraInstance and issueKey' },
        { status: 400 }
      )
    }

    const { url, email, apiToken } = jiraInstance
    
    if (!url || !email || !apiToken) {
      return NextResponse.json(
        { error: 'Missing Jira connection details' },
        { status: 400 }
      )
    }

    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64')

    // Fetch the specific issue with all fields including description
    const issueUrl = `${url}/rest/api/3/issue/${issueKey}?fields=summary,description,issuetype,status,project,fixVersions,labels,assignee,reporter,created,updated`
    
    console.log(`Fetching work item details for: ${issueKey}`)
    console.log(`Issue URL: ${issueUrl}`)

    const response = await fetch(issueUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Jira API error for work item details:', {
        issueKey,
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url: issueUrl
      })
      
      // Provide more specific error messages
      if (response.status === 404) {
        return NextResponse.json(
          { error: `Work item ${issueKey} not found or you don't have permission to access it` },
          { status: 404 }
        )
      } else if (response.status === 401) {
        return NextResponse.json(
          { error: 'Authentication failed. Please check your Jira credentials.' },
          { status: 401 }
        )
      } else if (response.status === 403) {
        return NextResponse.json(
          { error: `Access denied to work item ${issueKey}. Please check your permissions.` },
          { status: 403 }
        )
      }
      
      return NextResponse.json(
        { error: `Jira API error: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }

    const issue = await response.json()
    console.log(`Successfully fetched work item: ${issueKey}`)

    // Transform the response to match our JiraWorkItem interface
    const workItem = {
      id: issue.id,
      key: issue.key,
      summary: issue.fields.summary || '',
      description: issue.fields.description || '', // This will be the full ADF object
      issueType: issue.fields.issuetype?.name || '',
      status: issue.fields.status?.name || '',
      project: issue.fields.project?.key || '',
      fixVersions: issue.fields.fixVersions?.map((v: any) => v.name) || [],
      labels: issue.fields.labels || [],
      assignee: issue.fields.assignee?.displayName || null,
      reporter: issue.fields.reporter?.displayName || null,
      created: issue.fields.created || null,
      updated: issue.fields.updated || null
    }

    return NextResponse.json({ workItem })

  } catch (error) {
    console.error('Error fetching work item details:', error)
    return NextResponse.json(
      { error: 'Internal server error while fetching work item details' },
      { status: 500 }
    )
  }
} 