import pandas as pd
import os
from geopy.distance import geodesic

class GridDataManager:
    def __init__(self):
        self.stations_df = None
        self.substations_df = None
        self.load_data()

    def load_data(self):
        base_path = os.path.dirname(os.path.abspath(__file__))
        stations_path = os.path.join(base_path, 'data', 'Kapa Stationen.csv')
        substations_path = os.path.join(base_path, 'data', 'Kapa Umspannwerke.csv')

        # Load Stations
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

    def find_nearest_station(self, lat, lon):
        # This is a simple linear search. For large datasets, use a spatial index like cKDTree.
        min_dist = float('inf')
        nearest_station = None

        for index, row in self.stations_df.iterrows():
            station_loc = (row['Breitengrad'], row['Längengrad'])
            user_loc = (lat, lon)
            dist = geodesic(user_loc, station_loc).meters
            
            if dist < min_dist:
                min_dist = dist
                nearest_station = row

        return nearest_station, min_dist

    def get_station_data(self, lat, lon, kw_requested):
        nearest_station, distance = self.find_nearest_station(lat, lon)
        
        if nearest_station is None:
            return None

        result = {
            "nearest_station_id": nearest_station['ONS'],
            "distance_meters": round(distance, 2),
            "grid_level": "Niederspannung",
            "max_capacity": nearest_station['Installierte Trafoleistung'],
            "current_load_pv": nearest_station['PV-Leistung an ONS'],
            "remaining_raw": nearest_station['Übrige Trafokapazität'],
            "remaining_safe": nearest_station['Übrige Trafokapazität bei Gleichzeitigkeitsfaktor 0,7'],
            "status": "calculated_on_frontend",
            "station_lat": nearest_station['Breitengrad'],
            "station_lon": nearest_station['Längengrad']
        }

        if kw_requested >= 135:
            # Use Umspannwerk data
            uw_id = nearest_station['Umspannwerk']
            uw_row = self.substations_df[self.substations_df['UW'] == uw_id]
            
            if not uw_row.empty:
                uw_capacity_mw = uw_row.iloc[0]['Verfügbare Einspeisekapazität in MW']
                uw_capacity_kw = uw_capacity_mw * 1000
                
                result["grid_level"] = "Mittelspannung"
                result["max_capacity"] = uw_capacity_kw
                # For MV, we might not have exact "current load" or "remaining safe" in the same way as LV in the CSV
                # But the requirement says "Use the Umspannwerk ID... to look up capacity".
                # And "Verfügbare Einspeisekapazität" implies remaining capacity.
                # So we map it to remaining_safe for the frontend check.
                result["remaining_safe"] = uw_capacity_kw 
                result["remaining_raw"] = uw_capacity_kw # Assuming raw is same or similar
                result["current_load_pv"] = 0 # Not provided for UW

        return result
