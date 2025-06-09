import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { url, email, apiToken } = await request.json()

    if (!url || !email || !apiToken) {
      return NextResponse.json(
        { error: 'Missing required fields: url, email, and apiToken' },
        { status: 400 }
      )
    }

    // Clean up the URL
    const cleanUrl = url.replace(/\/$/, '')
    
    // Test the connection by making a request to Jira's myself endpoint
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64')
    
    console.log('Testing Jira connection:', {
      url: cleanUrl,
      email: email,
      tokenLength: apiToken?.length,
      endpoint: `${cleanUrl}/rest/api/3/myself`
    })
    
    const response = await fetch(`${cleanUrl}/rest/api/3/myself`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })
    
    console.log('Jira API response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details')
      console.error('Jira API error details:', errorText)
      
      if (response.status === 401) {
        return NextResponse.json(
          { 
            error: 'Invalid credentials. Please verify:\n• Email is correct\n• API token is valid\n• URL format: https://your-domain.atlassian.net',
            details: errorText
          },
          { status: 401 }
        )
      } else if (response.status === 403) {
        return NextResponse.json(
          { error: 'Access denied. Please check your permissions.' },
          { status: 403 }
        )
      } else if (response.status === 404) {
        return NextResponse.json(
          { error: 'Jira instance not found. Please check your URL format.' },
          { status: 404 }
        )
      } else {
        return NextResponse.json(
          { error: `Jira API error: ${response.status} ${response.statusText}` },
          { status: response.status }
        )
      }
    }

    const userData = await response.json()

    return NextResponse.json({
      success: true,
      message: 'Connection successful!',
      user: {
        accountId: userData.accountId,
        displayName: userData.displayName,
        emailAddress: userData.emailAddress,
      },
    })
  } catch (error) {
    console.error('Jira connection test error:', error)
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { error: 'Network error. Please check the Jira URL and your internet connection.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    )
  }
} 