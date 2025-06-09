# AI Model Configuration Guide

## Overview

The Jira AI Content Generator supports two AI providers:
- **OpenAI GPT-4** (GPT-4o - latest model)
- **Anthropic Claude** (Claude 3.5 Sonnet)

## Quick Setup

1. **Create a `.env.local` file** in the project root
2. **Add your API keys** (you need at least one):

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic Configuration  
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

3. **Restart the development server**:
```bash
npm run dev
```

## Getting API Keys

### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key and add it to your `.env.local` file

### Anthropic API Key
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign in or create an account
3. Navigate to "API Keys" section
4. Create a new API key
5. Copy the key and add it to your `.env.local` file

## Model Selection

The application provides three options:

### 🤖 Auto (Recommended)
- Automatically selects the best available model
- Falls back gracefully if one provider fails
- Uses OpenAI if both are configured

### 🧠 OpenAI GPT-4
- Uses GPT-4o (latest GPT-4 model)
- Excellent for structured content generation
- Great for technical documentation

### 🎭 Anthropic Claude
- Uses Claude 3.5 Sonnet
- Excellent for creative and nuanced content
- Strong reasoning capabilities

## Fallback Behavior

The application is designed to be resilient:

1. **No API Keys**: Uses high-quality mock content
2. **Selected Model Unavailable**: Falls back to available model
3. **API Error**: Falls back to mock content with error notification
4. **Rate Limits**: Automatic retry with exponential backoff

## Cost Considerations

Both providers charge per token usage:

- **OpenAI GPT-4o**: ~$0.005 per 1K tokens
- **Anthropic Claude 3.5**: ~$0.003 per 1K tokens

Typical usage per generation:
- **Story**: ~500-800 tokens ($0.002-0.004)
- **Epic**: ~800-1200 tokens ($0.004-0.006)  
- **Initiative**: ~1000-1500 tokens ($0.005-0.008)

## Environment Variables

```bash
# Required for AI generation
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Default model preference
DEFAULT_AI_MODEL=openai  # or 'anthropic'

# Optional: Custom model settings
AI_TEMPERATURE=0.7       # Creativity level (0.0-1.0)
AI_MAX_TOKENS=2000       # Maximum response length
```

## Troubleshooting

### "No AI providers configured"
- Check that your `.env.local` file exists
- Verify API keys are correctly formatted
- Restart the development server

### "AI generation failed"
- Check your API key is valid and has credits
- Verify network connectivity
- Check the browser console for detailed errors

### Mock content instead of AI
- Ensure at least one API key is configured
- Check the model indicator in generated content
- Look for configuration messages in server logs

## Security Notes

- Never commit API keys to version control
- Use `.env.local` for local development
- Use environment variables in production
- Rotate API keys regularly
- Monitor usage and set billing alerts 