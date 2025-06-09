import { NextRequest, NextResponse } from 'next/server'
import { jiraFieldFormatter } from '../../../../lib/jira-field-formatter'
import { jiraFieldService } from '../../../../lib/jira-field-service'
import { markdownToADFConverter, ADFDocument } from '../../../../lib/markdown-to-adf-converter'

export async function POST(request: NextRequest) {
  try {
    const { jiraConnection, workItemType, content } = await request.json()

    if (!jiraConnection || !workItemType || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: jiraConnection, workItemType, and content' },
        { status: 400 }
      )
    }

    const { url, email, apiToken, projectKey } = jiraConnection

    if (!url || !email || !apiToken) {
      return NextResponse.json(
        { error: 'Invalid Jira connection. Missing url, email, or apiToken.' },
        { status: 400 }
      )
    }

    // Validate project key
    if (!projectKey) {
      return NextResponse.json(
        { error: 'Project key is required. Please configure your Jira connection with a valid project key.' },
        { status: 400 }
      )
    }

    // Clean up the URL
    const cleanUrl = url.replace(/\/$/, '')
    
    // Create Basic Auth header
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64')

    // Map work item type to Jira issue type
    const issueTypeMap = {
      'initiative': 'Epic', // or 'Initiative' if available
      'epic': 'Epic',
      'story': 'Story'
    }

    // Convert description to Atlassian Document Format (ADF)
    // Use the markdown-to-ADF converter to preserve formatting
    let descriptionADF: ADFDocument
    
    if (content.description && content.description.trim()) {
      // Convert markdown to ADF to preserve formatting (headings, bold, italics, lists, etc.)
      descriptionADF = markdownToADFConverter.convert(content.description)
    } else {
      // Fallback to basic ADF structure
      descriptionADF = {
        type: 'doc',
        version: 1,
        content: [{
          type: 'paragraph',
          content: [{
            type: 'text',
            text: content.description || ''
          }]
        }]
      }
    }

    // Add acceptance criteria if present
    if (content.acceptanceCriteria && content.acceptanceCriteria.length > 0) {
      descriptionADF.content.push({
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Acceptance Criteria' }]
      })

      const criteriaList = {
        type: 'bulletList',
        content: content.acceptanceCriteria.map((criteria: string) => ({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: criteria }]
          }]
        }))
      }

      descriptionADF.content.push(criteriaList)
    }

    // Prepare the basic issue data with only required fields
    const issueData: any = {
      fields: {
        project: {
          key: projectKey || 'AC' // Default project key
        },
        summary: content.title,
        description: descriptionADF,
        issuetype: {
          name: issueTypeMap[workItemType as keyof typeof issueTypeMap] || 'Task'
        }
      }
    }

    // Add optional fields only if they have values
    // We'll try to create the issue first with basic fields, then retry without problematic fields if needed
    
    if (content.labels && content.labels.length > 0) {
      issueData.fields.labels = content.labels
    }

    // Add custom fields if present - with proper formatting
    if (content.customFields) {
      // Process custom fields with proper formatting
      for (const [key, value] of Object.entries(content.customFields)) {
        if (value !== null && value !== undefined && value !== '') {
          // Handle special fields that need specific formatting
          if (key === 'project') {
            // Project should be an object with key
            issueData.fields.project = { key: value }
          } else if (key === 'issuetype') {
            // Issue type should be an object with name
            issueData.fields.issuetype = { name: value }
          } else if (key === 'assignee') {
            // User fields should be objects with accountId or emailAddress
            issueData.fields[key] = { emailAddress: value }
          } else if (key === 'reporter') {
            // Skip reporter field as it's often not settable by API
            console.log('Skipping reporter field - not settable via API')
          } else if (key === 'priority') {
            // Priority field needs to be an object with name
            issueData.fields[key] = { name: value }
          } else if (key.startsWith('customfield_')) {
            // For custom fields, get metadata and format properly
            try {
              const fieldMetadata = await jiraFieldService.getFieldMetadata(jiraConnection, key)
              if (fieldMetadata) {
                const formatInfo = jiraFieldFormatter.getFieldFormatInfo(fieldMetadata)
                const formattedValue = jiraFieldFormatter.formatFieldValue(formatInfo, value)
                if (formattedValue !== null) {
                  issueData.fields[key] = formattedValue
                  console.log(`Formatted field ${key}:`, formattedValue)
                }
              } else {
                // Fallback formatting for unknown custom fields
                console.log(`No metadata found for ${key}, using fallback formatting`)
                if (key === 'customfield_26360') {
                  // Include on Roadmap (Internal/External) - needs array format.
                  // For multiselect fields, Jira expects an array of objects with 'value' property
                  const values = Array.isArray(value) ? value : [value];
                  const formattedValues = values
                    .filter(v => v && v.toString().trim()) // Remove empty values
                    .map(v => {
                      const trimmedValue = String(v).trim();
                      // Try multiple format variations that Jira might accept
                      return { value: trimmedValue };
                    });
                  
                  console.log(`Formatting customfield_26360: input=${JSON.stringify(value)} -> output=${JSON.stringify(formattedValues)}`);
                  issueData.fields[key] = formattedValues;
                } else if (key === 'customfield_26362') {
                  // Delivery Quarter - needs object format
                  issueData.fields[key] = { value: value }
                } else {
                  // Default object format for custom fields
                  issueData.fields[key] = { value: value }
                }
              }
            } catch (error) {
              console.error(`Error formatting field ${key}:`, error)
              // Fallback to simple formatting
              issueData.fields[key] = { value: value }
            }
          } else {
            issueData.fields[key] = value
          }
        }
      }
    }

    // Function to create issue with given data
    const createIssue = async (data: any) => {
      console.log('Creating Jira issue with data:', JSON.stringify(data, null, 2))
      
      return await fetch(`${cleanUrl}/rest/api/3/issue`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
    }

    // Try to create the issue with all fields first
    let response = await createIssue(issueData)

    // If we get a 400 error, check for field discovery opportunities first
    if (!response.ok && response.status === 400) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Jira API error:', response.status, response.statusText, errorData)

      // Check for invalid option value error for custom fields
      if (errorData.errors) {
        for (const fieldId in errorData.errors) {
          if (fieldId.startsWith('customfield_') && typeof errorData.errors[fieldId] === 'string' && errorData.errors[fieldId].includes('is not valid')) {
            console.log(`Invalid option detected for ${fieldId}: ${errorData.errors[fieldId]}`);
            try {
              const fieldMetadata = await jiraFieldService.getFieldMetadata(jiraConnection, fieldId);
              let allowedOptions = [];
              if (fieldMetadata && fieldMetadata.options) {
                allowedOptions = fieldMetadata.options.map((opt: any) => ({
                  id: opt.id,
                  value: opt.value,
                  name: opt.name || opt.value // Fallback to value if name is not present
                }));
              }
              
              // Find the original value sent for this field from issueData
              let originalValue = issueData.fields[fieldId];
              if (typeof originalValue === 'object' && originalValue !== null) {
                // If it's an array of objects like [{id: "123"}] or [{value: "abc"}], extract the primitive
                if (Array.isArray(originalValue) && originalValue.length > 0) {
                    originalValue = originalValue[0].id || originalValue[0].value;
                } else { // If it's a single object like {id: "123"} or {value: "abc"}
                    originalValue = originalValue.id || originalValue.value;
                }
              }


              return NextResponse.json({
                error: 'Invalid field option',
                fieldId: fieldId,
                errorMessage: errorData.errors[fieldId],
                invalidValue: originalValue, // Attempt to send back the value that was problematic
                allowedOptions: allowedOptions,
                jiraError: errorData
              }, { status: 400 });
            } catch (metaError) {
              console.error(`Failed to get metadata for ${fieldId} after invalid option error:`, metaError);
              // Fallback if metadata fetch fails
              return NextResponse.json({
                error: 'Invalid field option and failed to fetch options',
                fieldId: fieldId,
                errorMessage: errorData.errors[fieldId],
                jiraError: errorData
              }, { status: 400 });
            }
          }
        }
      }
      
      // Check if this is a required fields error that can be used for field discovery
      const hasRequiredFieldsError = errorData.errors && Object.keys(errorData.errors).some(key => 
        typeof errorData.errors[key] === 'string' && 
        (errorData.errors[key].toLowerCase().includes('required') || 
         errorData.errors[key].toLowerCase().includes('is required'))
      )
      
      if (hasRequiredFieldsError) {
        console.log('Required fields error detected, triggering field discovery')
        console.log('Error details:', errorData.errors)
        // Return the full error data for field discovery
        return NextResponse.json({
          error: 'Required fields missing',
          fieldDiscovery: true,
          jiraError: errorData,
          workItemType: workItemType
        }, { status: 400 })
      }
      
      // If not a required fields error, try with basic fields only
      // Only retry for non-required field errors (like priority, optional custom fields)
      if (errorData.errors && !hasRequiredFieldsError && (
        errorData.errors.priority || 
        errorData.errors.duedate ||
        errorData.errors.reporter ||
        (errorData.errors.customfield_10002 && !errorData.errors.customfield_10002.toLowerCase().includes('required')) ||
        // Add a check for the problematic custom field if it's not a 'required' error but an 'invalid option'
        (errorData.errors.customfield_26360 && !errorData.errors.customfield_26360.toLowerCase().includes('required'))
      )) {
        console.log('Retrying with basic fields only due to field availability/validity issues')
        
        // Create a minimal issue data with only required fields
        const basicIssueData: any = {
          fields: {
            project: {
              key: projectKey || 'AC'
            },
            summary: content.title,
            description: descriptionADF,
            issuetype: {
              name: issueTypeMap[workItemType as keyof typeof issueTypeMap] || 'Task'
            }
          }
        }

        // Add any required fields from customFields with proper formatting
        if (content.customFields) {
          for (const [key, value] of Object.entries(content.customFields)) {
            if (value !== null && value !== undefined && value !== '') {
              if (key === 'project') {
                basicIssueData.fields.project = { key: value }
              } else if (key === 'issuetype') {
                basicIssueData.fields.issuetype = { name: value }
              } else if (key === 'assignee') {
                basicIssueData.fields[key] = { emailAddress: value }
              } else if (key === 'reporter') {
                // Skip reporter field - not settable via API
                console.log('Skipping reporter field in retry')
              } else if (key === 'priority') {
                // Skip priority field - may not be available
                console.log('Skipping priority field in retry')
              } else if (key.startsWith('customfield_')) {
                // Include custom fields that might be required with proper formatting
                try {
                  const fieldMetadata = await jiraFieldService.getFieldMetadata(jiraConnection, key)
                  if (fieldMetadata) {
                    const formatInfo = jiraFieldFormatter.getFieldFormatInfo(fieldMetadata)
                    const formattedValue = jiraFieldFormatter.formatFieldValue(formatInfo, value)
                    if (formattedValue !== null) {
                      basicIssueData.fields[key] = formattedValue
                      console.log(`Formatted field ${key} in retry:`, formattedValue)
                    }
                  } else {
                    // Fallback formatting
                    if (key === 'customfield_26360') {
                      basicIssueData.fields[key] = Array.isArray(value) ? value.map(v => ({ id: String(v) })) : [{ id: String(value) }]
                    } else if (key === 'customfield_26362') {
                      basicIssueData.fields[key] = { value: value }
                    } else {
                      basicIssueData.fields[key] = { value: value }
                    }
                  }
                } catch (error) {
                  console.error(`Error formatting field ${key} in retry:`, error)
                  basicIssueData.fields[key] = { value: value }
                }
              }
            }
          }
        }

        // Add labels if they were in the original data (usually safe)
        if (content.labels && content.labels.length > 0) {
          basicIssueData.fields.labels = content.labels
        }

        // Retry with basic fields
        response = await createIssue(basicIssueData)
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Jira API error:', response.status, response.statusText, errorData)
      
      // Check if this is an invalid field option error that was re-thrown after a retry
      // This check is simplified as the detailed parsing is now done before the retry block
      if (response.status === 400 && errorData.error === 'Invalid field option') {
          return NextResponse.json(errorData, { status: 400 });
      }

      if (response.status === 400) {
        // Check if this is a project key error
        if (errorData.errors && errorData.errors.project) {
          return NextResponse.json(
            { error: `Project error: ${errorData.errors.project}. Please check your Jira connection and ensure the project key is valid.` },
            { status: 400 }
          )
        }
        

        
        const errorMessages = errorData.errors 
          ? Object.values(errorData.errors).join(', ')
          : 'Invalid request data'
        return NextResponse.json(
          { error: `Bad request: ${errorMessages}` },
          { status: 400 }
        )
      } else if (response.status === 401) {
        return NextResponse.json(
          { error: 'Authentication failed. Please check your credentials.' },
          { status: 401 }
        )
      } else if (response.status === 403) {
        return NextResponse.json(
          { error: 'Permission denied. You may not have permission to create issues in this project.' },
          { status: 403 }
        )
      } else {
        return NextResponse.json(
          { error: `Jira API error: ${response.status} ${response.statusText}` },
          { status: response.status }
        )
      }
    }

    const createdIssue = await response.json()

    return NextResponse.json({
      success: true,
      message: 'Issue created successfully!',
      issue: {
        id: createdIssue.id,
        key: createdIssue.key,
        url: `${cleanUrl}/browse/${createdIssue.key}`,
        self: createdIssue.self
      },
    })
  } catch (error) {
    console.error('Create issue error:', error)
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { error: 'Network error. Please check your connection to Jira.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    )
  }
} 