# CF Worker Deployment Guide

This guide walks you through deploying the enhanced CF Worker with sophisticated UI and backend functionality.

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Wrangler CLI**: Install the Cloudflare Workers CLI
   ```bash
   npm install -g wrangler
   ```
3. **OpenAI API Key**: Get your API key from [platform.openai.com](https://platform.openai.com)

## Setup Steps

### 1. Build the Frontend

First, build the sophisticated React frontend:

```bash
# From the repo root
cd Infflow-magicpath
npm install
npm run build
```

This creates the `dist/` folder that the CF Worker will serve.

### 2. Configure Cloudflare Worker

Navigate to the CF Worker directory:

```bash
cd cf-worker
```

### 3. Set Up Secrets

Set your OpenAI API key as a secret:

```bash
wrangler secret put OPENAI_API_KEY
# Enter your OpenAI API key when prompted
```

### 4. Deploy the Worker

Deploy to Cloudflare:

```bash
wrangler publish
```

### 5. Verify Deployment

After deployment, you'll get a URL like `https://your-worker.your-subdomain.workers.dev`

Visit the URL to see:
- ✅ "Answers, you can See!" branding
- ✅ Sophisticated UI with Header, Sidebar, Tabs
- ✅ Search functionality
- ✅ Diagram generation
- ✅ Dark mode toggle

## Testing the API

You can test the API endpoints directly:

### Test Diagram Generation

```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/api/describe \
  -H "Content-Type: application/json" \
  -d '{"query": "Steps to bake a cake"}'
```

### Test Deep Dive

```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/api/deep-dive \
  -H "Content-Type: application/json" \
  -d '{
    "selected_text": "Mix ingredients",
    "question": "What temperature should I use?",
    "original_query": "Steps to bake a cake"
  }'
```

## Features Included

### Frontend Features
- 🎨 Modern, responsive UI with dark mode
- 🔍 Advanced search interface
- 📊 Real-time diagram rendering
- 🎯 Smart diagram type selection
- 📱 Mobile-friendly design
- ⚡ Smooth animations and transitions

### Backend Features
- 🧠 Multi-stage content generation pipeline
- 🔧 Advanced Mermaid sanitization
- 🎯 Automatic diagram type selection
- 📝 Content validation and parsing
- 🔍 Deep dive explanations
- 🛡️ Robust error handling

### Diagram Types Supported
- **Flowchart**: Sequential processes and decision trees
- **Radial Mindmap**: Concept overviews and characteristics
- **Sequence Comparison**: Comparing multiple items

## Troubleshooting

### Common Issues

1. **Frontend not loading**: Ensure you built the Infflow-magicpath frontend first
2. **API errors**: Check that your OpenAI API key is set correctly
3. **Diagrams not rendering**: Verify the Mermaid sanitization is working

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
wrangler secret put DEBUG true
```

### Local Development

For local development, use:

```bash
wrangler dev
```

This starts a local development server at `http://localhost:8787`

## Performance

The CF Worker is optimized for:
- ⚡ Fast cold starts
- 🚀 Global edge deployment
- 💾 Efficient memory usage
- 🔄 Automatic scaling

## Security

- 🔐 API keys stored as Cloudflare secrets
- 🛡️ Server-side OpenAI requests only
- 🚫 No client-side API key exposure
- ✅ CORS properly configured

## Monitoring

Monitor your deployment in the Cloudflare dashboard:
- Request volume and latency
- Error rates and logs
- Resource usage
- Geographic distribution

## Next Steps

After successful deployment:
1. Set up a custom domain (optional)
2. Configure analytics
3. Set up monitoring alerts
4. Consider rate limiting for production use

---

🎉 **Congratulations!** You now have a sophisticated diagram generation service running on Cloudflare Workers with the "Answers, you can See!" branding under Infflow.
