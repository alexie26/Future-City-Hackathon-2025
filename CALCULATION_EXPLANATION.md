# Grid Capacity Calculation System - Technical Documentation

## Overview
This document explains how the Electrify Heilbronn system calculates grid connection feasibility from CSV data to final results.

---

## Data Sources

### 1. **Kapa Stationen.csv** (Low Voltage Stations - ONS)
Contains capacity data for local transformer stations (Ortsnetzstationen):
- `ONS`: Station identifier
- `Breitengrad`, `Längengrad`: Coordinates (latitude, longitude)
- `Installierte Trafoleistung`: Total installed transformer capacity (kW)
- `PV-Leistung an ONS`: Current solar PV load on station (kW)
- `Übrige Trafokapazität`: Raw remaining capacity
- `Übrige Trafokapazität bei Gleichzeitigkeitsfaktor 0,7`: **Remaining capacity with 0.7 simultaneity factor** (kW) - this is the key value we use

### 2. **Kapa Umspannwerke.csv** (Medium/High Voltage Substations - UW)
Contains capacity data for substations:
- `UW`: Substation identifier
- `Verfügbare Einspeisekapazität in MW`: Available feed-in capacity in MW (for medium/high voltage connections)

### 3. **tabelle1.csv** (Location Data)
Geographic location mapping (not currently used in calculations, but available for future enhancements)

### 4. **tabelle3.csv** (Topology Mapping)
Maps which station (ONS) belongs to which substation (UW):
- `Abgang`: Station ID (ONS)
- `UW`: Parent substation ID

---

## Calculation Flow

### Step 1: User Input Processing
When a user enters:
- **Address**: "Berliner Platz 1, Heilbronn"
- **Connection Type**: Consumer (load) or Producer (feed-in)
- **Power**: 50 kW

The system geocodes the address to coordinates: `lat=49.142, lon=9.211`

### Step 2: Find Nearest Station
```python
def find_nearest_station(self, lat, lon):
```

**Process:**
1. Iterate through all stations in `Kapa Stationen.csv`
2. Calculate distance using geodesic formula (Haversine)
3. Find the station with minimum distance to user location
4. Return: `nearest_station_id`, `station_data`, `coordinates`, `distance`

**Example Result:**
- Nearest Station: `ONS-123`
- Distance: `450 meters`

### Step 3: Determine Voltage Level (NHF Rules)
Based on German grid connection rules (Netzanschlussverordnung):

```python
if kw_requested < 30:
    voltage_level = "Niederspannung (Standard)"  # Low Voltage
elif kw_requested < 135:
    voltage_level = "Niederspannung (High Load)"  # Low Voltage (High)
elif kw_requested < 20000:  # < 20 MW
    voltage_level = "Mittelspannung"  # Medium Voltage
else:
    voltage_level = "Hochspannung"  # High Voltage
```

**Example:** 50 kW → **Niederspannung (High Load)**

### Step 4: Select Capacity Source

#### For Low Voltage (LV): Use ONS Data
```python
max_capacity = station_data['Installierte Trafoleistung']  # e.g., 400 kW
current_load = station_data['PV-Leistung an ONS']  # e.g., 80 kW
remaining_capacity = station_data['Übrige Trafokapazität bei Gleichzeitigkeitsfaktor 0,7']  # e.g., 250 kW
```

#### For Medium/High Voltage (MV/HV): Use UW Data
```python
# Find parent substation from topology
uw_id = topology_df[topology_df['Abgang'] == nearest_station_id]['UW']

# Get UW capacity
uw_capacity_mw = substations_df[substations_df['UW'] == uw_id]['Verfügbare Einspeisekapazität in MW']
remaining_capacity = uw_capacity_mw * 1000  # Convert MW to kW
```

### Step 5: Traffic Light Status Determination

```python
# 10% safety buffer
safe_buffer = remaining_capacity * 0.1

if remaining_capacity < kw_requested:
    # RED: Not enough capacity
    status = "red"
    message = "Grid expansion required"
    timeline = "6-12+ Months"
    
elif voltage_level == "LV" and kw_requested > 30:
    # YELLOW: High load requires technical assessment
    status = "yellow"
    message = "Technical assessment required"
    timeline = "1-3 Months"
    
elif remaining_capacity < (kw_requested + safe_buffer):
    # YELLOW: Capacity tight (within 10% buffer)
    status = "yellow"
    message = "Capacity available but tight"
    timeline = "1-3 Months"
    
else:
    # GREEN: Sufficient capacity
    status = "green"
    message = "Connection feasible"
    timeline = "2-4 Weeks"
```

### Step 6: Generate Recommendations
Based on capacity ratio and grid conditions:

```python
capacity_ratio = remaining_capacity / kw_requested

# Solar PV recommendations
if capacity_ratio > 3:
    → "Ideal for Solar PV Installation"
    
# Battery storage
if status in ["yellow", "red"]:
    → "Battery Storage Recommended" (to reduce grid stress)
    
# EV charging
if capacity_ratio > 2 and kw_requested < 100:
    → "EV Charging Suitable"
    
# Heat pumps
if capacity_ratio > 1.5 and voltage_level == "Niederspannung":
    → "Heat Pump Suitable"
```

### Step 7: Calculate Eco-Score (0-100)

```python
# Base score from capacity availability (0-70)
capacity_ratio = min(remaining_capacity / kw_requested, 2.0)
base_score = int((capacity_ratio / 2.0) * 70)

# Bonus points
bonus = 0
if has_solar_recommendation:
    bonus += 15
if has_flexible_load_recommendation:  # EV, Battery, Heat Pump
    bonus += 15

eco_score = min(base_score + bonus, 100)
```

---

## Example Calculation Walkthrough

### User Request:
- **Address**: Berliner Platz 1, Heilbronn
- **Type**: Consumer (Load)
- **Power**: 50 kW

### Step-by-Step:

1. **Geocoding**: `lat=49.142, lon=9.211`

2. **Find Nearest Station**:
   - Iterate all stations in CSV
   - Calculate distances: ONS-101 (650m), ONS-102 (450m), ONS-103 (800m)
   - **Result**: ONS-102 at 450 meters

3. **Read Station Data**:
   ```
   Installierte Trafoleistung: 400 kW
   PV-Leistung an ONS: 80 kW
   Übrige Trafokapazität: 250 kW
   ```

4. **Determine Voltage Level**:
   - 50 kW → **Niederspannung (High Load)** (LV)

5. **Check Capacity**:
   - Remaining: 250 kW
   - Requested: 50 kW
   - Buffer: 25 kW (10% of 250)
   - Available after buffer: 225 kW > 50 kW ✓

6. **Determine Status**:
   - Capacity sufficient: ✓
   - Load > 30 kW: ✓ (requires technical check)
   - **Status**: YELLOW
   - **Message**: "Technical assessment required"
   - **Timeline**: 1-3 Months

7. **Calculate Capacity Ratio**:
   - 250 / 50 = 5.0 (excellent capacity)

8. **Generate Recommendations**:
   - ✓ Solar PV (ratio > 3)
   - ✓ EV Charging (ratio > 2, kW < 100)
   - ✓ Heat Pump (ratio > 1.5, LV)
   - ✓ Battery Storage (optional with good capacity)

9. **Calculate Eco-Score**:
   ```
   base_score = (min(5.0, 2.0) / 2.0) * 70 = 70
   bonus = 15 (solar) + 15 (flexible load) = 30
   eco_score = min(70 + 30, 100) = 100
   ```

### Final Result:
```json
{
  "status": "yellow",
  "message": "Technical assessment required",
  "timeline": "1-3 Months",
  "grid_level": "Niederspannung (High Load)",
  "remaining_capacity": 250,
  "kw_requested": 50,
  "distance_km": 0.45,
  "eco_score": 100,
  "recommendations": [
    {"title": "Ideal for Solar PV Installation", ...},
    {"title": "EV Charging Suitable", ...},
    {"title": "Heat Pump Suitable", ...}
  ]
}
```

---

## Special Handling

### Coordinate Swap Detection
Some CSV data has swapped lat/lon:
```python
if lat < 15 and lon > 45:
    lat, lon = lon, lat  # Heilbronn is ~49°N, 9°E
```

### Data Cleaning
Remove units and convert to float:
```python
'250 kW' → 250.0
'2,5 MW' → 2.5
```

### Missing Data Handling
```python
if pd.isna(remaining_capacity):
    remaining_capacity = 0.0  # Conservative fallback
```

---

## Connection Type-Specific Advice

### For **Consumers** (Load):
- Focus on: reducing demand, time-of-use optimization, battery storage to reduce peak load
- Red status alternatives: reduce power demand, different location, phased installation

### For **Producers** (Feed-in/Solar):
- Focus on: self-consumption, battery storage to store excess, reducing feed-in to grid
- Red status alternatives: smaller system, battery storage, maximize on-site consumption

This differentiation is handled in the **ChatBot AI** responses based on `result.connection_type`.

---

## Map Visualization

### Voronoi Diagram Generation
Each station creates a region showing its service area:
```javascript
// Color based on remaining capacity
capacity >= 150 kW → Red (High capacity)
50-150 kW → Yellow (Medium)
< 50 kW → Green (Low capacity)
```

**Note**: Red = strong grid, Green = weak grid (opposite of traffic light)

### Layer Toggles
- **LV**: Show stations with < 50 kW capacity
- **MV**: Show stations with 50-150 kW capacity
- **HV**: Show stations with >= 150 kW capacity

---

## Summary

The calculation system:
1. ✅ Uses real CSV grid data (stations & substations)
2. ✅ Applies German grid connection rules (NHF voltage levels)
3. ✅ Considers simultaneity factors (0.7) for realistic capacity
4. ✅ Implements traffic light logic (green/yellow/red)
5. ✅ Generates personalized eco-friendly recommendations
6. ✅ Provides connection type-specific advice (consumer vs producer)
7. ✅ Visualizes capacity on interactive map with Voronoi regions

All calculations are **backend-driven** in `grid_data.py`, with results sent to the frontend via FastAPI REST API.
