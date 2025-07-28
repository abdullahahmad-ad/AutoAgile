import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { jiraConnection, epicKey } = await request.json()

    if (!jiraConnection?.url || !jiraConnection?.email || !jiraConnection?.apiToken) {
      return NextResponse.json(
        { error: 'Missing Jira connection details' },
        { status: 400 }
      )
    }

    if (!epicKey) {
      return NextResponse.json(
        { error: 'Epic key is required' },
        { status: 400 }
      )
    }

    const auth = Buffer.from(`${jiraConnection.email}:${jiraConnection.apiToken}`).toString('base64')
    
    console.log(`🔍 Fetching linked stories for epic: ${epicKey}`)

    // Search for issues that are linked to this epic
    // This searches for issues where the Epic Link field points to our epic
    const jql = `"Epic Link" = "${epicKey}" OR parent = "${epicKey}"`
    
    const searchUrl = `${jiraConnection.url}/rest/api/3/search`
    const searchParams = new URLSearchParams({
      jql: jql,
      fields: 'summary,assignee,status,issuetype,key',
      maxResults: '100'
    })

    console.log(`🔍 JQL Query: ${jql}`)
    
    const response = await fetch(`${searchUrl}?${searchParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Failed to fetch linked stories:', response.status, errorText)
      return NextResponse.json(
        { error: `Failed to fetch linked stories: ${response.status}` },
        { status: response.status }
      )
    }

    const searchResults = await response.json()
    console.log(`📊 Found ${searchResults.total} linked issues`)

    // Extract relevant information from linked stories
    const linkedStories = searchResults.issues.map((issue: any) => ({
      key: issue.key,
      summary: issue.fields.summary,
      assignee: issue.fields.assignee?.displayName || issue.fields.assignee?.name || null,
      status: issue.fields.status?.name || 'Unknown',
      issueType: issue.fields.issuetype?.name || 'Unknown'
    }))

    console.log('✅ Processed linked stories:', linkedStories)

    return NextResponse.json({
      success: true,
      epicKey,
      linkedStories,
      totalCount: searchResults.total
    })

  } catch (error) {
    console.error('❌ Error fetching linked stories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch linked stories' },
      { status: 500 }
    )
  }
} 