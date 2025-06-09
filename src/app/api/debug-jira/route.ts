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
    
    // Test different queries
    const queries = [
      `project = "${projectKey}"`,
      `project = "${projectKey}" AND issuetype = "Epic"`,
      `project = "${projectKey}" AND issuetype = "Story"`,
      `project = "${projectKey}" AND issuetype = "Task"`,
    ]

    const results = []

    for (const jql of queries) {
      try {
        const response = await fetch(
          `${jiraInstance.url}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=summary,issuetype&maxResults=5`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          }
        )

        if (response.ok) {
          const data = await response.json()
          results.push({
            jql,
            total: data.total,
            issues: data.issues?.slice(0, 3).map((issue: any) => ({
              key: issue.key,
              summary: issue.fields?.summary,
              issueType: issue.fields?.issuetype?.name
            })) || []
          })
        } else {
          results.push({
            jql,
            error: `${response.status} ${response.statusText}`
          })
        }
      } catch (err) {
        results.push({
          jql,
          error: err instanceof Error ? err.message : 'Unknown error'
        })
      }
    }

    // Also get available issue types for the project
    try {
      const issueTypesResponse = await fetch(
        `${jiraInstance.url}/rest/api/3/project/${projectKey}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        }
      )

      let issueTypes = []
      if (issueTypesResponse.ok) {
        const projectData = await issueTypesResponse.json()
        issueTypes = projectData.issueTypes?.map((type: any) => ({
          id: type.id,
          name: type.name,
          description: type.description
        })) || []
      }

      return NextResponse.json({ 
        projectKey,
        queries: results,
        availableIssueTypes: issueTypes
      })

    } catch (err) {
      return NextResponse.json({ 
        projectKey,
        queries: results,
        availableIssueTypes: [],
        issueTypesError: err instanceof Error ? err.message : 'Unknown error'
      })
    }

  } catch (error) {
    console.error('Debug Jira error:', error)
    return NextResponse.json(
      { error: 'Failed to debug Jira queries' },
      { status: 500 }
    )
  }
} 