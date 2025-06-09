import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { jiraConnection } = await request.json()

    if (!jiraConnection?.url || !jiraConnection?.email || !jiraConnection?.apiToken) {
      return NextResponse.json(
        { error: 'Missing Jira connection details' },
        { status: 400 }
      )
    }

    const auth = Buffer.from(`${jiraConnection.email}:${jiraConnection.apiToken}`).toString('base64')
    
    const response = await fetch(`${jiraConnection.url}/rest/api/3/issuetype`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
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

    const issueTypes = await response.json()
    
    return NextResponse.json({
      success: true,
      issueTypes: issueTypes || []
    })

  } catch (error) {
    console.error('Error getting issue types:', error)
    return NextResponse.json(
      { error: 'Failed to get issue types' },
      { status: 500 }
    )
  }
} 