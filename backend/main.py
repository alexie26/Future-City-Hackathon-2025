from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import Literal, List, Optional, Dict, Any
import pandas as pd
import math
import logging
import os
import traceback
from datetime import datetime
import google.generativeai as genai
from collections import Counter

# Configure logging with more detail
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('api.log'),
        logging.StreamHandler()
    ]
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

# Load station data with robust error handling
stations_df = pd.DataFrame()
DATA_LOAD_ERROR = None

try:
    csv_path = os.path.join(os.path.dirname(__file__), 'data', 'tabelle1.csv')
    
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Station data file not found at: {csv_path}")
    
    stations_df = pd.read_csv(csv_path, encoding='utf-8')
    
    # Clean column names
    stations_df.columns = stations_df.columns.str.strip()
    
    # Remove any unnamed columns
    stations_df = stations_df.loc[:, ~stations_df.columns.str.contains('^Unnamed')]
    
    # Ensure we have the required columns
    required_cols = ['Stationsnummer', 'Breitengrad', 'Längengrad']
    missing_cols = [col for col in required_cols if col not in stations_df.columns]
    
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}. Available: {stations_df.columns.tolist()}")
    
    # Validate data types and ranges
    initial_count = len(stations_df)
    
    # Remove rows with missing coordinates
    stations_df = stations_df.dropna(subset=['Breitengrad', 'Längengrad'])
    
    # NOTE: Do NOT validate coordinate ranges here as the data uses WGS84 coordinates
    # The grid_data manager handles coordinate validation properly
    # Heilbronn coordinates are approximately: lat=49.14, lon=9.22
    
    removed_count = initial_count - len(stations_df)
    if removed_count > 0:
        logger.warning(f"Removed {removed_count} stations with invalid/missing coordinates")
    
    if len(stations_df) == 0:
        raise ValueError("No valid stations found after filtering")
    
    logger.info(f"✅ Loaded {len(stations_df)} valid stations successfully")
    logger.info(f"Coordinate ranges: lat [{stations_df['Breitengrad'].min():.4f}, {stations_df['Breitengrad'].max():.4f}], lon [{stations_df['Längengrad'].min():.4f}, {stations_df['Längengrad'].max():.4f}]")
    
except FileNotFoundError as e:
    DATA_LOAD_ERROR = str(e)
    logger.error(f"❌ File not found: {e}")
except pd.errors.ParserError as e:
    DATA_LOAD_ERROR = f"CSV parsing error: {str(e)}"
    logger.error(f"❌ CSV parsing failed: {e}")
except ValueError as e:
    DATA_LOAD_ERROR = str(e)
    logger.error(f"❌ Data validation error: {e}")
except Exception as e:
    DATA_LOAD_ERROR = f"Unexpected error loading data: {str(e)}"
    logger.error(f"❌ Unexpected error loading stations: {e}", exc_info=True)

# Initialize Data Manager with error handling
try:
    from grid_data import GridDataManager
    grid_manager = GridDataManager()
    logger.info("✅ Grid manager initialized successfully")
except Exception as e:
    logger.error(f"❌ Failed to initialize grid manager: {e}", exc_info=True)
    grid_manager = None

# In-memory store for anonymous usage events (reset on restart)
usage_events: List[Dict[str, Any]] = []

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
    lang: Literal["en", "de"] = "en"
    
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
    timeline: Optional[str] = None
    next_steps: Optional[str] = None
    grid_level: Optional[str] = None

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
    health_status = {
        "message": "Grid Feasibility API", 
        "stations_loaded": len(stations_df),
        "timestamp": datetime.utcnow().isoformat(),
        "status": "ready" if len(stations_df) > 0 else "error",
        "grid_manager": "initialized" if grid_manager else "error"
    }
    
    if DATA_LOAD_ERROR:
        health_status["error"] = DATA_LOAD_ERROR
        health_status["status"] = "degraded"
    
    return health_status

@app.post("/check-feasibility", response_model=FeasibilityResponse)
async def check_feasibility(request: FeasibilityRequest):
    request_id = datetime.utcnow().timestamp()
    logger.info(f"[{request_id}] Received request: lat={request.lat}, lon={request.lon}, kw={request.kw_requested}, type={request.type}")
    
    try:
        # Validate system readiness
        if not grid_manager:
            logger.error(f"[{request_id}] Grid manager not initialized")
            raise HTTPException(
                status_code=503,
                detail={
                    "error": "SERVICE_UNAVAILABLE",
                    "message": "Grid analysis system unavailable. Please try again later."
                }
            )
        
        # Validate input ranges (Heilbronn area approximately)
        # Heilbronn coordinates: ~49.14°N, ~9.22°E
        if not (49.0 <= request.lat <= 49.3):
            logger.warning(f"[{request_id}] Latitude {request.lat} outside typical Heilbronn area (49.0-49.3)")
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "INVALID_COORDINATES",
                    "message": f"Latitude {request.lat} is outside Heilbronn service area (49.0-49.3)"
                }
            )
        
        if not (9.0 <= request.lon <= 9.5):
            logger.warning(f"[{request_id}] Longitude {request.lon} outside typical Heilbronn area (9.0-9.5)")
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "INVALID_COORDINATES",
                    "message": f"Longitude {request.lon} is outside Heilbronn service area (9.0-9.5)"
                }
            )
        
        logger.info(f"[{request_id}] Requesting grid data from manager")
        
        # Use grid_manager with error handling
        try:
            grid_data = grid_manager.get_station_data(
                request.lat, 
                request.lon, 
                request.kw_requested
            )
        except ValueError as e:
            logger.error(f"[{request_id}] Grid manager validation error: {e}")
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "VALIDATION_ERROR",
                    "message": str(e)
                }
            )
        except Exception as e:
            logger.error(f"[{request_id}] Grid manager error: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "PROCESSING_ERROR",
                    "message": "Failed to analyze grid capacity. Please try again."
                }
            )
        
        if not grid_data:
            logger.warning(f"[{request_id}] No nearby station found")
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "NO_STATION_FOUND",
                    "message": "No nearby grid station found for this location. Please check coordinates."
                }
            )
        
        # Validate grid_data structure
        required_fields = ['traffic_light', 'message', 'nearest_station_id', 'distance_meters']
        missing_fields = [f for f in required_fields if f not in grid_data]
        
        if missing_fields:
            logger.error(f"[{request_id}] Invalid grid_data structure. Missing: {missing_fields}")
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "INVALID_RESPONSE",
                    "message": "Invalid response from grid analysis system"
                }
            )
        
        logger.info(f"[{request_id}] Successfully processed request. Station: {grid_data['nearest_station_id']}, Status: {grid_data['traffic_light']}")
        
        # Build response from grid_data
        response = FeasibilityResponse(
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
            recommendations=grid_data.get("recommendations", []),
            timeline=grid_data.get("timeline"),
            next_steps=grid_data.get("next_steps"),
            grid_level=grid_data.get("grid_level")
        )
        
        return response
    
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"[{request_id}] Validation error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=400,
            detail={
                "error": "VALIDATION_ERROR",
                "message": str(e)
            }
        )
    except Exception as e:
        logger.error(f"[{request_id}] Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "INTERNAL_ERROR",
                "message": "An unexpected error occurred. Please try again or contact support.",
                "request_id": str(request_id)
            }
        )

@app.get("/stations")
def get_stations():
    try:
        if not grid_manager:
            raise HTTPException(
                status_code=503,
                detail={
                    "error": "SERVICE_UNAVAILABLE",
                    "message": "Grid data service unavailable"
                }
            )
        
        stations = grid_manager.get_all_stations()
        
        if not stations or len(stations) == 0:
            logger.warning("No stations returned from grid manager")
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "NO_DATA",
                    "message": "No station data available"
                }
            )
        
        logger.info(f"Retrieved {len(stations)} stations")
        return stations
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving stations: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "INTERNAL_ERROR",
                "message": "Failed to retrieve station data"
            }
        )


@app.get("/insights/summary")
def get_insights_summary():
    """Return anonymous aggregated planning insights from recorded pre-checks."""
    try:
        total = len(usage_events)
        if total == 0:
            return {
                "total_checks": 0,
                "by_traffic_light": {},
                "by_type": {},
                "by_technology": {},
                "by_grid_level": {},
                "top_stations": [],
                "peak_hour_utc": None,
                "peak_day_of_week": None,
            }

        by_traffic_light = Counter(
            e.get("traffic_light") for e in usage_events if e.get("traffic_light")
        )
        by_type = Counter(e.get("type") for e in usage_events if e.get("type"))
        by_technology = Counter(
            e.get("technology") for e in usage_events if e.get("technology")
        )
        by_grid_level = Counter(
            e.get("grid_level") for e in usage_events if e.get("grid_level")
        )

        station_counts = Counter(
            e.get("station_id") for e in usage_events if e.get("station_id")
        )
        top_stations = [
            {"station_id": sid, "checks": count}
            for sid, count in station_counts.most_common(5)
        ]

        hour_counts: Counter = Counter()
        day_counts: Counter = Counter()
        for e in usage_events:
            ts = e.get("timestamp")
            if not ts:
                continue
            try:
                dt = datetime.fromisoformat(ts)
            except ValueError:
                continue
            hour_counts[dt.hour] += 1
            day_counts[dt.weekday()] += 1

        peak_hour = hour_counts.most_common(1)[0][0] if hour_counts else None
        peak_day_index = day_counts.most_common(1)[0][0] if day_counts else None
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        peak_day = day_names[peak_day_index] if peak_day_index is not None else None

        return {
            "total_checks": total,
            "by_traffic_light": dict(by_traffic_light),
            "by_type": dict(by_type),
            "by_technology": dict(by_technology),
            "by_grid_level": dict(by_grid_level),
            "top_stations": top_stations,
            "peak_hour_utc": peak_hour,
            "peak_day_of_week": peak_day,
        }
    except Exception as e:
        logger.error(f"Error building insights summary: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "INTERNAL_ERROR",
                "message": "Failed to build insights summary",
            },
        )

@app.get("/health")
def health_check():
    try:
        health = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "components": {}
        }
        
        # Check station data
        health["components"]["station_data"] = {
            "status": "healthy" if len(stations_df) > 0 else "unhealthy",
            "count": len(stations_df),
            "error": DATA_LOAD_ERROR if DATA_LOAD_ERROR else None
        }
        
        # Check grid manager
        if grid_manager:
            try:
                stations = grid_manager.get_all_stations()
                health["components"]["grid_manager"] = {
                    "status": "healthy" if len(stations) > 0 else "unhealthy",
                    "stations_available": len(stations)
                }
            except Exception as e:
                health["components"]["grid_manager"] = {
                    "status": "unhealthy",
                    "error": str(e)
                }
        else:
            health["components"]["grid_manager"] = {
                "status": "unhealthy",
                "error": "Not initialized"
            }
        
        # Overall status
        all_healthy = all(
            comp["status"] == "healthy" 
            for comp in health["components"].values()
        )
        health["status"] = "healthy" if all_healthy else "degraded"
        
        return health
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}", exc_info=True)
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
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

class ApplicationRequest(BaseModel):
    name: str
    email: str
    phone: str
    address: str
    kw_requested: float
    type: str
    comments: Optional[str] = None

@app.post("/submit-application")
async def submit_application(application: ApplicationRequest):
    # In a real app, this would save to a DB or send an email
    logger.info(f"Received application from {application.name} for {application.kw_requested}kW at {application.address}")
    
    return {
        "status": "success",
        "message": "Application received successfully! We will contact you shortly.",
        "application_id": f"APP-{int(datetime.utcnow().timestamp())}"
    }

# Configure Gemini API
GEMINI_API_KEY = "AIzaSyDbO4lNinj72M0KkyS29wUQeOJly0bG7O4"
genai.configure(api_key=GEMINI_API_KEY)

class ChatMessage(BaseModel):
    message: str
    conversation_history: Optional[List[Dict[str, str]]] = []
    grid_context: Optional[Dict[str, Any]] = None
    lang: Literal["en", "de"] = "en"

@app.post("/chat")
async def chat(chat_request: ChatMessage):
    """
    Chat endpoint powered by Gemini AI
    Provides guidance on grid connection applications
    """
    try:
        # System prompt for the assistant (language-aware)
        if chat_request.lang == "de":
            system_prompt = """Du bist ein intelligenter Assistent für Heilbronns Netzanschluss-Antragssystem.
Deine Rolle ist es, Benutzern zu helfen, den Netzanschlussprozess für ihre elektrischen Installationen zu verstehen und zu navigieren (Solar-PV, E-Auto-Ladegeräte, Wärmepumpen usw.).

Du solltest hilfreiche, genaue Informationen bereitstellen über:
- Schritte und Anforderungen für Netzanschlussanträge
- Zeitplan-Erwartungen für verschiedene Spannungsebenen (Niederspannung, Mittelspannung, Hochspannung)
- Erforderliche Dokumente und technische Spezifikationen
- Kostenschätzungen und Zuschüsse
- NHF (Netz Heilbronn-Franken) Vorschriften
- Technische Anforderungen (TAB, VDE-Normen)
- Nächste Schritte basierend auf ihren Netzprüfungsergebnissen

Halte Antworten prägnant, freundlich und praktisch. Antworte auf Deutsch und erkläre technische Begriffe klar.
Wenn der Benutzer eine Netzprüfung durchgeführt hat, nutze diesen Kontext für personalisierte Anleitung."""
        else:
            system_prompt = """You are an intelligent assistant for Heilbronn's grid connection application system. 
Your role is to help users understand and navigate the grid connection process for their electrical installations (Solar PV, EV Chargers, Heat Pumps, etc.).

You should provide helpful, accurate information about:
- Grid connection application steps and requirements
- Timeline expectations for different voltage levels (Niederspannung, Mittelspannung, Hochspannung)
- Required documents and technical specifications
- Cost estimates and subsidies
- NHF (Netz Heilbronn-Franken) regulations
- Technical requirements (TAB, VDE standards)
- Next steps based on their grid check results

Keep responses concise, friendly, and practical. Use German technical terms when appropriate but explain them clearly. 
If the user has performed a grid check, use that context to provide personalized guidance."""

        # Build context from grid check results if available
        context_info = ""
        if chat_request.grid_context:
            gc = chat_request.grid_context
            context_info = f"""

Current User Context:
- Grid Status: {gc.get('status', 'unknown')}
- Requested Power: {gc.get('kw_requested', 'unknown')} kW
- Voltage Level: {gc.get('grid_level', 'unknown')}
- Distance to Station: {gc.get('distance_km', 'unknown')} km
- Timeline: {gc.get('timeline', 'unknown')}
- Available Capacity: {gc.get('remaining_safe', 'unknown')} kW
- Next Steps: {gc.get('next_steps', 'unknown')}"""

        # Build conversation history
        conversation = []
        for msg in chat_request.conversation_history[-6:]:  # Last 6 messages for context
            conversation.append({
                "role": "user" if msg.get("sender") == "user" else "model",
                "parts": [msg.get("text", "")]
            })
        
        # Add current message
        conversation.append({
            "role": "user",
            "parts": [chat_request.message]
        })

        # Initialize Gemini model
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Create chat with history
        chat_session = model.start_chat(history=conversation[:-1])
        
        # Generate response with context
        full_prompt = system_prompt + context_info + "\n\nUser: " + chat_request.message
        
        response = chat_session.send_message(full_prompt)
        
        return {
            "response": response.text,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "CHAT_ERROR",
                "message": "Failed to process chat message. Please try again."
            }
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
