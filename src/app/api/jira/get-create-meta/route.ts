import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { jiraConnection, issueTypeId } = await request.json()

    if (!jiraConnection?.url || !jiraConnection?.email || !jiraConnection?.apiToken) {
      return NextResponse.json(
        { error: 'Missing Jira connection details' },
        { status: 400 }
      )
    }

    if (!issueTypeId) {
      return NextResponse.json(
        { error: 'Missing issue type ID' },
        { status: 400 }
      )
    }

    const auth = Buffer.from(`${jiraConnection.email}:${jiraConnection.apiToken}`).toString('base64')
    
    // Get project key from the first project (we'll need to enhance this later)
    const projectsResponse = await fetch(`${jiraConnection.url}/rest/api/3/project`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      },
    })

    if (!projectsResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to get projects' },
        { status: projectsResponse.status }
      )
    }

    const projects = await projectsResponse.json()
    const projectKey = projects[0]?.key

    if (!projectKey) {
      return NextResponse.json(
        { error: 'No projects found' },
        { status: 404 }
      )
    }

    // Get create metadata for the specific issue type
    const metaUrl = `${jiraConnection.url}/rest/api/3/issue/createmeta?projectKeys=${projectKey}&issuetypeIds=${issueTypeId}&expand=projects.issuetypes.fields`
    
    const response = await fetch(metaUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Jira API error:', response.status, errorText)
      return NextResponse.json(
        { error: `Jira API error: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }

    const metadata = await response.json()
    
    // Extract fields from the metadata structure
    const project = metadata.projects?.[0]
    const issueType = project?.issuetypes?.[0]
    const fields = issueType?.fields || {}
    
    return NextResponse.json({
      success: true,
      fields,
      projectKey,
      issueTypeName: issueType?.name
    })

  } catch (error) {
    console.error('Error getting create metadata:', error)
    return NextResponse.json(
      { error: 'Failed to get create metadata' },
      { status: 500 }
    )
  }
} 