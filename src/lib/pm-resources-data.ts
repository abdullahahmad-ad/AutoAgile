import { PMTool, PMToolCategory_Info, PMToolCategory } from '../types'

// Category definitions with design language colors
export const PM_TOOL_CATEGORIES: PMToolCategory_Info[] = [
  {
    id: 'planning-roadmapping',
    name: 'Planning & Roadmapping',
    description: 'Strategic planning, roadmap creation, and timeline tools',
    icon: '📋',
    color: 'royal-950'
  },
  {
    id: 'diagramming-visualization',
    name: 'Diagramming & Visualization',
    description: 'Flowcharts, user journey maps, and system diagrams',
    icon: '🎨',
    color: 'sky-600'
  },
  {
    id: 'documentation-requirements',
    name: 'Documentation & Requirements',
    description: 'Spec templates, requirement gathering, and documentation',
    icon: '📝',
    color: 'forest-900'
  },
  {
    id: 'design-prototyping',
    name: 'Design & Prototyping',
    description: 'Wireframing, mockups, and interactive prototypes',
    icon: '🎨',
    color: 'marigold-500'
  },
  {
    id: 'analysis-metrics',
    name: 'Analysis & Metrics',
    description: 'Analytics, reporting, and data visualization tools',
    icon: '📊',
    color: 'coral-500'
  },
  {
    id: 'collaboration-communication',
    name: 'Collaboration & Communication',
    description: 'Team feedback, presentation tools, and communication',
    icon: '🤝',
    color: 'mint-500'
  },
  {
    id: 'development-workflow',
    name: 'Development Workflow',
    description: 'Estimation, sprint planning, and development tools',
    icon: '⚙️',
    color: 'navy-950'
  },
  {
    id: 'essential-reading',
    name: 'Essential Reading',
    description: 'Newsletters, blogs, and AI resources for product managers',
    icon: '📚',
    color: 'purple-600'
  }
]

// Comprehensive PM Tools Database
export const PM_TOOLS: PMTool[] = [
  // Planning & Roadmapping
  {
    id: 'roadmunk',
    name: 'Roadmunk',
    description: 'Beautiful roadmaps that everyone understands. Create stunning roadmaps with drag-and-drop simplicity.',
    shortDescription: 'Visual roadmap creation with multiple views',
    category: 'planning-roadmapping',
    type: 'freemium',
    complexity: 'intermediate',
    url: 'https://roadmunk.com',
    isPopular: true,
    tags: ['roadmap', 'planning', 'visualization', 'gantt'],
    useCases: ['Product roadmaps', 'Strategic planning', 'Timeline visualization', 'Stakeholder communication'],
    features: ['Drag-and-drop interface', 'Multiple view options', 'Stakeholder sharing', 'Integration support'],
    pros: ['Intuitive interface', 'Beautiful visualizations', 'Multiple roadmap views'],
    cons: ['Pricing can be high for small teams'],
    pricing: 'Free trial available, paid plans start at $19/month',
    rating: 4.3,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'productplan',
    name: 'ProductPlan',
    description: 'Purpose-built roadmap software for product teams. Connect strategy to execution with beautiful roadmaps.',
    shortDescription: 'Product roadmap software with strategy alignment',
    category: 'planning-roadmapping',
    type: 'paid',
    complexity: 'intermediate',
    url: 'https://productplan.com',
    isPopular: true,
    tags: ['product-roadmap', 'strategy', 'planning', 'team-collaboration'],
    useCases: ['Product strategy', 'Feature planning', 'Release planning', 'Executive communication'],
    features: ['Strategic alignment', 'Custom views', 'Team collaboration', 'Roadmap sharing'],
    pros: ['Great for product teams', 'Strategic focus', 'Professional templates'],
    cons: ['Higher price point', 'Learning curve for new users'],
    pricing: 'Paid plans start at $39/month',
    rating: 4.5,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'milanote',
    name: 'Milanote',
    description: 'The notes app for creative work. Organize ideas into visual boards.',
    shortDescription: 'Visual note-taking and idea organization',
    category: 'planning-roadmapping',
    type: 'freemium',
    complexity: 'beginner',
    url: 'https://milanote.com',
    isPopular: false,
    tags: ['notes', 'brainstorming', 'visual-thinking', 'mood-boards'],
    useCases: ['Idea collection', 'Project planning', 'Mood boards', 'Research organization']
  },
  {
    id: 'gantt-project',
    name: 'GanttProject',
    description: 'Free desktop project scheduling and management app with Gantt chart and resource management.',
    shortDescription: 'Free Gantt chart software for project planning',
    category: 'planning-roadmapping',
    type: 'free',
    complexity: 'intermediate',
    url: 'https://ganttproject.biz',
    isPopular: false,
    tags: ['gantt', 'project-management', 'scheduling', 'resource-management'],
    useCases: ['Project scheduling', 'Resource planning', 'Timeline management', 'Task dependencies']
  },

  // Diagramming & Visualization
  {
    id: 'draw-io',
    name: 'draw.io (diagrams.net)',
    description: 'Free online diagram software for making flowcharts, process diagrams, org charts, UML, ER and network diagrams.',
    shortDescription: 'Free online diagramming tool for all diagram types',
    category: 'diagramming-visualization',
    type: 'free',
    complexity: 'beginner',
    url: 'https://app.diagrams.net',
    isPopular: true,
    tags: ['flowchart', 'diagrams', 'uml', 'network-diagrams', 'org-charts'],
    useCases: ['Process flows', 'System architecture', 'User flows', 'Technical diagrams'],
    features: ['Completely free', 'No registration required', 'Extensive template library', 'Export options'],
    pros: ['Completely free', 'No account needed', 'Powerful features', 'Wide format support'],
    rating: 4.6,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'lucidchart',
    name: 'Lucidchart',
    description: 'Intelligent diagramming application that brings teams together to make better decisions and build the future.',
    shortDescription: 'Professional diagramming with real-time collaboration',
    category: 'diagramming-visualization',
    type: 'freemium',
    complexity: 'intermediate',
    url: 'https://lucidchart.com',
    isPopular: true,
    tags: ['flowchart', 'mind-maps', 'org-charts', 'collaboration', 'templates'],
    useCases: ['Process mapping', 'System design', 'Team collaboration', 'Mind mapping']
  },
  {
    id: 'whimsical',
    name: 'Whimsical',
    description: 'The visual workspace. Communicate visually at the speed of thought with flowcharts, wireframes, and more.',
    shortDescription: 'All-in-one visual workspace for modern teams',
    category: 'diagramming-visualization',
    type: 'freemium',
    complexity: 'beginner',
    url: 'https://whimsical.com',
    isPopular: true,
    tags: ['flowchart', 'wireframes', 'mind-maps', 'sticky-notes', 'collaboration'],
    useCases: ['User flows', 'Wireframing', 'Brainstorming', 'Process documentation']
  },
  {
    id: 'miro',
    name: 'Miro',
    description: 'The online collaborative whiteboard platform to bring teams together, anytime, anywhere.',
    shortDescription: 'Collaborative online whiteboard for visual collaboration',
    category: 'diagramming-visualization',
    type: 'freemium',
    complexity: 'beginner',
    url: 'https://miro.com',
    isPopular: true,
    tags: ['whiteboard', 'collaboration', 'brainstorming', 'templates', 'sticky-notes'],
    useCases: ['Workshops', 'Retrospectives', 'User journey mapping', 'Design thinking'],
    features: ['Infinite canvas', 'Real-time collaboration', 'Template library', 'Integration support'],
    pros: ['Great for collaboration', 'Intuitive interface', 'Extensive templates', 'Strong mobile app'],
    cons: ['Can be overwhelming with many features', 'Free plan limitations'],
    pricing: 'Free plan available, paid plans start at $8/month',
    rating: 4.7,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'eraser-io',
    name: 'Eraser.io',
    description: 'Technical design tool for engineering teams. Create docs and diagrams from whiteboard to publication.',
    shortDescription: 'Technical design tool for engineering teams',
    category: 'diagramming-visualization',
    type: 'freemium',
    complexity: 'intermediate',
    url: 'https://eraser.io',
    isPopular: false,
    tags: ['technical-diagrams', 'engineering', 'architecture', 'documentation', 'whiteboard'],
    useCases: ['System architecture', 'Technical documentation', 'Database schemas', 'API design'],
    features: ['Code-to-diagram generation', 'Version control integration', 'Collaborative editing', 'Export options'],
    pros: ['Great for technical teams', 'Code integration', 'Professional diagrams', 'Version control'],
    cons: ['Learning curve', 'Limited free tier'],
    pricing: 'Free plan available, paid plans start at $10/month',
    rating: 4.2,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'excalidraw',
    name: 'Excalidraw',
    description: 'Virtual whiteboard for sketching hand-drawn like diagrams. Collaborative and end-to-end encrypted.',
    shortDescription: 'Virtual whiteboard for hand-drawn style diagrams',
    category: 'diagramming-visualization',
    type: 'free',
    complexity: 'beginner',
    url: 'https://excalidraw.com',
    isPopular: true,
    tags: ['whiteboard', 'sketching', 'hand-drawn', 'collaboration', 'open-source'],
    useCases: ['Quick sketches', 'Brainstorming', 'Wireframing', 'Concept visualization'],
    features: ['Hand-drawn style', 'Real-time collaboration', 'End-to-end encryption', 'Export options'],
    pros: ['Completely free', 'No account required', 'Hand-drawn aesthetic', 'Open source'],
    cons: ['Limited advanced features', 'No templates'],
    rating: 4.6,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'storyset',
    name: 'Storyset',
    description: 'Awesome free customizable illustrations for your next project. Edit colors, hide objects, or change characters.',
    shortDescription: 'Free customizable illustrations and scenes',
    category: 'design-prototyping',
    type: 'freemium',
    complexity: 'beginner',
    url: 'https://storyset.com',
    isPopular: true,
    tags: ['illustrations', 'graphics', 'customizable', 'scenes', 'characters'],
    useCases: ['Presentation graphics', 'Website illustrations', 'Marketing materials', 'Storytelling'],
    features: ['Customizable colors', 'Editable characters', 'Various styles', 'Free downloads'],
    pros: ['High-quality illustrations', 'Fully customizable', 'Free tier available', 'Multiple formats'],
    cons: ['Limited styles on free tier', 'Requires attribution'],
    pricing: 'Free plan available, paid plans start at $12/month',
    rating: 4.5,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'undraw',
    name: 'unDraw',
    description: 'Open-source illustrations for any idea you can imagine and create. Browse through the library of illustrations.',
    shortDescription: 'Open-source illustrations with color customization',
    category: 'design-prototyping',
    type: 'free',
    complexity: 'beginner',
    url: 'https://undraw.co',
    isPopular: true,
    tags: ['illustrations', 'open-source', 'svg', 'customizable', 'color-matching'],
    useCases: ['Website graphics', 'App illustrations', 'Presentations', 'Marketing content'],
    features: ['Color customization', 'SVG format', 'No attribution required', 'Regular updates'],
    pros: ['Completely free', 'No attribution needed', 'Color matching', 'High quality'],
    cons: ['Limited styles', 'No character editing'],
    rating: 4.7,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'icons8-illustrations',
    name: 'Icons8 Illustrations',
    description: 'Vector illustrations for your projects. 3D, flat, and hand-drawn styles in various formats.',
    shortDescription: 'Professional vector illustrations in multiple styles',
    category: 'design-prototyping',
    type: 'freemium',
    complexity: 'beginner',
    url: 'https://icons8.com/illustrations',
    isPopular: false,
    tags: ['illustrations', 'vector', '3d', 'flat-design', 'hand-drawn'],
    useCases: ['Web design', 'App interfaces', 'Presentations', 'Marketing graphics'],
    features: ['Multiple art styles', 'Various formats', 'Search functionality', 'Collections'],
    pros: ['Professional quality', 'Multiple styles', 'Good search', 'Regular updates'],
    cons: ['Limited free downloads', 'Subscription required for unlimited use'],
    pricing: 'Free plan with limitations, paid plans start at $9.99/month',
    rating: 4.3,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'iconify',
    name: 'Iconify',
    description: 'All popular icon sets, one framework. Over 200,000 open source vector icons.',
    shortDescription: 'Massive collection of open source vector icons',
    category: 'design-prototyping',
    type: 'free',
    complexity: 'beginner',
    url: 'https://iconify.design',
    isPopular: true,
    tags: ['icons', 'vector', 'open-source', 'svg', 'web-fonts'],
    useCases: ['Website icons', 'App interfaces', 'Presentations', 'Design systems'],
    features: ['200,000+ icons', 'Multiple formats', 'API access', 'Framework integration'],
    pros: ['Huge collection', 'Completely free', 'Multiple formats', 'Developer-friendly'],
    cons: ['Can be overwhelming', 'Quality varies by set'],
    rating: 4.8,
    lastUpdated: '2024-12-01'
  },

  // Documentation & Requirements
  {
    id: 'notion',
    name: 'Notion',
    description: 'All-in-one workspace for notes, docs, knowledge base, projects, and collaboration.',
    shortDescription: 'All-in-one workspace for docs and project management',
    category: 'documentation-requirements',
    type: 'freemium',
    complexity: 'intermediate',
    url: 'https://notion.so',
    isPopular: true,
    tags: ['documentation', 'knowledge-base', 'notes', 'databases', 'templates'],
    useCases: ['Product specs', 'Meeting notes', 'Knowledge management', 'Project documentation'],
    features: ['Block-based editor', 'Database functionality', 'Template gallery', 'Team collaboration'],
    pros: ['Highly customizable', 'Great template community', 'Powerful database features', 'Good free plan'],
    cons: ['Learning curve', 'Can be slow with large pages', 'Limited offline access'],
    pricing: 'Free plan available, paid plans start at $8/month',
    rating: 4.4,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'confluence',
    name: 'Confluence',
    description: 'Team workspace where knowledge and collaboration meet. Create, collaborate, and organize all your work in one place.',
    shortDescription: 'Enterprise collaboration and documentation platform',
    category: 'documentation-requirements',
    type: 'paid',
    complexity: 'intermediate',
    url: 'https://atlassian.com/software/confluence',
    isPopular: true,
    tags: ['documentation', 'collaboration', 'knowledge-base', 'templates', 'atlassian'],
    useCases: ['Product documentation', 'Team knowledge base', 'Requirements documentation', 'Meeting notes'],
    features: ['Atlassian integration', 'Advanced permissions', 'Page templates', 'Content organization'],
    pros: ['Excellent Jira integration', 'Enterprise-grade security', 'Powerful search', 'Version control'],
    cons: ['Can be expensive', 'Complex for small teams', 'Learning curve'],
    pricing: 'Paid plans start at $5.75/month',
    rating: 4.2,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'gitbook',
    name: 'GitBook',
    description: 'Document everything! For you, your users and your team. Beautiful docs that grow with your product.',
    shortDescription: 'Beautiful documentation platform for modern teams',
    category: 'documentation-requirements',
    type: 'freemium',
    complexity: 'beginner',
    url: 'https://gitbook.com',
    isPopular: false,
    tags: ['documentation', 'api-docs', 'knowledge-base', 'publishing', 'markdown'],
    useCases: ['Product documentation', 'API documentation', 'User guides', 'Knowledge sharing']
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    description: 'A powerful knowledge base that works on top of a local folder of plain text Markdown files.',
    shortDescription: 'Connected knowledge base with graph visualization',
    category: 'documentation-requirements',
    type: 'freemium',
    complexity: 'intermediate',
    url: 'https://obsidian.md',
    isPopular: false,
    tags: ['notes', 'knowledge-graph', 'markdown', 'linking', 'personal-knowledge'],
    useCases: ['Research notes', 'Connected thinking', 'Personal knowledge base', 'Concept mapping']
  },

  // Design & Prototyping
  {
    id: 'figma',
    name: 'Figma',
    description: 'The collaborative interface design tool. Design, prototype, and gather feedback all in one place.',
    shortDescription: 'Collaborative design and prototyping platform',
    category: 'design-prototyping',
    type: 'freemium',
    complexity: 'intermediate',
    url: 'https://figma.com',
    isPopular: true,
    tags: ['design', 'prototyping', 'collaboration', 'ui-ux', 'wireframes'],
    useCases: ['UI design', 'Wireframing', 'Interactive prototypes', 'Design systems'],
    features: ['Real-time collaboration', 'Component system', 'Auto-layout', 'Developer handoff'],
    pros: ['Best-in-class collaboration', 'Browser-based', 'Strong community', 'Developer-friendly'],
    cons: ['Requires internet connection', 'Can be resource-intensive', 'Learning curve for advanced features'],
    pricing: 'Free plan available, paid plans start at $12/month',
    rating: 4.8,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'balsamiq',
    name: 'Balsamiq',
    description: 'Rapid wireframing tool that reproduces the experience of sketching on a notepad or whiteboard.',
    shortDescription: 'Quick and easy wireframing tool',
    category: 'design-prototyping',
    type: 'paid',
    complexity: 'beginner',
    url: 'https://balsamiq.com',
    isPopular: true,
    tags: ['wireframes', 'mockups', 'sketching', 'low-fidelity', 'prototyping'],
    useCases: ['Quick wireframes', 'Concept validation', 'Low-fi prototypes', 'Idea sketching']
  },
  {
    id: 'canva',
    name: 'Canva',
    description: 'Design anything. Publish anywhere. Create beautiful designs with your team.',
    shortDescription: 'Easy graphic design for presentations and marketing',
    category: 'design-prototyping',
    type: 'freemium',
    complexity: 'beginner',
    url: 'https://canva.com',
    isPopular: true,
    tags: ['graphic-design', 'presentations', 'templates', 'marketing', 'social-media'],
    useCases: ['Presentations', 'Marketing materials', 'Social media graphics', 'Infographics'],
    features: ['Drag-and-drop editor', 'Template library', 'Stock photos', 'Brand kit'],
    pros: ['Very easy to use', 'Great templates', 'Good free plan', 'Quick results'],
    cons: ['Limited customization', 'Can look generic', 'Advanced features require subscription'],
    pricing: 'Free plan available, paid plans start at $14.99/month',
    rating: 4.5,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'invision',
    name: 'InVision',
    description: 'Digital product design platform powering the world\'s best user experiences.',
    shortDescription: 'Design collaboration and prototyping platform',
    category: 'design-prototyping',
    type: 'freemium',
    complexity: 'intermediate',
    url: 'https://invisionapp.com',
    isPopular: false,
    tags: ['prototyping', 'collaboration', 'design-handoff', 'feedback', 'user-testing'],
    useCases: ['Interactive prototypes', 'Design collaboration', 'User testing', 'Design handoff']
  },

  // Analysis & Metrics
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    description: 'Measure your advertising ROI as well as track your Flash, video, and social networking sites and applications.',
    shortDescription: 'Free web analytics and reporting platform',
    category: 'analysis-metrics',
    type: 'free',
    complexity: 'intermediate',
    url: 'https://analytics.google.com',
    isPopular: true,
    tags: ['analytics', 'web-analytics', 'reporting', 'metrics', 'conversion-tracking'],
    useCases: ['Website analytics', 'User behavior analysis', 'Conversion tracking', 'Performance monitoring'],
    features: ['Real-time data', 'Custom reports', 'Goal tracking', 'Audience insights'],
    pros: ['Completely free', 'Comprehensive data', 'Industry standard', 'Google ecosystem integration'],
    cons: ['Complex interface', 'Privacy concerns', 'Learning curve', 'Data sampling on free tier'],
    rating: 4.1,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'hotjar',
    name: 'Hotjar',
    description: 'See how visitors are really using your website, collect user feedback and turn more visitors into customers.',
    shortDescription: 'User behavior analytics and feedback tool',
    category: 'analysis-metrics',
    type: 'freemium',
    complexity: 'beginner',
    url: 'https://hotjar.com',
    isPopular: true,
    tags: ['heatmaps', 'user-behavior', 'feedback', 'surveys', 'session-recordings'],
    useCases: ['User behavior analysis', 'UX optimization', 'Feedback collection', 'Conversion optimization'],
    features: ['Heatmaps', 'Session recordings', 'Feedback polls', 'Conversion funnels'],
    pros: ['Visual insights', 'Easy to understand', 'Great for UX research', 'Good free plan'],
    cons: ['Limited data retention on free plan', 'Can impact site performance', 'Privacy considerations'],
    pricing: 'Free plan available, paid plans start at $39/month',
    rating: 4.3,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'amplitude',
    name: 'Amplitude',
    description: 'Digital optimization system that helps you understand user behavior, ship fast, and drive growth.',
    shortDescription: 'Product analytics for user behavior insights',
    category: 'analysis-metrics',
    type: 'freemium',
    complexity: 'advanced',
    url: 'https://amplitude.com',
    isPopular: false,
    tags: ['product-analytics', 'user-behavior', 'cohort-analysis', 'funnels', 'retention'],
    useCases: ['Product analytics', 'User journey analysis', 'Feature adoption tracking', 'Retention analysis']
  },
  {
    id: 'mixpanel',
    name: 'Mixpanel',
    description: 'Product analytics for mobile, web, and smart devices. Analyze user behavior and improve customer engagement.',
    shortDescription: 'Event-based product analytics platform',
    category: 'analysis-metrics',
    type: 'freemium',
    complexity: 'advanced',
    url: 'https://mixpanel.com',
    isPopular: false,
    tags: ['product-analytics', 'event-tracking', 'funnels', 'cohorts', 'a-b-testing'],
    useCases: ['Event tracking', 'Feature usage analysis', 'A/B testing', 'User segmentation']
  },

  // Collaboration & Communication
  {
    id: 'slack',
    name: 'Slack',
    description: 'Where work happens. Transform the way you work with one place for everyone and everything you need to get stuff done.',
    shortDescription: 'Team communication and collaboration platform',
    category: 'collaboration-communication',
    type: 'freemium',
    complexity: 'beginner',
    url: 'https://slack.com',
    isPopular: true,
    tags: ['communication', 'team-chat', 'collaboration', 'integrations', 'workflow'],
    useCases: ['Team communication', 'Project updates', 'File sharing', 'Integration hub'],
    features: ['Channels', 'Direct messaging', 'File sharing', 'App integrations'],
    pros: ['Excellent integrations', 'User-friendly', 'Great search', 'Mobile apps'],
    cons: ['Can be distracting', 'Information overload', 'Free plan limitations'],
    pricing: 'Free plan available, paid plans start at $7.25/month',
    rating: 4.2,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'loom',
    name: 'Loom',
    description: 'Record your screen and camera with one click. Share your video instantly with a link.',
    shortDescription: 'Quick screen and camera recording for communication',
    category: 'collaboration-communication',
    type: 'freemium',
    complexity: 'beginner',
    url: 'https://loom.com',
    isPopular: true,
    tags: ['screen-recording', 'video-communication', 'async-communication', 'feedback'],
    useCases: ['Feature walkthroughs', 'Bug reports', 'Async communication', 'User feedback'],
    features: ['One-click recording', 'Instant sharing', 'Video comments', 'Analytics'],
    pros: ['Super easy to use', 'Great for remote work', 'Instant sharing', 'Good free plan'],
    cons: ['Limited editing features', 'File size restrictions on free plan', 'Requires browser extension'],
    pricing: 'Free plan available, paid plans start at $8/month',
    rating: 4.6,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'typeform',
    name: 'Typeform',
    description: 'Build beautiful, interactive forms to get more responses. Use templates or create from scratch.',
    shortDescription: 'Interactive forms and surveys for data collection',
    category: 'collaboration-communication',
    type: 'freemium',
    complexity: 'beginner',
    url: 'https://typeform.com',
    isPopular: true,
    tags: ['forms', 'surveys', 'data-collection', 'user-research', 'feedback'],
    useCases: ['User research', 'Feedback collection', 'Lead generation', 'Event registration']
  },
  {
    id: 'calendly',
    name: 'Calendly',
    description: 'Calendly helps you schedule meetings without the back-and-forth emails.',
    shortDescription: 'Automated meeting scheduling and calendar management',
    category: 'collaboration-communication',
    type: 'freemium',
    complexity: 'beginner',
    url: 'https://calendly.com',
    isPopular: true,
    tags: ['scheduling', 'calendar', 'meetings', 'automation', 'time-management'],
    useCases: ['User interviews', 'Stakeholder meetings', 'Demo scheduling', 'Team syncs']
  },

  // Development Workflow
  {
    id: 'github',
    name: 'GitHub',
    description: 'The complete developer platform to build, scale, and deliver secure software.',
    shortDescription: 'Code collaboration and project management platform',
    category: 'development-workflow',
    type: 'freemium',
    complexity: 'intermediate',
    url: 'https://github.com',
    isPopular: true,
    tags: ['version-control', 'collaboration', 'project-management', 'code-review', 'ci-cd'],
    useCases: ['Code collaboration', 'Issue tracking', 'Project planning', 'Release management'],
    features: ['Git repositories', 'Issue tracking', 'Project boards', 'Actions CI/CD'],
    pros: ['Industry standard', 'Great collaboration features', 'Strong ecosystem', 'Good free plan'],
    cons: ['Learning curve for Git', 'Can be overwhelming for non-developers', 'Advanced features require paid plans'],
    pricing: 'Free plan available, paid plans start at $4/month',
    rating: 4.7,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'planning-poker',
    name: 'Planning Poker Online',
    description: 'Free online planning poker tool for agile teams. Estimate story points with your team in real-time.',
    shortDescription: 'Free online estimation tool for agile teams',
    category: 'development-workflow',
    type: 'free',
    complexity: 'beginner',
    url: 'https://planningpokeronline.com',
    isPopular: false,
    tags: ['estimation', 'agile', 'scrum', 'story-points', 'team-collaboration'],
    useCases: ['Sprint planning', 'Story estimation', 'Team consensus', 'Agile ceremonies']
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'The issue tracking tool you\'ll enjoy using. Streamline issues, sprints, and product roadmaps.',
    shortDescription: 'Modern issue tracking and project management',
    category: 'development-workflow',
    type: 'paid',
    complexity: 'intermediate',
    url: 'https://linear.app',
    isPopular: true,
    tags: ['issue-tracking', 'project-management', 'sprints', 'roadmaps', 'keyboard-shortcuts'],
    useCases: ['Issue tracking', 'Sprint planning', 'Bug management', 'Feature development'],
    features: ['Fast interface', 'Keyboard shortcuts', 'Git integration', 'Roadmap views'],
    pros: ['Lightning fast', 'Beautiful interface', 'Great developer experience', 'Strong integrations'],
    cons: ['No free plan', 'Less mature than competitors', 'Limited customization'],
    pricing: 'Paid plans start at $8/month',
    rating: 4.8,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'postman',
    name: 'Postman',
    description: 'The collaboration platform for API development. Simplify each step of building an API.',
    shortDescription: 'API development and testing platform',
    category: 'development-workflow',
    type: 'freemium',
    complexity: 'intermediate',
    url: 'https://postman.com',
    isPopular: true,
    tags: ['api-testing', 'api-documentation', 'collaboration', 'automation', 'testing'],
    useCases: ['API testing', 'API documentation', 'Integration testing', 'Team collaboration']
  },

  // Essential Reading
  {
    id: 'lennys-newsletter',
    name: "Lenny's Newsletter",
    description: 'The most popular newsletter for product managers. Weekly insights on product management, growth, and career advice from Lenny Rachitsky.',
    shortDescription: 'Weekly product management insights and career advice',
    category: 'essential-reading',
    type: 'freemium',
    complexity: 'beginner',
    url: 'https://lennysnewsletter.com',
    isPopular: true,
    tags: ['product-management', 'growth', 'career', 'newsletter', 'insights'],
    useCases: ['Product management learning', 'Career development', 'Industry insights', 'Best practices'],
    features: ['Weekly newsletter', 'Deep dives on PM topics', 'Guest interviews', 'Free and paid tiers'],
    pros: ['High-quality content', 'Actionable insights', 'Strong community', 'Great for all PM levels'],
    cons: ['Premium content requires subscription', 'Email format only'],
    pricing: 'Free newsletter available, premium content starts at $10/month',
    rating: 4.9,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'superhuman-newsletter',
    name: 'Superhuman Newsletter',
    description: 'AI and productivity insights delivered weekly. Learn how to leverage AI tools and optimize your workflow for maximum productivity.',
    shortDescription: 'Weekly AI and productivity insights for modern professionals',
    category: 'essential-reading',
    type: 'free',
    complexity: 'beginner',
    url: 'https://superhuman.beehiiv.com',
    isPopular: true,
    tags: ['ai', 'productivity', 'automation', 'newsletter', 'efficiency'],
    useCases: ['AI tool discovery', 'Productivity optimization', 'Workflow automation', 'Tech trends'],
    features: ['Weekly AI updates', 'Tool recommendations', 'Productivity tips', 'Case studies'],
    pros: ['Completely free', 'Practical AI insights', 'Tool recommendations', 'Easy to implement tips'],
    rating: 4.7,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'ai-breakdown',
    name: 'AI Breakdown',
    description: 'Daily AI news and insights. Stay updated with the latest developments in artificial intelligence, from breakthrough research to practical applications.',
    shortDescription: 'Daily AI news and practical applications',
    category: 'essential-reading',
    type: 'freemium',
    complexity: 'intermediate',
    url: 'https://aibreakdown.beehiiv.com',
    isPopular: true,
    tags: ['ai', 'machine-learning', 'technology', 'news', 'research'],
    useCases: ['AI trend monitoring', 'Technology updates', 'Research insights', 'Business applications'],
    features: ['Daily AI news', 'Research summaries', 'Business insights', 'Tool spotlights'],
    pros: ['Daily updates', 'Comprehensive coverage', 'Business-focused', 'Expert analysis'],
    cons: ['Can be overwhelming with daily frequency', 'Premium features behind paywall'],
    pricing: 'Free newsletter available, premium content available',
    rating: 4.6,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'reforge-briefing',
    name: 'Reforge Briefing',
    description: 'Weekly insights on growth, product, and marketing from Reforge. Learn from experts at top tech companies about scaling products and teams.',
    shortDescription: 'Weekly growth and product insights from tech experts',
    category: 'essential-reading',
    type: 'free',
    complexity: 'intermediate',
    url: 'https://reforge.com/briefing',
    isPopular: true,
    tags: ['growth', 'product-management', 'marketing', 'scaling', 'strategy'],
    useCases: ['Growth strategy', 'Product scaling', 'Marketing insights', 'Team building'],
    features: ['Expert insights', 'Case studies', 'Framework deep-dives', 'Industry trends'],
    pros: ['High-quality content', 'Expert contributors', 'Actionable frameworks', 'Free access'],
    cons: ['Advanced topics may be overwhelming for beginners'],
    rating: 4.8,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'first-round-review',
    name: 'First Round Review',
    description: 'In-depth articles on building and scaling startups. Tactical advice from successful founders, operators, and investors.',
    shortDescription: 'Tactical startup and leadership advice from industry experts',
    category: 'essential-reading',
    type: 'free',
    complexity: 'intermediate',
    url: 'https://review.firstround.com',
    isPopular: true,
    tags: ['startups', 'leadership', 'management', 'scaling', 'operations'],
    useCases: ['Leadership development', 'Startup operations', 'Team management', 'Strategic planning'],
    features: ['Long-form articles', 'Expert interviews', 'Tactical frameworks', 'Case studies'],
    pros: ['Extremely high-quality content', 'Tactical and actionable', 'Free access', 'Diverse topics'],
    rating: 4.9,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'julie-zhuo-blog',
    name: "Julie Zhuo's Blog",
    description: 'Insights on product design, management, and leadership from the former VP of Product Design at Facebook. Thoughtful perspectives on building great products.',
    shortDescription: 'Product design and leadership insights from former Facebook VP',
    category: 'essential-reading',
    type: 'free',
    complexity: 'intermediate',
    url: 'https://medium.com/@joulee',
    isPopular: true,
    tags: ['product-design', 'leadership', 'management', 'facebook', 'meta'],
    useCases: ['Design leadership', 'Product strategy', 'Team management', 'Career growth'],
    features: ['Personal insights', 'Leadership lessons', 'Design thinking', 'Management advice'],
    pros: ['Real experience from top company', 'Thoughtful and nuanced', 'Free access', 'Regular updates'],
    rating: 4.7,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'ken-norton-newsletter',
    name: 'Ken Norton Newsletter',
    description: 'Product management insights from a partner at Google Ventures. Learn from someone who built products at Google and now invests in product teams.',
    shortDescription: 'Product management insights from Google Ventures partner',
    category: 'essential-reading',
    type: 'free',
    complexity: 'intermediate',
    url: 'https://newsletter.bringthedonuts.com',
    isPopular: true,
    tags: ['product-management', 'google', 'venture-capital', 'strategy', 'leadership'],
    useCases: ['Product strategy', 'PM career development', 'Team building', 'Investment insights'],
    features: ['PM frameworks', 'Career advice', 'Industry insights', 'Investment perspective'],
    pros: ['Google/GV experience', 'Practical frameworks', 'Free content', 'Dual perspective (PM + VC)'],
    rating: 4.8,
    lastUpdated: '2024-12-01'
  },

  // Additional Essential Tools for Use Cases
  {
    id: 'airtable',
    name: 'Airtable',
    description: 'Organize anything with the power of a database and the simplicity of a spreadsheet. Perfect for product backlogs, user research, and project tracking.',
    shortDescription: 'Database-spreadsheet hybrid for organizing product data',
    category: 'documentation-requirements',
    type: 'freemium',
    complexity: 'intermediate',
    url: 'https://airtable.com',
    isPopular: true,
    tags: ['database', 'spreadsheet', 'organization', 'collaboration', 'project-management'],
    useCases: ['Manage product backlog', 'Track project progress', 'Analyze competitors', 'Document requirements'],
    features: ['Database functionality', 'Multiple views', 'Real-time collaboration', 'API integration'],
    pros: ['Powerful yet simple', 'Great templates', 'Excellent collaboration', 'Mobile app'],
    cons: ['Can be complex for simple needs', 'Pricing scales quickly'],
    pricing: 'Free plan available, paid plans start at $10/month',
    rating: 4.6,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'jira',
    name: 'Jira',
    description: 'Industry-standard project management and issue tracking for agile teams. Plan, track, and manage software development projects.',
    shortDescription: 'Professional project management for agile development',
    category: 'development-workflow',
    type: 'freemium',
    complexity: 'advanced',
    url: 'https://atlassian.com/jira',
    isPopular: true,
    tags: ['project-management', 'agile', 'scrum', 'issue-tracking', 'software-development'],
    useCases: ['Plan sprints', 'Track project progress', 'Manage product backlog', 'Estimate story points'],
    features: ['Agile workflows', 'Custom fields', 'Advanced reporting', 'Integrations'],
    pros: ['Industry standard', 'Highly customizable', 'Powerful reporting', 'Enterprise-ready'],
    cons: ['Complex setup', 'Can be overwhelming', 'Expensive for large teams'],
    pricing: 'Free for small teams, paid plans start at $7.75/month',
    rating: 4.2,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'The issue tracking tool you\'ll enjoy using. Built for high-performance teams. Fast, focused, and beautifully designed.',
    shortDescription: 'Modern, fast issue tracking for product teams',
    category: 'development-workflow',
    type: 'freemium',
    complexity: 'intermediate',
    url: 'https://linear.app',
    isPopular: true,
    tags: ['project-management', 'issue-tracking', 'product-management', 'agile', 'modern'],
    useCases: ['Plan sprints', 'Track project progress', 'Manage product backlog', 'Build product roadmaps'],
    features: ['Lightning fast', 'Keyboard shortcuts', 'Git integration', 'Roadmap planning'],
    pros: ['Extremely fast', 'Beautiful design', 'Great keyboard shortcuts', 'Modern workflow'],
    cons: ['Less customization than Jira', 'Newer platform'],
    pricing: 'Free for small teams, paid plans start at $8/month',
    rating: 4.8,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'calendly',
    name: 'Calendly',
    description: 'Scheduling made simple. Eliminate the back-and-forth emails for finding time. Connect your calendar and let others book time with you.',
    shortDescription: 'Simple scheduling and calendar booking tool',
    category: 'collaboration-communication',
    type: 'freemium',
    complexity: 'beginner',
    url: 'https://calendly.com',
    isPopular: true,
    tags: ['scheduling', 'calendar', 'meetings', 'automation', 'productivity'],
    useCases: ['Conduct user research', 'Collect user feedback', 'Collaborate with team'],
    features: ['Calendar integration', 'Automated scheduling', 'Meeting preferences', 'Team scheduling'],
    pros: ['Super simple to use', 'Great automation', 'Professional appearance', 'Good integrations'],
    cons: ['Limited customization on free plan', 'Can feel impersonal'],
    pricing: 'Free plan available, paid plans start at $8/month',
    rating: 4.7,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'planning-poker',
    name: 'Planning Poker Online',
    description: 'Free online estimation tool for agile teams. Estimate story points collaboratively with your team using the planning poker technique.',
    shortDescription: 'Online tool for agile story point estimation',
    category: 'development-workflow',
    type: 'free',
    complexity: 'beginner',
    url: 'https://planningpoker.com',
    isPopular: false,
    tags: ['agile', 'estimation', 'scrum', 'planning-poker', 'story-points'],
    useCases: ['Estimate story points', 'Plan sprints'],
    features: ['Real-time collaboration', 'Multiple estimation scales', 'Team management', 'History tracking'],
    pros: ['Completely free', 'Simple to use', 'No registration required', 'Real-time sync'],
    cons: ['Basic features only', 'Limited customization'],
    rating: 4.3,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'The world\'s leading software development platform. Where millions of developers and companies build, ship, and maintain their software.',
    shortDescription: 'Code repository and collaboration platform',
    category: 'development-workflow',
    type: 'freemium',
    complexity: 'intermediate',
    url: 'https://github.com',
    isPopular: true,
    tags: ['code-repository', 'version-control', 'collaboration', 'development', 'git'],
    useCases: ['Track project progress', 'Plan sprints', 'Manage product backlog', 'Build product roadmaps'],
    features: ['Git repositories', 'Issue tracking', 'Project boards', 'Code review'],
    pros: ['Industry standard', 'Excellent collaboration', 'Free for public repos', 'Great integrations'],
    cons: ['Learning curve for non-developers', 'Can be complex'],
    pricing: 'Free for public repositories, paid plans start at $4/month',
    rating: 4.8,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'usabilityhub',
    name: 'UsabilityHub',
    description: 'Remote user research platform. Get feedback on designs and prototypes from real users. Run first click tests, preference tests, and more.',
    shortDescription: 'Remote user testing and research platform',
    category: 'analysis-metrics',
    type: 'freemium',
    complexity: 'intermediate',
    url: 'https://usabilityhub.com',
    isPopular: false,
    tags: ['user-testing', 'user-research', 'feedback', 'usability', 'remote-testing'],
    useCases: ['Conduct user research', 'Collect user feedback', 'Analyze user behavior'],
    features: ['First click tests', 'Preference tests', 'Five second tests', 'User panel'],
    pros: ['Easy to set up tests', 'Quality user panel', 'Good test variety', 'Clear results'],
    cons: ['Limited free tier', 'Can be expensive for frequent testing'],
    pricing: 'Free plan available, paid plans start at $89/month',
    rating: 4.4,
    lastUpdated: '2024-12-01'
  },
  {
    id: 'the-beautiful-mess',
    name: 'The Beautiful Mess',
    description: 'John Cutler\'s insights on product management, systems thinking, and continuous improvement. Focus on the messy realities of product work.',
    shortDescription: 'Real-world product management and systems thinking insights',
    category: 'essential-reading',
    type: 'free',
    complexity: 'intermediate',
    url: 'https://cutlefish.substack.com',
    isPopular: true,
    tags: ['product-management', 'systems-thinking', 'continuous-improvement', 'reality'],
    useCases: ['Systems thinking', 'Product operations', 'Team dynamics', 'Process improvement'],
    features: ['Systems perspective', 'Real-world examples', 'Process insights', 'Team dynamics'],
    pros: ['Honest and realistic', 'Systems thinking approach', 'Free content', 'Frequent updates'],
    rating: 4.6,
    lastUpdated: '2024-12-01'
  }
]

// Popular tools for quick access
export const POPULAR_TOOLS = PM_TOOLS.filter(tool => tool.isPopular)

// Smart tool recommendations based on workflows
export const TOOL_RECOMMENDATIONS: Record<string, string[]> = {
  // Planning & Roadmapping workflow
  'roadmunk': ['figma', 'miro', 'confluence', 'jira'],
  'productplan': ['figma', 'amplitude', 'confluence', 'linear'],
  'milanote': ['figma', 'canva', 'notion'],
  'gantt-project': ['github', 'linear', 'notion'],

  // Design & Prototyping workflow  
  'figma': ['miro', 'notion', 'loom', 'github'],
  'balsamiq': ['figma', 'miro', 'notion'],
  'canva': ['figma', 'notion', 'loom'],
  'invision': ['figma', 'miro', 'hotjar'],

  // Diagramming & Visualization workflow
  'draw-io': ['notion', 'confluence', 'github'],
  'lucidchart': ['figma', 'miro', 'confluence'],
  'whimsical': ['figma', 'notion', 'miro'],
  'miro': ['figma', 'notion', 'loom', 'typeform'],
  'excalidraw': ['figma', 'notion', 'github'],

  // Documentation & Requirements workflow
  'notion': ['figma', 'miro', 'loom', 'typeform'],
  'confluence': ['jira', 'figma', 'loom'],
  'gitbook': ['github', 'figma', 'postman'],
  'obsidian': ['notion', 'miro'],

  // Analysis & Metrics workflow
  'google-analytics': ['hotjar', 'typeform', 'amplitude'],
  'hotjar': ['google-analytics', 'typeform', 'figma'],
  'amplitude': ['hotjar', 'mixpanel', 'linear'],
  'mixpanel': ['amplitude', 'hotjar', 'linear'],

  // Collaboration & Communication workflow
  'slack': ['loom', 'calendly', 'github', 'linear'],
  'loom': ['slack', 'notion', 'figma'],
  'typeform': ['notion', 'hotjar', 'calendly'],
  'calendly': ['slack', 'typeform', 'loom'],

  // Development Workflow
  'github': ['linear', 'figma', 'postman', 'slack'],
  'linear': ['github', 'figma', 'slack'],
  'postman': ['github', 'notion', 'linear'],
  'planning-poker': ['linear', 'github', 'slack']
}

export const getToolRecommendations = (toolId: string): PMTool[] => {
  const recommendedIds = TOOL_RECOMMENDATIONS[toolId] || []
  return recommendedIds
    .map(id => PM_TOOLS.find(tool => tool.id === id))
    .filter((tool): tool is PMTool => tool !== undefined)
    .slice(0, 4) // Max 4 recommendations
}

// Enhanced use cases with smart tool mappings
export const USE_CASE_MAPPINGS: Record<string, {
  label: string;
  description: string;
  primaryTools: string[];
  supportingTools: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
}> = {
  'create-user-flows': {
    label: 'Create user flows',
    description: 'Design and visualize user journeys through your product',
    primaryTools: ['whimsical', 'draw-io', 'lucidchart', 'miro'],
    supportingTools: ['figma', 'excalidraw', 'eraser-io'],
    difficulty: 'intermediate',
    category: 'design'
  },
  'build-product-roadmaps': {
    label: 'Build product roadmaps',
    description: 'Create strategic product plans and timelines',
    primaryTools: ['roadmunk', 'productplan', 'notion', 'linear'],
    supportingTools: ['miro', 'confluence', 'airtable', 'github'],
    difficulty: 'intermediate',
    category: 'planning'
  },
  'design-wireframes': {
    label: 'Design wireframes',
    description: 'Create low-fidelity mockups and interface designs',
    primaryTools: ['figma', 'balsamiq', 'whimsical', 'canva'],
    supportingTools: ['storyset', 'invision', 'marvel-app'],
    difficulty: 'beginner',
    category: 'design'
  },
  'collect-user-feedback': {
    label: 'Collect user feedback',
    description: 'Gather insights and opinions from your users',
    primaryTools: ['typeform', 'hotjar', 'usabilityhub', 'calendly'],
    supportingTools: ['google-analytics', 'loom', 'slack'],
    difficulty: 'beginner',
    category: 'research'
  },
  'document-requirements': {
    label: 'Document requirements',
    description: 'Write and organize product specifications and requirements',
    primaryTools: ['notion', 'confluence', 'gitbook', 'obsidian'],
    supportingTools: ['miro', 'figma', 'airtable'],
    difficulty: 'intermediate',
    category: 'documentation'
  },
  'analyze-user-behavior': {
    label: 'Analyze user behavior',
    description: 'Study how users interact with your product',
    primaryTools: ['google-analytics', 'hotjar', 'amplitude', 'mixpanel'],
    supportingTools: ['typeform', 'usabilityhub', 'calendly'],
    difficulty: 'advanced',
    category: 'analytics'
  },
  'plan-sprints': {
    label: 'Plan sprints',
    description: 'Organize and schedule development work',
    primaryTools: ['linear', 'jira', 'github', 'planning-poker'],
    supportingTools: ['notion', 'confluence', 'slack'],
    difficulty: 'intermediate',
    category: 'development'
  },
  'create-presentations': {
    label: 'Create presentations',
    description: 'Build compelling slides and visual presentations',
    primaryTools: ['canva', 'figma', 'gamma-app', 'beautiful-ai'],
    supportingTools: ['storyset', 'loom', 'notion'],
    difficulty: 'beginner',
    category: 'communication'
  },
  'map-user-journeys': {
    label: 'Map user journeys',
    description: 'Visualize complete user experience paths',
    primaryTools: ['miro', 'whimsical', 'lucidchart', 'figma'],
    supportingTools: ['hotjar', 'draw-io', 'notion'],
    difficulty: 'intermediate',
    category: 'design'
  },
  'estimate-story-points': {
    label: 'Estimate story points',
    description: 'Estimate development effort and complexity',
    primaryTools: ['planning-poker', 'linear', 'jira', 'scrum-poker-online'],
    supportingTools: ['slack', 'github', 'notion'],
    difficulty: 'intermediate',
    category: 'development'
  },
  'track-project-progress': {
    label: 'Track project progress',
    description: 'Monitor and report on project status and milestones',
    primaryTools: ['linear', 'notion', 'airtable', 'github'],
    supportingTools: ['gantt-project', 'jira', 'slack'],
    difficulty: 'beginner',
    category: 'management'
  },
  'collaborate-with-team': {
    label: 'Collaborate with team',
    description: 'Work together efficiently with remote and in-person teams',
    primaryTools: ['slack', 'miro', 'loom', 'calendly'],
    supportingTools: ['notion', 'figma', 'typeform'],
    difficulty: 'beginner',
    category: 'communication'
  },
  'prototype-interactions': {
    label: 'Prototype interactions',
    description: 'Create interactive mockups and test user flows',
    primaryTools: ['figma', 'invision', 'marvel-app', 'protopie'],
    supportingTools: ['whimsical', 'loom', 'usabilityhub'],
    difficulty: 'intermediate',
    category: 'design'
  },
  'conduct-user-research': {
    label: 'Conduct user research',
    description: 'Plan and execute user interviews and usability tests',
    primaryTools: ['calendly', 'loom', 'typeform', 'usabilityhub'],
    supportingTools: ['hotjar', 'notion', 'miro'],
    difficulty: 'intermediate',
    category: 'research'
  },
  'manage-product-backlog': {
    label: 'Manage product backlog',
    description: 'Prioritize and organize product features and improvements',
    primaryTools: ['linear', 'notion', 'airtable', 'productplan'],
    supportingTools: ['jira', 'github', 'confluence'],
    difficulty: 'intermediate',
    category: 'management'
  },
  'design-system-architecture': {
    label: 'Design system architecture',
    description: 'Plan technical system structure and components',
    primaryTools: ['draw-io', 'lucidchart', 'eraser-io', 'whimsical'],
    supportingTools: ['figma', 'notion', 'confluence'],
    difficulty: 'advanced',
    category: 'technical'
  },
  'create-mockups': {
    label: 'Create mockups',
    description: 'Design high-fidelity visual representations of interfaces',
    primaryTools: ['figma', 'canva', 'balsamiq', 'marvel-app'],
    supportingTools: ['storyset', 'invision', 'loom'],
    difficulty: 'intermediate',
    category: 'design'
  },
  'analyze-competitors': {
    label: 'Analyze competitors',
    description: 'Research and compare competitive products and strategies',
    primaryTools: ['notion', 'airtable', 'miro', 'confluence'],
    supportingTools: ['google-analytics', 'hotjar', 'loom'],
    difficulty: 'intermediate',
    category: 'strategy'
  }
}

// Generate the dropdown list from use case mappings
export const COMMON_USE_CASES = Object.values(USE_CASE_MAPPINGS).map(mapping => mapping.label)

// Helper functions
export const getToolsByCategory = (category: PMToolCategory): PMTool[] => {
  return PM_TOOLS.filter(tool => tool.category === category)
}

export const getCategoryInfo = (categoryId: PMToolCategory): PMToolCategory_Info | undefined => {
  return PM_TOOL_CATEGORIES.find(cat => cat.id === categoryId)
}

export const searchTools = (query: string): PMTool[] => {
  const lowercaseQuery = query.toLowerCase()
  return PM_TOOLS.filter(tool => 
    tool.name.toLowerCase().includes(lowercaseQuery) ||
    tool.description.toLowerCase().includes(lowercaseQuery) ||
    tool.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
    tool.useCases.some(useCase => useCase.toLowerCase().includes(lowercaseQuery))
  )
}

// Get tools by use case with smart ranking
export const getToolsByUseCase = (useCase: string): {
  primary: PMTool[];
  supporting: PMTool[];
  metadata: {
    description: string;
    difficulty: string;
    category: string;
  };
} => {
  // Find the use case mapping
  const useCaseKey = Object.keys(USE_CASE_MAPPINGS).find(
    key => USE_CASE_MAPPINGS[key].label.toLowerCase() === useCase.toLowerCase()
  )
  
  if (!useCaseKey) {
    // Fallback to search if no specific mapping found
    const searchResults = searchTools(useCase)
    return {
      primary: searchResults.slice(0, 4),
      supporting: searchResults.slice(4, 8),
      metadata: {
        description: `Tools related to "${useCase}"`,
        difficulty: 'intermediate',
        category: 'general'
      }
    }
  }
  
  const mapping = USE_CASE_MAPPINGS[useCaseKey]
  
  // Get primary tools
  const primaryTools = mapping.primaryTools
    .map(id => PM_TOOLS.find(tool => tool.id === id))
    .filter((tool): tool is PMTool => tool !== undefined)
    .sort((a, b) => {
      // Prioritize by popularity, then by rating
      if (a.isPopular && !b.isPopular) return -1
      if (!a.isPopular && b.isPopular) return 1
      return (b.rating || 0) - (a.rating || 0)
    })
  
  // Get supporting tools
  const supportingTools = mapping.supportingTools
    .map(id => PM_TOOLS.find(tool => tool.id === id))
    .filter((tool): tool is PMTool => tool !== undefined)
    .filter(tool => !primaryTools.includes(tool)) // Don't duplicate
    .sort((a, b) => {
      // Prioritize by popularity, then by rating
      if (a.isPopular && !b.isPopular) return -1
      if (!a.isPopular && b.isPopular) return 1
      return (b.rating || 0) - (a.rating || 0)
    })
  
  return {
    primary: primaryTools,
    supporting: supportingTools,
    metadata: {
      description: mapping.description,
      difficulty: mapping.difficulty,
      category: mapping.category
    }
  }
}

// Get use case suggestions based on current tools
export const getUseCaseSuggestions = (toolIds: string[]): string[] => {
  const suggestions = new Set<string>()
  
  toolIds.forEach(toolId => {
    Object.entries(USE_CASE_MAPPINGS).forEach(([key, mapping]) => {
      if (mapping.primaryTools.includes(toolId) || mapping.supportingTools.includes(toolId)) {
        suggestions.add(mapping.label)
      }
    })
  })
  
  return Array.from(suggestions).slice(0, 6) // Return top 6 suggestions
}