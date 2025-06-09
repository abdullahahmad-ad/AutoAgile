import { NextRequest, NextResponse } from 'next/server'

interface DevsAIProxyRequest {
  apiToken: string
  requestBody: {
    messages: Array<{
      role: 'system' | 'user' | 'assistant'
      content: string
    }>
    model: string
    stream?: boolean
    flowOverride?: object
    tools?: object[]
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: DevsAIProxyRequest = await request.json()
    const { apiToken, requestBody } = body

    // Validate input
    if (!apiToken || !requestBody || !requestBody.messages || !requestBody.model) {
      return NextResponse.json(
        { error: 'API token, messages, and model are required' },
        { status: 400 }
      )
    }

    // Make request to DevS.ai API
    const response = await fetch('https://devs.ai/api/v1/chats/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `DevS.ai API error: ${response.status} ${response.statusText}`
      
      try {
        const errorData = JSON.parse(errorText)
        if (errorData.error) {
          errorMessage = errorData.error
        } else if (errorData.message) {
          errorMessage = errorData.message
        }
      } catch {
        // If error response is not JSON, use the status text
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('DevS.ai proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 