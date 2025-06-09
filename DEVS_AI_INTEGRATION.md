# DevS.ai API Integration Guide

## Overview

The Jira AI Content Generator now supports integration with DevS.ai using their REST API. This integration allows users to leverage DevS.ai's diverse AI models for generating Jira work items through a proper API connection.

## How It Works

### 1. API-Based Integration
DevS.ai is integrated using their REST API with proper authentication:

- **API Service**: `DevsAIService` handles REST API communication
- **API Key Management**: Secure local storage of user's API key
- **Chat Completions**: Uses `/api/v1/chats/completions` endpoint
- **Model Selection**: Support for multiple AI models (GPT-4, Claude, etc.)

### 2. User Experience
When users select "DevS.ai (Multiple LLMs)" from the model dropdown:

1. **First Time Setup**: If no API key is configured, a setup dialog appears
2. **API Key Entry**: Users enter their DevS.ai API key with validation
3. **Model Selection**: Choose from available models (GPT-4, Claude, etc.)
4. **Content Generation**: Direct API calls to DevS.ai for content generation
5. **Persistent Storage**: API key is saved locally for future use

### 3. Technical Implementation

#### Components Modified
- **Types** (`src/types/index.ts`): Added 'devs-ai' to AIModel type
- **Main Component** (`src/components/enhanced-work-item-creator.tsx`): Added DevS.ai handling and setup
- **AI Service** (`src/lib/ai-service.ts`): Updated to support DevS.ai provider

#### New Files Created
- **DevS.ai Service** (`src/lib/devs-ai-service.ts`): Handles REST API communication
- **DevS.ai Setup Component** (`src/components/devs-ai-setup.tsx`): API key configuration UI
- **DevS.ai API Route** (`src/app/api/generate-content-devs-ai/route.ts`): Prepares prompts for DevS.ai

## API Integration Details

### Authentication
The integration uses DevS.ai's API key authentication as documented at [DevS.ai API Spec](https://docs.devs.ai/api-spec):

```typescript
headers: {
  'Authorization': `Bearer ${apiKey}`,
  'Content-Type': 'application/json'
}
```

### Chat Completions Endpoint
Uses the `/api/v1/chats/completions` endpoint with the following structure:

```typescript
{
  messages: [
    {
      role: 'system',
      content: 'System prompt for Jira content generation'
    },
    {
      role: 'user', 
      content: 'User's work item description'
    }
  ],
  model: 'gpt-4', // or other selected model
  stream: false
}
```

### Supported Models
The integration supports multiple AI models available through DevS.ai:
- GPT-4
- GPT-4 Turbo
- GPT-3.5 Turbo
- Claude 3 Opus
- Claude 3 Sonnet
- Claude 3 Haiku

## Configuration

### API Key Setup
1. Users get their API key from [DevS.ai Dashboard](https://devs.ai)
2. First-time setup dialog prompts for API key entry
3. API key validation through test request
4. Secure local storage in browser's localStorage

### Model Selection
When DevS.ai is selected and configured:
- Additional dropdown appears for model selection
- Users can choose their preferred AI model
- Model selection is remembered for the session

## Usage

### For Users
1. Select "DevS.ai (Multiple LLMs)" from the AI Model dropdown
2. If first time: Enter API key in the setup dialog
3. Choose your preferred AI model from the DevS.ai Model dropdown
4. Enter your work item description
5. Click "Generate Content" or "Setup DevS.ai API Key" if not configured

### For Developers
The integration provides a clean API for DevS.ai communication:

```typescript
// Initialize with API key
devsAIService.initialize(apiKey)

// Generate content
const content = await devsAIService.generateContent(prompt, model)

// Test API key
const result = await devsAIService.testApiKey(apiKey)
```

## Security & Privacy

### API Key Storage
- API keys are stored locally in browser's localStorage
- Keys are never sent to our servers
- Direct communication between browser and DevS.ai API
- Users can clear their API key anytime

### Data Privacy
- Only user prompts are sent to DevS.ai
- No sensitive application data is transmitted
- Standard HTTPS encryption for all API calls
- Follows DevS.ai's privacy policies

## Error Handling

### API Key Issues
- Invalid API key: Clear error message with setup option
- Expired key: Prompt to re-enter API key
- Network errors: Graceful fallback with retry options

### API Errors
- Rate limiting: Clear user feedback
- Model unavailable: Fallback to default model
- Service errors: Detailed error messages

## Troubleshooting

### API Key Not Working
1. Verify the API key is correct from DevS.ai dashboard
2. Check if the key has proper permissions
3. Ensure network connectivity to devs.ai
4. Try the "Test API Key" button in setup

### Generation Failures
1. Check browser console for detailed error messages
2. Verify the selected model is available
3. Try a different model if current one fails
4. Check DevS.ai service status

### Setup Issues
1. Clear browser localStorage if needed: `localStorage.removeItem('devs-ai-api-key')`
2. Refresh the page and try setup again
3. Ensure popup blockers aren't interfering

## API Reference

### DevsAIService Methods

#### `initialize(apiKey: string): void`
Initializes the service with an API key and saves it locally.

#### `loadSavedApiKey(): string | null`
Loads a previously saved API key from localStorage.

#### `isConfigured(): boolean`
Checks if the service is configured with a valid API key.

#### `generateContent(prompt: string, model?: string): Promise<string>`
Generates content using the specified model (defaults to 'gpt-4').

#### `testApiKey(apiKey: string): Promise<{success: boolean, error?: string}>`
Tests an API key by making a simple request to DevS.ai.

#### `getAvailableModels(): string[]`
Returns a list of available AI models.

#### `clearApiKey(): void`
Removes the stored API key and clears configuration.

## Future Enhancements

1. **Dynamic Model Loading**: Fetch available models from DevS.ai API
2. **Usage Tracking**: Display token usage and costs
3. **Model Comparison**: Side-by-side generation with different models
4. **Advanced Settings**: Temperature, max tokens, and other parameters
5. **Streaming Responses**: Real-time response streaming for better UX

## Support

For issues specific to DevS.ai integration:
1. Check the browser console for error messages
2. Verify API key validity in DevS.ai dashboard
3. Test with different models to isolate issues
4. Contact DevS.ai support for API-specific problems
5. Check [DevS.ai API documentation](https://docs.devs.ai/api-spec) for updates 