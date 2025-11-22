from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from grid_data import GridDataManager

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
    lat: float
    lon: float
    kw_requested: float
    type: str # "consumer" or "producer"

@app.post("/check-feasibility")
def check_feasibility(request: FeasibilityRequest):
    data = grid_manager.get_station_data(request.lat, request.lon, request.kw_requested)
    
    if data is None:
        raise HTTPException(status_code=404, detail="No station found nearby")
        
    return data

@app.get("/stations")
def get_stations():
    return grid_manager.get_all_stations()

@app.get("/")
def read_root():
    return {"message": "Electrify Heilbronn API is running"}
