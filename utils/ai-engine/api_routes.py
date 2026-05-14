#!/usr/bin/env python3
"""
API Routes for ML operations
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

# Request/Response Models
class ForecastRequest(BaseModel):
    data: List[float]
    periods: int = 30
    method: str = "arima"

class ForecastResponse(BaseModel):
    status: str
    method: str
    predictions: List[float]
    lower_bound: List[float]
    upper_bound: List[float]
    confidence_level: float

class AnomalyRequest(BaseModel):
    data_points: List[Dict[str, float]]

class RiskAssessmentRequest(BaseModel):
    vulnerable: float
    potentially_vulnerable: float
    total: float

class NLPAnalysisRequest(BaseModel):
    text: str

class TrendAnalysisRequest(BaseModel):
    vulnerable_trend: List[float]

class CustomerRiskRequest(BaseModel):
    customer_data: List[Dict[str, Any]]

class FieldNoticeImpactRequest(BaseModel):
    field_notices: List[Dict[str, Any]]

class RemediationVelocityRequest(BaseModel):
    historical_data: List[Dict[str, float]]

class TemporalPatternRequest(BaseModel):
    time_series_data: List[Dict[str, Any]]

class PredictiveIntelligenceRequest(BaseModel):
    metrics: Dict[str, Any]

def create_routes(app: FastAPI, ml_models) -> FastAPI:
    """Create API routes for ML operations"""
    
    @app.post("/api/ml/forecast")
    async def forecast(request: ForecastRequest):
        """
        Generate time series forecast
        
        Supports ARIMA and exponential smoothing methods
        """
        try:
            if request.method == "arima":
                result = ml_models.arima_forecast(request.data, request.periods)
            elif request.method == "exponential_smoothing":
                result = ml_models.exponential_smoothing_forecast(request.data, request.periods)
            else:
                raise HTTPException(status_code=400, detail=f"Unknown method: {request.method}")
            
            return result
        except Exception as e:
            logger.error(f"Forecast error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/api/ml/anomaly-detection")
    async def anomaly_detection(request: AnomalyRequest):
        """
        Detect anomalies in data points
        
        Uses Isolation Forest algorithm
        """
        try:
            result = ml_models.anomaly_detection(request.data_points)
            return result
        except Exception as e:
            logger.error(f"Anomaly detection error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/api/ml/risk-assessment")
    async def risk_assessment(request: RiskAssessmentRequest):
        """
        Predictive risk assessment
        
        Calculates risk score and provides recommendations
        """
        try:
            result = ml_models.risk_assessment(
                request.vulnerable,
                request.potentially_vulnerable,
                request.total
            )
            return result
        except Exception as e:
            logger.error(f"Risk assessment error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/api/ml/nlp-analysis")
    async def nlp_analysis(request: NLPAnalysisRequest):
        """
        NLP analysis of field notice descriptions
        
        Extracts severity, components, and urgency scores
        """
        try:
            result = ml_models.nlp_field_notice_analysis(request.text)
            return result
        except Exception as e:
            logger.error(f"NLP analysis error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/api/ml/batch-forecast")
    async def batch_forecast(requests: List[ForecastRequest]):
        """Batch processing for multiple forecasts"""
        try:
            results = []
            for req in requests:
                if req.method == "arima":
                    result = ml_models.arima_forecast(req.data, req.periods)
                else:
                    result = ml_models.exponential_smoothing_forecast(req.data, req.periods)
                results.append(result)
            return {"status": "success", "results": results}
        except Exception as e:
            logger.error(f"Batch forecast error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/api/ml/vulnerability-trend")
    async def vulnerability_trend(request: TrendAnalysisRequest):
        """Analyze vulnerability trend acceleration and deceleration"""
        try:
            result = ml_models.vulnerability_trend_analysis(request.vulnerable_trend)
            return result
        except Exception as e:
            logger.error(f"Vulnerability trend error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/api/ml/customer-risk-concentration")
    async def customer_risk_concentration(request: CustomerRiskRequest):
        """Analyze customer risk concentration (Pareto analysis)"""
        try:
            result = ml_models.customer_risk_concentration(request.customer_data)
            return result
        except Exception as e:
            logger.error(f"Customer risk concentration error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/api/ml/field-notice-impact")
    async def field_notice_impact(request: FieldNoticeImpactRequest):
        """Analyze field notice impact on asset base"""
        try:
            result = ml_models.field_notice_impact_analysis(request.field_notices)
            return result
        except Exception as e:
            logger.error(f"Field notice impact error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/api/ml/remediation-velocity")
    async def remediation_velocity(request: RemediationVelocityRequest):
        """Calculate remediation velocity and projected clear time"""
        try:
            result = ml_models.remediation_velocity(request.historical_data)
            return result
        except Exception as e:
            logger.error(f"Remediation velocity error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/api/ml/temporal-patterns")
    async def temporal_patterns(request: TemporalPatternRequest):
        """Detect temporal patterns in vulnerability data"""
        try:
            result = ml_models.temporal_pattern_detection(request.time_series_data)
            return result
        except Exception as e:
            logger.error(f"Temporal pattern error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/api/ml/predictive-intelligence")
    async def predictive_intelligence(request: PredictiveIntelligenceRequest):
        """Generate comprehensive predictive intelligence summary"""
        try:
            result = ml_models.predictive_intelligence_summary(request.metrics)
            return result
        except Exception as e:
            logger.error(f"Predictive intelligence error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return app
