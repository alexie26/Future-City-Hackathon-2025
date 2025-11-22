from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Electrify Heilbronn API is running"}

def test_check_feasibility_low_voltage():
    # Test with a location near the mock station 01TS0257
    payload = {
        "lat": 49.14269,
        "lon": 9.21088,
        "kw_requested": 50,
        "type": "consumer"
    }
    response = client.post("/check-feasibility", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["nearest_station_id"] == "01TS0257"
    assert data["grid_level"] == "Niederspannung"
    assert data["max_capacity"] == 630.0

def test_check_feasibility_medium_voltage():
    # Test with high kW request, should switch to Umspannwerk
    payload = {
        "lat": 49.14269,
        "lon": 9.21088,
        "kw_requested": 150,
        "type": "consumer"
    }
    response = client.post("/check-feasibility", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["grid_level"] == "Mittelspannung"
    # 15.5 MW * 1000 = 15500 kW
    assert data["max_capacity"] == 15500.0
