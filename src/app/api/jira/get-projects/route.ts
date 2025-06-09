import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { jiraInstance } = await request.json()

    if (!jiraInstance?.url || !jiraInstance?.email || !jiraInstance?.apiToken) {
      return NextResponse.json(
        { error: 'Missing Jira connection details' },
        { status: 400 }
      )
    }

    const auth = btoa(`${jiraInstance.email}:${jiraInstance.apiToken}`)
    
    // Fetch all projects with pagination
    let allProjects: any[] = []
    let startAt = 0
    const maxResults = 100 // Increase page size for efficiency
    let hasMoreResults = true

    while (hasMoreResults) {
      const url = `${jiraInstance.url}/rest/api/3/project/search?startAt=${startAt}&maxResults=${maxResults}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Jira API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      // Add projects from this page
      if (data.values && Array.isArray(data.values)) {
        allProjects = allProjects.concat(data.values)
      }
      
      // Check if there are more results
      const totalResults = data.total || 0
      startAt += maxResults
      hasMoreResults = startAt < totalResults
      
      console.log(`Fetched ${data.values?.length || 0} projects (${startAt}/${totalResults})`)
    }
    
    const projects = allProjects.map((project: { id: string; key: string; name: string; description?: string }) => ({
      id: project.id,
      key: project.key,
      name: project.name,
      description: project.description
    }))

    console.log(`Found ${projects.length} total projects:`, projects.map((p: { key: string; name: string }) => ({ key: p.key, name: p.name })))
    return NextResponse.json({ projects, count: projects.length })

  } catch (error) {
    console.error('Failed to fetch projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects from Jira' },
      { status: 500 }
    )
  }
} 