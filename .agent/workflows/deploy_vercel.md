---
description: How to deploy the Groundwater ML Platform to Vercel
---

# Deploy to Vercel

Follow these steps to deploy the full stack application (Next.js Frontend + FastAPI Backend) to Vercel.

## 1. Prerequisites

Ensure you have the Vercel CLI installed.

```powershell
npm install -g vercel
```

## 2. Deploy

Run the following command from the root directory:

```powershell
vercel
```

Follow the interactive prompts:
1.  **Set up and deploy?**: `Y`
2.  **Which scope?**: Select your team/account.
3.  **Link to existing project?**: `N` (unless you have one).
4.  **Project Name**: `groundwater-ml-platform` (or your choice).
5.  **In which directory is your code located?**: `./` (default).
6.  **Want to modify these settings?**: `N` (The `vercel.json` handles this).

## 3. Environment Variables

After deployment, you must add your `RESEND_API_KEY` to Vercel.

1.  Go to your Vercel Dashboard.
2.  Select the project.
3.  Go to **Settings** > **Environment Variables**.
4.  Add `RESEND_API_KEY` with your key value.
5.  **Redeploy** for changes to take effect (or run `vercel --prod` locally).

## Troubleshooting

-   **Build Failures**: Check the "Build Logs" on the Vercel dashboard.
-   **Dependencies**: Ensure `backend/requirements.txt` and `frontend/package.json` are up to date.
