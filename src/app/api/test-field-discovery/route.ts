import { NextRequest, NextResponse } from 'next/server'
import { jiraFieldService } from '../../../lib/jira-field-service'

export async function POST(request: NextRequest) {
  try {
    const { jiraConnection, workItemType } = await request.json()

    if (!jiraConnection) {
      return NextResponse.json(
        { error: 'Missing Jira connection' },
        { status: 400 }
      )
    }

    console.log(`Testing field discovery for ${workItemType}...`)

    // Discover fields for the work item type
    const fieldMapping = await jiraFieldService.discoverFields(jiraConnection, workItemType || 'story')

    if (!fieldMapping) {
      return NextResponse.json(
        { error: 'Failed to discover fields' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      fieldMapping,
      message: `Successfully discovered ${fieldMapping.fields.length} fields for ${workItemType}`
    })

  } catch (error) {
    console.error('Error in field discovery test:', error)
    return NextResponse.json(
      { error: 'Field discovery test failed' },
      { status: 500 }
    )
  }
} 