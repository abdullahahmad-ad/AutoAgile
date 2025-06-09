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
    
    // Get comprehensive field metadata
    const fieldResponse = await fetch(`${jiraConnection.url}/rest/api/3/field/${fieldId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      },
    })

    if (!fieldResponse.ok) {
      return NextResponse.json(
        { error: `Failed to get field metadata: ${fieldResponse.status}` },
        { status: fieldResponse.status }
      )
    }

    const fieldData = await fieldResponse.json()
    
    // Try to get field options if it's a select field
    let options = []
    try {
      const optionsResponse = await fetch(`${jiraConnection.url}/rest/api/3/field/${fieldId}/option`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
        },
      })

      if (optionsResponse.ok) {
        const optionsData = await optionsResponse.json()
        options = optionsData.values || optionsData || []
      }
    } catch (error) {
      console.log('Could not fetch field options:', error)
    }

    // Try to get field context for more detailed information
    let contextData = null
    try {
      const contextResponse = await fetch(`${jiraConnection.url}/rest/api/3/field/${fieldId}/context`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
        },
      })

      if (contextResponse.ok) {
        contextData = await contextResponse.json()
      }
    } catch (error) {
      console.log('Could not fetch field context:', error)
    }

    return NextResponse.json({
      success: true,
      fieldData,
      options,
      contextData,
      fieldId
    })

  } catch (error) {
    console.error('Error getting field metadata:', error)
    return NextResponse.json(
      { error: 'Failed to get field metadata' },
      { status: 500 }
    )
  }
} 