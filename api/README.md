---
title: Groundwater Backend
emoji: 💧
colorFrom: blue
colorTo: green
sdk: docker
pinned: false
app_port: 7860
---

# Groundwater ML Platform Backend

This is the backend API for the Groundwater Quality Forecasting System.

## Features
- **FastAPI** based REST API.
- **ML Inference**: Uses Scikit-Learn/XGBoost models for water quality prediction.
- **Forecasting**: Serves pre-calculated future trends (2025-2030).
- **Dockerized**: specific for Hugging Face Spaces.

## endpoints
- `GET /` : Health check
- `POST /api/predict` : ML Inference
- `GET /api/forecast/{district}` : Future trends
