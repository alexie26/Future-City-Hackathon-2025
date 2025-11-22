from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import Literal, List, Optional, Dict, Any
import pandas as pd
import math
import logging
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Electrify Heilbronn API")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for dev, restrict in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load station data
stations_df = pd.DataFrame()
try:
    csv_path = os.path.join(os.path.dirname(__file__), 'data', 'tabelle1.csv')
    stations_df = pd.read_csv(csv_path, encoding='utf-8')
    
    # Clean column names
    stations_df.columns = stations_df.columns.str.strip()
    
    # Remove any unnamed columns
    stations_df = stations_df.loc[:, ~stations_df.columns.str.contains('^Unnamed')]
    
    # Ensure we have the required columns
    required_cols = ['Stationsnummer', 'Breitengrad', 'Längengrad']
    if all(col in stations_df.columns for col in required_cols):
        # Remove rows with missing coordinates
        stations_df = stations_df.dropna(subset=['Breitengrad', 'Längengrad'])
        logger.info(f"✅ Loaded {len(stations_df)} stations successfully")
        logger.info(f"Columns: {stations_df.columns.tolist()}")
        logger.info(f"Sample station: {stations_df.iloc[0].to_dict()}")
    else:
        logger.error(f"❌ Missing required columns. Available: {stations_df.columns.tolist()}")
        stations_df = pd.DataFrame()
except Exception as e:
    logger.error(f"❌ Error loading stations: {e}")
    stations_df = pd.DataFrame()

# Initialize Data Manager
from grid_data import GridDataManager
grid_manager = GridDataManager()

# Capacity limits (kW) based on TAB MS regulations
CAPACITY_LIMITS = {
    "NS": 200,      # Low voltage (Niederspannung) - typical limit
    "MS": 1000,     # Medium voltage (Mittelspannung)
    "HS": 5000      # High voltage (Hochspannung)
}

# Safety margins
SAFETY_MARGIN = 0.8  # Use 80% of capacity as "safe" limit

class FeasibilityRequest(BaseModel):
    lat: float = Field(..., ge=48.0, le=50.0, description="Latitude must be between 48 and 50")
    lon: float = Field(..., ge=8.0, le=10.0, description="Longitude must be between 8 and 10")
    kw_requested: float = Field(..., gt=0, le=10000, description="Power must be positive and <= 10000 kW")
    type: Literal["load", "feed_in"] = Field(..., description="Must be 'load' or 'feed_in'")
    technology: str = "Other"
    
    @validator('type')
    def validate_type(cls, v):
        if v not in ['load', 'feed_in']:
            raise ValueError("Type must be either 'load' or 'feed_in'")
        return v

class FeasibilityResponse(BaseModel):
    status: Literal["green", "yellow", "red"]
    message: str
    kw_requested: float
    remaining_safe: float
    station_id: str
    distance_km: float
    recommendation: str
    station_lat: Optional[float] = None
    station_lon: Optional[float] = None
    eco_score: Optional[int] = None
    recommendations: Optional[List[Dict[str, Any]]] = None

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance in km between two coordinates"""
    R = 6371  # Earth radius in km
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

def determine_voltage_level(station_id: str) -> str:
    """Determine voltage level from station ID"""
    if station_id.startswith("01TS") or station_id.startswith("02TS"):
        return "NS"  # Low voltage
    elif station_id.startswith("03TS") or station_id.startswith("04TS"):
        return "MS"  # Medium voltage
    else:
        return "NS"  # Default to low voltage

def calculate_current_load(station_id: str) -> float:
    """
    Simulate current load on transformer
    In production, this would query real-time data
    For demo: random load between 40-70% of capacity
    """
    import random
    voltage_level = determine_voltage_level(station_id)
    max_capacity = CAPACITY_LIMITS[voltage_level]
    return random.uniform(0.4, 0.7) * max_capacity

@app.get("/")
async def root():
    return {
        "message": "Grid Feasibility API", 
        "stations_loaded": len(stations_df),
        "status": "ready" if len(stations_df) > 0 else "error - no stations loaded"
    }

@app.post("/check-feasibility", response_model=FeasibilityResponse)
async def check_feasibility(request: FeasibilityRequest):
    try:
        if stations_df.empty:
            raise HTTPException(
                status_code=500, 
                detail="Station data not loaded. Please check server logs."
            )
        
        logger.info(f"Checking feasibility for: {request.lat}, {request.lon} with {request.kw_requested} kW")
        
        # Use grid_manager to get comprehensive data including recommendations
        grid_data = grid_manager.get_station_data(request.lat, request.lon, request.kw_requested)
        
        if not grid_data:
            raise HTTPException(
                status_code=404,
                detail="No nearby station found for this location"
            )
        
        # Build response from grid_data
        return FeasibilityResponse(
            status=grid_data["traffic_light"],
            message=grid_data["message"],
            kw_requested=request.kw_requested,
            remaining_safe=grid_data.get("remaining_safe", 0),
            station_id=grid_data["nearest_station_id"],
            distance_km=round(grid_data["distance_meters"] / 1000, 2),
            recommendation=grid_data.get("message", ""),
            station_lat=grid_data.get("station_lat"),
            station_lon=grid_data.get("station_lon"),
            eco_score=grid_data.get("eco_score"),
            recommendations=grid_data.get("recommendations", [])
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error processing request: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail={
                "error": "INTERNAL_ERROR",
                "message": "An unexpected error occurred while processing your request. Please try again."
            }
        )

@app.get("/stations")
def get_stations():
    try:
        stations = grid_manager.get_all_stations()
        logger.info(f"Retrieved {len(stations)} stations")
        return stations
    except Exception as e:
        logger.error(f"Error retrieving stations: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "INTERNAL_ERROR",
                "message": "Failed to retrieve station data"
            }
        )

@app.get("/health")
def health_check():
    try:
        # Check if data is loaded
        stations = grid_manager.get_all_stations()
        return {
            "status": "healthy",
            "stations_loaded": len(stations),
            "data_available": len(stations) > 0
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }

@app.get("/voltage-regions")
async def get_voltage_regions():
    """Return voltage region polygons for map visualization"""
    # Simplified regions for Heilbronn area based on station data
    return {
        "LV": [
            [[49.14, 9.19], [49.14, 9.23], [49.16, 9.23], [49.16, 9.19]],
            [[49.12, 9.19], [49.12, 9.22], [49.13, 9.22], [49.13, 9.19]]
        ],
        "MV": [
            [[49.10, 9.17], [49.10, 9.20], [49.12, 9.20], [49.12, 9.17]]
        ],
        "HV": [
            [[49.08, 9.15], [49.08, 9.18], [49.10, 9.18], [49.10, 9.15]]
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
