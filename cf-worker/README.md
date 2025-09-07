Purpose
-------
This folder contains a Cloudflare Worker that serves a sophisticated React frontend and provides advanced server-side API endpoints for diagram generation. The implementation combines the best of both Infflow-magicpath (UI) and pitext_desktop (backend logic) into a single Cloudflare Workers deployment.

Features
--------
- **Sophisticated UI**: Modern React frontend with Header, Sidebar, Tabs, Filters, and responsive design
- **Advanced Content Generation**: Multi-stage pipeline with content validation and parsing
- **Smart Diagram Types**: Automatic selection between flowchart, radial mindmap, and sequence comparison
- **Robust Mermaid Sanitization**: Advanced cleaning and fixing of LLM-generated Mermaid code
- **Deep Dive Functionality**: Contextual explanations for selected diagram content
- **"Answers, you can See!" Branding**: Under the Infflow label

Architecture
-----------
- `src/entry.ts` - Worker entry point; serves assets and dispatches API routes
- `src/handlers.ts` - API endpoint handlers with sophisticated error handling
- `src/diagram.ts` - Diagram generation pipeline (type selection, content generation, diagram creation)
- `src/content.ts` - Content generation and validation logic
- `src/prompts.ts` - Comprehensive prompt templates for different diagram types
- `src/openai.ts` - OpenAI API client with proper error handling
- `src/utils.ts` - Advanced Mermaid sanitization and utility functions
- `frontend/` - Complete React frontend with sophisticated UI components

API Endpoints
-------------
- `POST /api/describe` - Generate diagrams from text queries
- `POST /api/deep-dive` - Get contextual explanations for selected content

Quick Setup
-----------
1. Build the frontend:

```powershell
cd cf-worker/frontend
npm install
npm run build
```

2. Set up Cloudflare Worker secrets:

```powershell
wrangler secret put OPENAI_API_KEY
```

3. Deploy the worker:

```powershell
wrangler publish
```

Notes
-----
- The Worker uses the sophisticated content generation pipeline from pitext_desktop
- All OpenAI requests are handled server-side for security
- The frontend renders Mermaid diagrams client-side using the mermaid.js library
- Advanced sanitization ensures all generated Mermaid code is valid and renderable
- The UI includes dark mode, responsive design, and modern animations

