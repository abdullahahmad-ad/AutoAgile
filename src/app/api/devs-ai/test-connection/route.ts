import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { apiToken } = await request.json()

    if (!apiToken) {
      return NextResponse.json(
        { error: 'Missing required field: apiToken' },
        { status: 400 }
      )
    }

    console.log('Testing DevS.ai connection:', {
      tokenLength: apiToken?.length,
      tokenPrefix: apiToken?.substring(0, 3),
      endpoint: 'https://devs.ai/api/v1/me/ai'
    })

    // First, try to list the user's AIs to test authentication
    // This is a simpler endpoint that should work with just API key auth
    const response = await fetch('https://devs.ai/api/v1/me/ai', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json'
      }
    })

    console.log('DevS.ai API response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details')
      console.error('DevS.ai API error details:', errorText)
      
      if (response.status === 401) {
        return NextResponse.json(
          { 
            error: 'Invalid API key. Please verify:\n• Key starts with "sk-"\n• Key has appropriate scopes (ai.read.self, chats.write.self)\n• Key is valid and not expired\n• You are logged into DevS.ai in your browser',
            details: errorText
          },
          { status: 401 }
        )
      } else if (response.status === 403) {
        return NextResponse.json(
          { error: 'Access denied. Please check your DevS.ai account permissions and ensure you have the required scopes.' },
          { status: 403 }
        )
      } else if (response.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        )
      } else {
        return NextResponse.json(
          { error: `DevS.ai API error: ${response.status} ${response.statusText}. Note: DevS.ai may require you to be logged into their web app.` },
          { status: response.status }
        )
      }
    }

    const responseData = await response.json()

    return NextResponse.json({
      success: true,
      message: 'Connection successful!',
      data: {
        aiCount: responseData.data?.length || 0,
        testResponse: 'API connection verified'
      },
    })
  } catch (error) {
    console.error('DevS.ai connection test error:', error)
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { error: 'Network error. Please check your internet connection.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    )
  }
} 