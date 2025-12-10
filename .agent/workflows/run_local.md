---
description: How to run the Groundwater ML Platform locally
---

# Run Locally

Follow these steps to run both the frontend and backend servers.

## 1. Start the Backend (API)

Open a terminal and run:

```powershell
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
*The API will be available at [http://localhost:8000](http://localhost:8000)*

## 2. Start the Frontend (UI)

Open a **new** terminal window and run:

```powershell
cd frontend
npm install
npm run dev
```
*The UI will be available at [http://localhost:3000](http://localhost:3000)*

## 3. Verify

1.  Open [http://localhost:3000](http://localhost:3000) in your browser.
2.  Go to the **District Page**.
3.  Filter by **Patna** and try the **Subscribe** button.
