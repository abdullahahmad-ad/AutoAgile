import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { jiraInstance, projectKey } = await request.json()

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
    
    try {
      const response = await fetch(`${jiraInstance.url}/rest/api/3/project/${projectKey}/version`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Jira API error: ${response.status}`)
      }

      const data = await response.json()
      console.log('Versions API response:', data)
      
      // Handle both direct array and paginated response formats
      const versions = Array.isArray(data) ? data : (data.values || [])
      
      const quarters = versions
        .filter((version: { archived: boolean }) => !version.archived)
        .map((version: { name: string }) => version.name)
        .sort()

      return NextResponse.json({ quarters })

    } catch (versionError) {
      console.error('Failed to fetch project versions:', versionError)
      
      // Return default quarters as fallback
      const currentYear = new Date().getFullYear()
      const defaultQuarters = [
        `Q1 ${currentYear}`,
        `Q2 ${currentYear}`,
        `Q3 ${currentYear}`,
        `Q4 ${currentYear}`,
        `Q1 ${currentYear + 1}`
      ]

      return NextResponse.json({ quarters: defaultQuarters })
    }

  } catch (error) {
    console.error('Get versions error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project versions' },
      { status: 500 }
    )
  }
} 