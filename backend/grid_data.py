import pandas as pd
import os
from geopy.distance import geodesic

class GridDataManager:
    def __init__(self):
        self.stations_df = None
        self.substations_df = None
        self.locations_df = None
        self.topology_df = None
        self.load_data()

    def load_data(self):
        base_path = os.path.dirname(os.path.abspath(__file__))
        stations_path = os.path.join(base_path, 'data', 'Kapa Stationen.csv')
        substations_path = os.path.join(base_path, 'data', 'Kapa Umspannwerke.csv')
        locations_path = os.path.join(base_path, 'data', 'tabelle1.csv')
        topology_path = os.path.join(base_path, 'data', 'tabelle3.csv')

        # Load Stations with capacity data
        self.stations_df = pd.read_csv(stations_path)
        # Clean data: remove 'kW' if present and convert to float
        cols_to_clean = ['Installierte Trafoleistung', 'PV-Leistung an ONS', 
                         'Übrige Trafokapazität', 'Übrige Trafokapazität bei Gleichzeitigkeitsfaktor 0,7']
        
        for col in cols_to_clean:
            if self.stations_df[col].dtype == 'object':
                 self.stations_df[col] = self.stations_df[col].astype(str).str.replace('kW', '', case=False).str.replace(',', '.').astype(float)

        # Load Substations
        self.substations_df = pd.read_csv(substations_path)
        # Clean data: remove 'MW' if present and convert to float
        if self.substations_df['Verfügbare Einspeisekapazität in MW'].dtype == 'object':
            self.substations_df['Verfügbare Einspeisekapazität in MW'] = self.substations_df['Verfügbare Einspeisekapazität in MW'].astype(str).str.replace('MW', '', case=False).str.replace(',', '.').astype(float)

        # Load complete location data (tabelle1) - more stations with GPS
        self.locations_df = pd.read_csv(locations_path)
        
        # Load topology mapping (tabelle3) - station to substation relationships
        self.topology_df = pd.read_csv(topology_path)
        # Extract just the station ID and UW mapping
        # Column structure: Name, blank, Abgang (station), blank column with UW
        self.topology_df.columns = ['Name', 'Col2', 'Abgang', 'UW']
        self.topology_df = self.topology_df[['Abgang', 'UW']].dropna()
        self.topology_df = self.topology_df.drop_duplicates(subset=['Abgang'])

    def find_nearest_station(self, lat, lon):
        # Search only in stations with capacity data for better results
        min_dist = float('inf')
        nearest_station = None

        for index, row in self.stations_df.iterrows():
            # Skip rows with missing coordinates or capacity
            if pd.isna(row['Breitengrad']) or pd.isna(row['Längengrad']):
                continue
            if pd.isna(row['Übrige Trafokapazität bei Gleichzeitigkeitsfaktor 0,7']):
                continue
                
            lat_val = row['Breitengrad']
            lon_val = row['Längengrad']

            # Simple heuristic: If Lat is small (e.g. 9) and Lon is large (e.g. 49), swap them
            if lat_val < 15 and lon_val > 45:
                lat_val, lon_val = lon_val, lat_val

            station_loc = (lat_val, lon_val)
            user_loc = (lat, lon)
            try:
                dist = geodesic(user_loc, station_loc).meters
                
                if dist < min_dist:
                    min_dist = dist
                    nearest_station = row
            except ValueError:
                continue

        if nearest_station is None:
            return None, None, None, float('inf')
        
        nearest_coords = (nearest_station['Breitengrad'], nearest_station['Längengrad'])
        # Swap if needed
        if nearest_coords[0] < 15 and nearest_coords[1] > 45:
            nearest_coords = (nearest_coords[1], nearest_coords[0])
            
        return nearest_station['ONS'], nearest_station, nearest_coords, min_dist

    def get_station_data(self, lat, lon, kw_requested):
        nearest_station_id, station_data, nearest_coords, distance = self.find_nearest_station(lat, lon)
        
        if nearest_station_id is None or station_data is None:
            return None

        print(f"DEBUG: Found station {nearest_station_id}")
        
        # Get substation mapping from topology
        uw_id = None
        topology_match = self.topology_df[self.topology_df['Abgang'] == nearest_station_id]
        if not topology_match.empty:
            uw_id = topology_match.iloc[0]['UW']
        
        # Fallback to stations_df
        if not uw_id and 'Umspannwerk' in station_data and pd.notna(station_data['Umspannwerk']):
            uw_id = station_data['Umspannwerk']

        print(f"DEBUG: UW_ID: {uw_id}")

        # Base result with station info
        result = {
            "nearest_station_id": nearest_station_id,
            "distance_meters": round(distance, 2),
            "grid_level": "Niederspannung",
            "station_lat": nearest_coords[0] if nearest_coords else None,
            "station_lon": nearest_coords[1] if nearest_coords else None,
            "max_capacity": float(station_data['Installierte Trafoleistung']),
            "current_load_pv": float(station_data['PV-Leistung an ONS']),
            "remaining_raw": float(station_data['Übrige Trafokapazität']),
            "remaining_safe": float(station_data['Übrige Trafokapazität bei Gleichzeitigkeitsfaktor 0,7'])
        }
        
        print(f"DEBUG: Capacity data - remaining_safe: {result['remaining_safe']} kW, requested: {kw_requested} kW")
        
        print(f"DEBUG: Capacity data - remaining_safe: {result['remaining_safe']} kW, requested: {kw_requested} kW")

        # Check if we need to use Mittelspannung (Medium Voltage) - typically for ≥135kW
        # Or if low voltage doesn't have enough capacity
        if kw_requested >= 135 or result["remaining_safe"] < kw_requested:
            if uw_id:
                uw_row = self.substations_df[self.substations_df['UW'] == uw_id]
                
                if not uw_row.empty:
                    uw_capacity_mw = uw_row.iloc[0]['Verfügbare Einspeisekapazität in MW']
                    uw_capacity_kw = uw_capacity_mw * 1000
                    
                    result["grid_level"] = "Mittelspannung"
                    result["max_capacity"] = uw_capacity_kw
                    result["remaining_safe"] = uw_capacity_kw 
                    result["remaining_raw"] = uw_capacity_kw
                    result["current_load_pv"] = 0
                    print(f"DEBUG: Escalated to MV, capacity: {uw_capacity_kw} kW")

        # Calculate traffic light status
        remaining_capacity = result["remaining_safe"]
        
        print(f"DEBUG: Final remaining_safe: {remaining_capacity}, threshold 70%: {remaining_capacity * 0.7}")
        
        if kw_requested <= remaining_capacity * 0.7:
            # Green: Less than 70% of remaining capacity - safe zone
            result["traffic_light"] = "green"
            result["status"] = "approved"
            result["message"] = "Connection is likely feasible with current grid capacity."
            print(f"DEBUG: GREEN - {kw_requested} <= {remaining_capacity * 0.7}")
        elif kw_requested <= remaining_capacity:
            # Yellow: Between 70-100% of remaining capacity - needs review
            result["traffic_light"] = "yellow"
            result["status"] = "review_needed"
            result["message"] = "Further technical review needed. Please contact our engineering team for detailed assessment."
            print(f"DEBUG: YELLOW - {kw_requested} <= {remaining_capacity}")
        else:
            # Red: Exceeds remaining capacity
            result["traffic_light"] = "red"
            result["status"] = "not_feasible"
            if result["grid_level"] == "Niederspannung":
                result["message"] = "Not feasible with current low voltage capacity. Medium voltage connection or grid expansion may be required."
            else:
                result["message"] = "Not feasible with current capacity. Significant grid expansion required."
            print(f"DEBUG: RED - {kw_requested} > {remaining_capacity}")

        return result

    def get_all_stations(self):
        # Return a list of all stations with their coordinates from tabelle1 (more complete)
        stations = []
        for index, row in self.locations_df.iterrows():
            if pd.notna(row['Breitengrad']) and pd.notna(row['Längengrad']):
                # Check if coordinates are swapped (Heilbronn is approx Lat 49, Lon 9)
                lat = row['Breitengrad']
                lon = row['Längengrad']
                
                # Simple heuristic: If Lat is small (e.g. 9) and Lon is large (e.g. 49), swap them
                if lat < 15 and lon > 45:
                    lat, lon = lon, lat

                stations.append({
                    "id": row['Stationsnummer'],
                    "lat": lat,
                    "lon": lon
                })
        return stations
