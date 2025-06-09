import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { jiraConnection, fieldId } = await request.json()

    if (!jiraConnection?.url || !jiraConnection?.email || !jiraConnection?.apiToken) {
      return NextResponse.json(
        { error: 'Missing Jira connection details' },
        { status: 400 }
      )
    }

    if (!fieldId) {
      return NextResponse.json(
        { error: 'Missing field ID' },
        { status: 400 }
      )
    }

    const auth = Buffer.from(`${jiraConnection.email}:${jiraConnection.apiToken}`).toString('base64')
    
    // Get field options from Jira
    const response = await fetch(`${jiraConnection.url}/rest/api/3/field/${fieldId}/option`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      // If the field options endpoint fails, try getting field details
      const fieldResponse = await fetch(`${jiraConnection.url}/rest/api/3/field/${fieldId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
        },
      })

      if (!fieldResponse.ok) {
        return NextResponse.json(
          { error: `Failed to get field options: ${response.status}` },
          { status: response.status }
        )
      }

      const fieldData = await fieldResponse.json()
      return NextResponse.json({
        success: true,
        options: [],
        fieldData
      })
    }

    const options = await response.json()
    
    return NextResponse.json({
      success: true,
      options: options.values || options || [],
      fieldId
    })

  } catch (error) {
    console.error('Error getting field options:', error)
    return NextResponse.json(
      { error: 'Failed to get field options' },
      { status: 500 }
    )
  }
} 