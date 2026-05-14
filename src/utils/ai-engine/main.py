#!/usr/bin/env python3
"""
SRE AgenticOps Intelligence Dashboard - Python AI Engine
High-Performance ML Backend for Predictive Analytics & Anomaly Detection
"""

import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import logging

from ml_models import MLModels
from api_routes import create_routes

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global ML models instance
ml_models = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown"""
    global ml_models
    logger.info("🚀 AI Engine starting up...")
    ml_models = MLModels()
    logger.info("✅ ML models initialized")
    yield
    logger.info("🛑 AI Engine shutting down...")

# Create FastAPI app
app = FastAPI(
    title="SRE AgenticOps AI Engine",
    description="High-performance ML backend for predictive analytics",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware for Node.js frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app = create_routes(app, ml_models)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "sre-agenticops-ai-engine",
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "SRE AgenticOps AI Engine",
        "endpoints": {
            "health": "/health",
            "ml_forecast": "/api/ml/forecast",
            "ml_anomaly": "/api/ml/anomaly-detection",
            "ml_risk": "/api/ml/risk-assessment",
            "ml_nlp": "/api/ml/nlp-analysis"
        }
    }

if __name__ == "__main__":
    port = int(os.getenv("AI_ENGINE_PORT", 5001))
    logger.info(f"Starting AI Engine on port {port}...")
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    )
