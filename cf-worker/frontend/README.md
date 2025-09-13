This folder is a lightweight copy of the Infflow frontend used for testing with the Cloudflare Worker.

It contains a minimal React app that calls the Worker `/api/describe` endpoint and renders Mermaid diagrams client-side. The main, canonical frontend remains in `Infflow-magicpath` and should be used for production builds.

## Features

- **Mermaid Diagrams**: Flowchart, sequence, and radial mindmap visualizations
- **FoamTree Map View**: Interactive topic clustering (requires "foamtree" in query)
- **Deep Dive**: AI-powered exploration of selected diagram elements
- **Export**: Save diagrams as PNG or text content

## FoamTree Integration

The app includes a FoamTree topic map visualization that appears when you include "foamtree" in your search query.

### Usage

1. **Enable Map View**: Include "foamtree" in your search query
   ```
   "machine learning foamtree"
   "climate change foamtree overview"
   ```

2. **View Tabs**: 
   - **Flowchart**: Traditional Mermaid flowcharts
   - **Sequence**: Sequence diagrams for comparisons
   - **Map**: FoamTree topic clustering (only available for foamtree queries)
   - **Text**: Textual content and summaries

3. **Map Interactions**:
   - **Click**: Select clusters to view their items
   - **Double-click**: Expose cluster for breadcrumb navigation
   - **Esc**: Reset view to initial state
   - **Resize**: Automatically adjusts to container changes

### Installation

```powershell
cd cf-worker/frontend
npm install
```

### Dependencies

- `@carrotsearch/foamtree`: Free version for topic clustering
- `mermaid`: Diagram rendering
- `react`: UI framework
- `framer-motion`: Animations

### Known Limitations

1. **Container Sizing**: FoamTree requires a non-zero container size. Ensure the Map view has adequate height (minimum 400px).

2. **Free Version Branding**: The free FoamTree build shows "Carrot Search" branding. To remove branding, set the `FOAMTREE_LICENSE_URL` environment variable and use a licensed build.

3. **Performance**: Large datasets (>100 clusters) may impact performance. Consider lazy loading for deep hierarchies.

4. **Browser Compatibility**: Requires modern browsers with ResizeObserver support.

### Development

To run the development server:

```powershell
npm run dev
```

To build for production:

```powershell
npm run build
```

Note: The build script here is a placeholder. For full UI builds, continue using the main `Infflow-magicpath` project.

### API Endpoints

- `POST /api/describe`: Generate diagrams and cluster data
- `POST /api/deep-dive`: AI-powered diagram exploration  
- `POST /api/cluster`: Lazy load cluster children (for FoamTree)
