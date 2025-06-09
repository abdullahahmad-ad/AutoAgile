import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { jiraConnection, workItemType } = await request.json()

    if (!jiraConnection?.url || !jiraConnection?.email || !jiraConnection?.apiToken) {
      return NextResponse.json(
        { error: 'Missing Jira connection details' },
        { status: 400 }
      )
    }

    const auth = Buffer.from(`${jiraConnection.email}:${jiraConnection.apiToken}`).toString('base64')
    
    // Map work item type to Jira issue type
    const issueTypeMap: Record<string, string> = {
      'epic': 'Epic',
      'story': 'Story', 
      'initiative': 'Initiative'
    }
    
    const jiraIssueType = issueTypeMap[workItemType] || 'Story'
    
    // Get all issue types to find the correct ID
    const issueTypesResponse = await fetch(`${jiraConnection.url}/rest/api/3/issuetype`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      },
    })

    if (!issueTypesResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to get issue types' },
        { status: issueTypesResponse.status }
      )
    }

    const issueTypes = await issueTypesResponse.json()
    const targetIssueType = issueTypes.find((type: any) => 
      type.name.toLowerCase() === jiraIssueType.toLowerCase()
    )

    if (!targetIssueType) {
      return NextResponse.json(
        { error: `Issue type '${jiraIssueType}' not found` },
        { status: 404 }
      )
    }

    // Get project key - use the configured one or the first available
    let projectKey = jiraConnection.projectKey
    
    if (!projectKey) {
      const projectsResponse = await fetch(`${jiraConnection.url}/rest/api/3/project`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
        },
      })

      if (projectsResponse.ok) {
        const projects = await projectsResponse.json()
        projectKey = projects[0]?.key
      }
    }

    if (!projectKey) {
      return NextResponse.json(
        { error: 'No project key available' },
        { status: 400 }
      )
    }

    // Get create metadata for the specific issue type and project
    const metaUrl = `${jiraConnection.url}/rest/api/3/issue/createmeta?projectKeys=${projectKey}&issuetypeIds=${targetIssueType.id}&expand=projects.issuetypes.fields`
    
    const metaResponse = await fetch(metaUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      },
    })

    if (!metaResponse.ok) {
      return NextResponse.json(
        { error: `Failed to get create metadata: ${metaResponse.status}` },
        { status: metaResponse.status }
      )
    }

    const metadata = await metaResponse.json()
    
    // Extract fields from the metadata structure
    const project = metadata.projects?.[0]
    const issueType = project?.issuetypes?.[0]
    const fieldsData = issueType?.fields || {}
    
    // Process fields to extract the information we need
    const discoveredFields = []
    
    for (const [fieldId, fieldInfo] of Object.entries(fieldsData)) {
      const field = fieldInfo as any
      
      // Extract allowed values
      let allowedValues: any[] = []
      if (field.allowedValues && Array.isArray(field.allowedValues)) {
        allowedValues = field.allowedValues
      }
      
      // Determine field type based on schema
      let fieldType = 'text'
      let isMultiSelect = false
      
      if (field.schema) {
        switch (field.schema.type) {
          case 'string':
            fieldType = 'text'
            break
          case 'number':
            fieldType = 'number'
            break
          case 'date':
          case 'datetime':
            fieldType = 'date'
            break
          case 'option':
            fieldType = 'select'
            break
          case 'array':
            if (field.schema.items?.type === 'option') {
              fieldType = 'multiselect'
              isMultiSelect = true
            } else {
              fieldType = 'text'
            }
            break
          case 'user':
            fieldType = 'user'
            break
          case 'project':
            fieldType = 'project'
            break
          case 'issuetype':
            fieldType = 'issuetype'
            break
          case 'priority':
            fieldType = 'priority'
            break
          default:
            // Check for custom field types
            if (field.schema.custom) {
              if (field.schema.custom.includes('select')) {
                fieldType = field.schema.custom.includes('multi') ? 'multiselect' : 'select'
                isMultiSelect = field.schema.custom.includes('multi')
              } else if (field.schema.custom.includes('textarea')) {
                fieldType = 'textarea'
              } else if (field.schema.custom.includes('checkbox')) {
                fieldType = 'checkbox'
              } else if (field.schema.custom.includes('radiobutton')) {
                fieldType = 'radio'
              }
            }
            break
        }
      }
      
      discoveredFields.push({
        id: fieldId,
        name: field.name || fieldId,
        type: fieldType,
        required: field.required || false,
        allowedValues: allowedValues,
        isMultiSelect: isMultiSelect,
        schema: field.schema,
        description: field.description || undefined,
        hasDefaultValue: field.hasDefaultValue || false,
        operations: field.operations || []
      })
    }

    // Sort fields - required first, then by name
    discoveredFields.sort((a, b) => {
      if (a.required && !b.required) return -1
      if (!a.required && b.required) return 1
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({
      success: true,
      fields: discoveredFields,
      projectKey,
      issueTypeName: targetIssueType.name,
      issueTypeId: targetIssueType.id,
      totalFields: discoveredFields.length,
      requiredFields: discoveredFields.filter(f => f.required).length
    })

  } catch (error) {
    console.error('Error discovering fields:', error)
    return NextResponse.json(
      { error: 'Failed to discover fields' },
      { status: 500 }
    )
  }
} 