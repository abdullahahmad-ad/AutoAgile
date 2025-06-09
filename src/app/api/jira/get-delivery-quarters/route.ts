import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { jiraInstance, projectKey } = await request.json()

    if (!jiraInstance?.url || !jiraInstance?.email || !jiraInstance?.apiToken) {
      return NextResponse.json(
        { error: 'Missing Jira connection details' },
        { status: 400 }
      )
    }

    // Generate quarters based on current date and business logic
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1 // getMonth() returns 0-11
    
    // Determine current quarter
    let currentQuarter = 1
    if (currentMonth >= 4 && currentMonth <= 6) currentQuarter = 2
    else if (currentMonth >= 7 && currentMonth <= 9) currentQuarter = 3
    else if (currentMonth >= 10 && currentMonth <= 12) currentQuarter = 4

    // Generate quarters for current and next year
    const quarters = []
    for (let q = 1; q <= 4; q++) {
      quarters.push(`Q${q} ${currentYear}`)
    }
    for (let q = 1; q <= 4; q++) {
      quarters.push(`Q${q} ${currentYear + 1}`)
    }

    const defaultQuarter = `Q${currentQuarter} ${currentYear}`

    console.log('Generated delivery quarters:', {
      currentDate: currentDate.toISOString(),
      currentMonth,
      currentQuarter,
      defaultQuarter,
      allQuarters: quarters
    })

    // Try to fetch actual fix versions from the project to supplement the generated quarters
    try {
      const auth = btoa(`${jiraInstance.email}:${jiraInstance.apiToken}`)
      
      const versionsResponse = await fetch(`${jiraInstance.url}/rest/api/3/project/${projectKey}/versions`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })

      if (versionsResponse.ok) {
        const versions = await versionsResponse.json()
        console.log('Found project versions:', versions.length)
        
        // Use all version names directly from Jira
        const versionNames = versions
          .map((v: any) => v.name)
          .filter((name: string) => name && name.trim().length > 0)
          .sort()
        
        console.log('All version names:', versionNames)
        
        if (versionNames.length > 0) {
          // Find the best default from actual Jira versions
          let bestDefault = defaultQuarter
          
          // Look for current quarter patterns in the actual version names
          const currentQuarterPattern = `Q${currentQuarter} ${currentYear}`
          const alternatePattern = `${currentYear} Q${currentQuarter}`
          
          if (versionNames.includes(currentQuarterPattern)) {
            bestDefault = currentQuarterPattern
          } else if (versionNames.includes(alternatePattern)) {
            bestDefault = alternatePattern
          } else {
            // Use the first version that contains the current year
            const currentYearVersions = versionNames.filter((name: string) => 
              name.includes(currentYear.toString())
            )
            if (currentYearVersions.length > 0) {
              bestDefault = currentYearVersions[0]
            } else if (versionNames.length > 0) {
              // Fallback to the first available version
              bestDefault = versionNames[0]
            }
          }
          
          return NextResponse.json({
            quarters: versionNames,
            defaultQuarter: bestDefault,
            source: 'jira',
            foundVersions: versionNames.length,
            actualVersions: versionNames
          })
        }
      }
    } catch (versionError) {
      console.log('Could not fetch project versions, using generated quarters:', versionError)
    }

    return NextResponse.json({
      quarters,
      defaultQuarter,
      source: 'generated'
    })

  } catch (error) {
    console.error('Failed to generate delivery quarters:', error)
    return NextResponse.json(
      { error: 'Failed to generate delivery quarters' },
      { status: 500 }
    )
  }
} 