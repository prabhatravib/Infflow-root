This folder is a lightweight copy of the Infflow frontend used for testing with the Cloudflare Worker.

It contains a minimal React app that calls the Worker `/api/describe` endpoint and renders Mermaid diagrams client-side. The main, canonical frontend remains in `Infflow-magicpath` and should be used for production builds.

To run the lightweight copy (optional):

1. From this folder:

```powershell
cd cf-worker/frontend
npm install
npm run build # placeholder script; see note below
```

Note: The build script here is a placeholder. For full UI builds, continue using the main `Infflow-magicpath` project.
