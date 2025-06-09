import { NextRequest, NextResponse } from 'next/server'
import { jiraFieldService } from '../../../../lib/jira-field-service'

export async function POST(request: NextRequest) {
  try {
    const { jiraInstance, workItemType, issueTypeId, searchTerm } = await request.json()

    if (!jiraInstance?.url || !jiraInstance?.email || !jiraInstance?.apiToken) {
      return NextResponse.json(
        { error: 'Missing Jira connection details' },
        { status: 400 }
      )
    }

    console.log('Discovering all available fields for:', { workItemType, issueTypeId, searchTerm })

    // Get all available fields
    const allFields = await jiraFieldService.getAllAvailableFields(jiraInstance, issueTypeId)
    
    if (allFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields could be discovered' },
        { status: 404 }
      )
    }

    // Apply search filter if provided
    const filteredFields = searchTerm 
      ? jiraFieldService.searchFields(allFields, searchTerm)
      : allFields

    // Categorize fields for better UX
    const categorizedFields = jiraFieldService.categorizeFields(filteredFields)

    // Get currently configured fields for this work item type
    const currentMapping = jiraFieldService.getFieldMapping(workItemType)
    const currentFieldIds = new Set(currentMapping?.fields.map(f => f.id) || [])

    // Add usage statistics and configuration status
    const enrichedCategories = {
      commonly_used: categorizedFields.commonly_used.map(field => ({
        ...field,
        usage_stats: jiraFieldService.getFieldUsageStats(field),
        is_configured: currentFieldIds.has(field.id)
      })),
      project_specific: categorizedFields.project_specific.map(field => ({
        ...field,
        usage_stats: jiraFieldService.getFieldUsageStats(field),
        is_configured: currentFieldIds.has(field.id)
      })),
      optional_standard: categorizedFields.optional_standard.map(field => ({
        ...field,
        usage_stats: jiraFieldService.getFieldUsageStats(field),
        is_configured: currentFieldIds.has(field.id)
      })),
      system_fields: categorizedFields.system_fields.map(field => ({
        ...field,
        usage_stats: jiraFieldService.getFieldUsageStats(field),
        is_configured: currentFieldIds.has(field.id)
      }))
    }

    // Calculate summary statistics
    const summary = {
      total_available: allFields.length,
      total_filtered: filteredFields.length,
      currently_configured: currentFieldIds.size,
      commonly_used_count: categorizedFields.commonly_used.length,
      project_specific_count: categorizedFields.project_specific.length,
      optional_standard_count: categorizedFields.optional_standard.length,
      system_fields_count: categorizedFields.system_fields.length
    }

    return NextResponse.json({
      success: true,
      fields: enrichedCategories,
      summary,
      search_term: searchTerm || null,
      work_item_type: workItemType
    })

  } catch (error) {
    console.error('Field discovery error:', error)
    return NextResponse.json(
      { error: 'Failed to discover fields' },
      { status: 500 }
    )
  }
} 