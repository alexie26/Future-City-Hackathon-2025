from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator, Field
from grid_data import GridDataManager
import logging

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

# Initialize Data Manager
grid_manager = GridDataManager()

class FeasibilityRequest(BaseModel):
    lat: float = Field(..., ge=48.0, le=50.0, description="Latitude must be between 48 and 50")
    lon: float = Field(..., ge=8.0, le=10.0, description="Longitude must be between 8 and 10")
    kw_requested: float = Field(..., gt=0, le=10000, description="Power must be positive and <= 10000 kW")
    type: str = Field(..., description="Must be 'consumer' or 'producer'")
    
    @validator('type')
    def validate_type(cls, v):
        if v not in ['consumer', 'producer']:
            raise ValueError("Type must be either 'consumer' or 'producer'")
        return v

@app.post("/check-feasibility")
def check_feasibility(request: FeasibilityRequest):
    try:
        logger.info(f"Processing feasibility request: lat={request.lat}, lon={request.lon}, kw={request.kw_requested}, type={request.type}")
        
        data = grid_manager.get_station_data(request.lat, request.lon, request.kw_requested)
        
        if data is None:
            logger.warning(f"No station found for coordinates: {request.lat}, {request.lon}")
            raise HTTPException(
                status_code=404, 
                detail={
                    "error": "NO_STATION_FOUND",
                    "message": "No electrical station found near this location. Please check coordinates or try a different location in Heilbronn.",
                    "lat": request.lat,
                    "lon": request.lon
                }
            )
        
        logger.info(f"Successfully processed request. Station: {data.get('nearest_station_id')}, Status: {data.get('traffic_light')}")
        return data
        
    except ValueError as ve:
        logger.error(f"Validation error: {str(ve)}")
        raise HTTPException(status_code=422, detail={"error": "VALIDATION_ERROR", "message": str(ve)})
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

@app.get("/")
def read_root():
    return {"message": "Electrify Heilbronn API is running", "status": "healthy"}

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
