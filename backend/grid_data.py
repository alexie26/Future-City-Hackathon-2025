import pandas as pd
import os
from geopy.distance import geodesic
import logging

logger = logging.getLogger(__name__)

class GridDataManager:
    def __init__(self):
        self.stations_df = None
        self.substations_df = None
        self.load_data()

    def load_data(self):
        base_path = os.path.dirname(os.path.abspath(__file__))

        
        try:
            stations_path = os.path.join(base_path, 'data', 'Kapa Stationen.csv')
            substations_path = os.path.join(base_path, 'data', 'Kapa Umspannwerke.csv')
            locations_path = os.path.join(base_path, 'data', 'tabelle1.csv')
            topology_path = os.path.join(base_path, 'data', 'tabelle3.csv')
            
            # Check if files exist
            for path in [stations_path, substations_path, locations_path, topology_path]:
                if not os.path.exists(path):
                    raise FileNotFoundError(f"Required data file not found: {path}")
            
            # Load Stations with capacity data
            logger.info(f"Loading stations from {stations_path}")
            self.stations_df = pd.read_csv(stations_path)
            
            if self.stations_df.empty:
                raise ValueError("Stations data file is empty")
            
            # Clean data: remove 'kW' if present and convert to float
            cols_to_clean = ['Installierte Trafoleistung', 'PV-Leistung an ONS', 
                             'Übrige Trafokapazität', 'Übrige Trafokapazität bei Gleichzeitigkeitsfaktor 0,7']
            
            for col in cols_to_clean:
                if col in self.stations_df.columns:
                    if self.stations_df[col].dtype == 'object':
                        self.stations_df[col] = self.stations_df[col].astype(str).str.replace('kW', '', case=False).str.replace(',', '.').astype(float)
                else:
                    logger.warning(f"Column {col} not found in stations data")

            # Load Substations
            logger.info(f"Loading substations from {substations_path}")
            self.substations_df = pd.read_csv(substations_path)
            
            if self.substations_df.empty:
                raise ValueError("Substations data file is empty")
            
            # Clean data: remove 'MW' if present and convert to float
            if 'Verfügbare Einspeisekapazität in MW' in self.substations_df.columns:
                if self.substations_df['Verfügbare Einspeisekapazität in MW'].dtype == 'object':
                    self.substations_df['Verfügbare Einspeisekapazität in MW'] = self.substations_df['Verfügbare Einspeisekapazität in MW'].astype(str).str.replace('MW', '', case=False).str.replace(',', '.').astype(float)


            # Load complete location data (tabelle1)
            logger.info(f"Loading locations from {locations_path}")
            self.locations_df = pd.read_csv(locations_path)
            
            # Load topology mapping (tabelle3)
            logger.info(f"Loading topology from {topology_path}")
            self.topology_df = pd.read_csv(topology_path)
            self.topology_df.columns = ['Name', 'Col2', 'Abgang', 'UW']
            self.topology_df = self.topology_df[['Abgang', 'UW']].dropna()
            self.topology_df = self.topology_df.drop_duplicates(subset=['Abgang'])
            
            logger.info(f"Successfully loaded data: {len(self.stations_df)} stations, {len(self.substations_df)} substations")
            
        except FileNotFoundError as e:
            logger.error(f"Data file not found: {str(e)}")
            raise
        except pd.errors.EmptyDataError as e:
            logger.error(f"Data file is empty: {str(e)}")
            raise ValueError(f"One or more data files are empty")
        except Exception as e:
            logger.error(f"Error loading data: {str(e)}", exc_info=True)
            raise

    def find_nearest_station(self, lat, lon):
        try:
            if self.stations_df is None or self.stations_df.empty:
                logger.error("Stations dataframe is not loaded or empty")
                return None, None, None, float('inf')
            
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
                except ValueError as e:
                    logger.warning(f"Invalid coordinates for station: {e}")
                    continue

            if nearest_station is None:
                logger.warning(f"No valid station found near coordinates: {lat}, {lon}")
                return None, None, None, float('inf')
            
            nearest_coords = (nearest_station['Breitengrad'], nearest_station['Längengrad'])
            if nearest_coords[0] < 15 and nearest_coords[1] > 45:
                nearest_coords = (nearest_coords[1], nearest_coords[0])
                
            return nearest_station['ONS'], nearest_station, nearest_coords, min_dist
            
        except Exception as e:
            logger.error(f"Error finding nearest station: {str(e)}", exc_info=True)
            return None, None, None, float('inf')

    def _generate_recommendations(self, remaining_capacity, kw_requested, traffic_light, grid_level):
        """Generate eco-friendly recommendations based on grid conditions"""
        recommendations = []
        
        capacity_ratio = remaining_capacity / max(kw_requested, 1)
        
        # Solar PV recommendations
        if capacity_ratio > 3:
            recommendations.append({
                "type": "solar",
                "icon": "sun",
                "title": "🌞 Ideal for Solar PV Installation",
                "description": "This location has excellent grid capacity for solar energy. Consider installing solar panels to reduce energy costs and support renewable energy.",
                "priority": "high",
                "benefits": ["Reduce electricity bills by up to 70%", "Contribute to climate goals", "Fast grid connection approval"]
            })
        elif capacity_ratio > 1.5:
            recommendations.append({
                "type": "solar",
                "icon": "sun",
                "title": "☀️ Good Solar PV Potential",
                "description": "Solar installation is viable here. Smart inverters recommended for optimal grid integration.",
                "priority": "medium",
                "benefits": ["Support renewable energy", "Smart grid integration available"]
            })
        
        # Battery storage recommendations
        if traffic_light in ["yellow", "red"]:
            recommendations.append({
                "type": "battery",
                "icon": "battery",
                "title": "🔋 Battery Storage Recommended",
                "description": "Adding battery storage would help reduce grid stress and provide backup power. This area would benefit from load balancing.",
                "priority": "high" if traffic_light == "red" else "medium",
                "benefits": ["Reduce grid stress", "Store excess solar energy", "Backup power during outages", "Time-of-use optimization"]
            })
        elif capacity_ratio > 2:
            recommendations.append({
                "type": "battery",
                "icon": "battery",
                "title": "🔋 Battery Storage Optional",
                "description": "Grid capacity is good, but battery storage can still maximize your solar investment and provide energy independence.",
                "priority": "low",
                "benefits": ["Energy independence", "Maximize solar ROI"]
            })
        
        # EV charging recommendations
        if capacity_ratio > 2 and kw_requested < 100:
            recommendations.append({
                "type": "ev",
                "icon": "car",
                "title": "🚗 EV Charging Suitable",
                "description": "This location supports EV charging infrastructure. Smart charging systems recommended to optimize grid usage during off-peak hours.",
                "priority": "high",
                "benefits": ["Fast charging ready", "Smart charging available", "Grid-friendly charging schedules"]
            })
        elif capacity_ratio > 1:
            recommendations.append({
                "type": "ev",
                "icon": "car",
                "title": "⚡ Smart EV Charging Recommended",
                "description": "EV charging is possible with smart charging technology to balance grid load during off-peak hours.",
                "priority": "medium",
                "benefits": ["Off-peak charging discounts", "Reduced grid impact"]
            })
        
        # Heat pump recommendations
        if capacity_ratio > 1.5 and grid_level == "Niederspannung":
            recommendations.append({
                "type": "heatpump",
                "icon": "thermometer",
                "title": "🌡️ Heat Pump Suitable",
                "description": "High efficiency expected for heat pump installation. This is an excellent alternative to fossil fuel heating.",
                "priority": "high",
                "benefits": ["Replace gas/oil heating", "Lower running costs", "Reduce CO2 emissions by 60%"]
            })
        
        # Grid-friendly behavior suggestions
        if traffic_light == "yellow":
            recommendations.append({
                "type": "behavior",
                "icon": "leaf",
                "title": "🌿 Grid-Friendly Consumption Patterns",
                "description": "Consider time-of-use optimization and load shifting to off-peak hours to support grid stability.",
                "priority": "medium",
                "benefits": ["Lower electricity rates during off-peak", "Support grid stability", "Environmental benefits"]
            })
        
        # Community energy recommendations
        if capacity_ratio > 2.5:
            recommendations.append({
                "type": "community",
                "icon": "users",
                "title": "👥 Community Energy Potential",
                "description": "This area is ideal for community solar or shared energy projects. Consider joining or starting a local energy initiative.",
                "priority": "low",
                "benefits": ["Share renewable energy", "Community cost savings", "Local energy resilience"]
            })
        
        return recommendations

    def get_station_data(self, lat, lon, kw_requested):
        try:
            nearest_station_id, station_data, nearest_coords, distance = self.find_nearest_station(lat, lon)
            
            if nearest_station_id is None or station_data is None:
                logger.warning(f"No station found for location: {lat}, {lon}")
                return None

            logger.debug(f"Found station {nearest_station_id} at distance {distance}m")
            
            # Get substation mapping from topology
            uw_id = None
            topology_match = self.topology_df[self.topology_df['Abgang'] == nearest_station_id]
            if not topology_match.empty:
                uw_id = topology_match.iloc[0]['UW']
            
            # Fallback to stations_df
            if not uw_id and 'Umspannwerk' in station_data and pd.notna(station_data['Umspannwerk']):
                uw_id = station_data['Umspannwerk']

            logger.debug(f"UW_ID: {uw_id}")

            # --- SMART LOGIC START ---
            
            # 1. Determine Voltage Level based on NHF Rules
            voltage_level = "Niederspannung" # Default
            voltage_code = "LV"
            
            if kw_requested < 30:
                voltage_level = "Niederspannung (Standard)"
                voltage_code = "LV"
            elif kw_requested < 135:
                voltage_level = "Niederspannung (High Load)"
                voltage_code = "LV"
            elif kw_requested < 20000: # < 20MW
                voltage_level = "Mittelspannung"
                voltage_code = "MV"
            else:
                voltage_level = "Hochspannung"
                voltage_code = "HV"

            # 2. Select Capacity Source based on Voltage Level
            max_capacity = 0.0
            remaining_capacity = 0.0
            current_load_pv = 0.0
            
            if voltage_code == "LV":
                # Use ONS data
                max_capacity = float(station_data['Installierte Trafoleistung'])
                current_load_pv = float(station_data['PV-Leistung an ONS'])
                remaining_capacity = float(station_data['Übrige Trafokapazität bei Gleichzeitigkeitsfaktor 0,7'])
            else:
                # Use UW data (MV/HV)
                if uw_id:
                    uw_row = self.substations_df[self.substations_df['UW'] == uw_id]
                    if not uw_row.empty:
                        uw_capacity_mw = uw_row.iloc[0]['Verfügbare Einspeisekapazität in MW']
                        uw_capacity_kw = uw_capacity_mw * 1000
                        max_capacity = uw_capacity_kw
                        remaining_capacity = uw_capacity_kw
                        current_load_pv = 0 # Not relevant for UW level in this context
                    else:
                        # Fallback if UW not found but required
                        logger.warning(f"UW {uw_id} not found for MV request")
                        remaining_capacity = 0 # Conservative fallback
                else:
                    remaining_capacity = 0

            # 3. Determine Status (Traffic Light) & Timeline
            traffic_light = "red"
            message = ""
            timeline = ""
            next_steps = ""
            
            # Buffer for green status (10%)
            safe_buffer = remaining_capacity * 0.1
            
            if remaining_capacity < kw_requested:
                # RED: Not enough capacity
                traffic_light = "red"
                message = f"Grid expansion required. Requested {kw_requested} kW exceeds available capacity of {remaining_capacity:.1f} kW."
                timeline = "6-12+ Months"
                next_steps = "Contact Grid Planning for expansion assessment."
            
            elif voltage_code == "LV" and kw_requested > 30:
                # YELLOW: Capacity exists, but high load on LV (>30kW) requires check
                traffic_light = "yellow"
                message = "Capacity available, but load > 30kW requires technical assessment."
                timeline = "1-3 Months"
                next_steps = "Submit 'Netzverträglichkeitsprüfung' (Grid Compatibility Check)."
                
            elif remaining_capacity < (kw_requested + safe_buffer):
                # YELLOW: Capacity exists but is tight (<10% buffer)
                traffic_light = "yellow"
                message = "Capacity available but tight. Technical review recommended."
                timeline = "1-3 Months"
                next_steps = "Request detailed grid impact study."
                
            else:
                # GREEN: Plenty of capacity
                traffic_light = "green"
                message = "Connection feasible. Sufficient capacity available."
                timeline = "2-4 Weeks"
                next_steps = "Submit standard connection application online."

            # --- SMART LOGIC END ---

            # Base result
            result = {
                "nearest_station_id": nearest_station_id if voltage_code == "LV" else (uw_id or "Unknown UW"),
                "distance_meters": round(distance, 2),
                "grid_level": voltage_level,
                "station_lat": nearest_coords[0] if nearest_coords else None,
                "station_lon": nearest_coords[1] if nearest_coords else None,
                "max_capacity": max_capacity,
                "current_load_pv": current_load_pv,
                "remaining_raw": remaining_capacity, # Simplified for now
                "remaining_safe": remaining_capacity,
                "traffic_light": traffic_light,
                "status": "approved" if traffic_light == "green" else ("review_needed" if traffic_light == "yellow" else "not_feasible"),
                "message": message,
                "timeline": timeline,
                "next_steps": next_steps
            }
            
            # Generate recommendations
            result["recommendations"] = self._generate_recommendations(
                remaining_capacity, 
                kw_requested, 
                result["traffic_light"],
                result["grid_level"]
            )
            
            # Add eco-score (0-100) for frontend display
            # Base score from capacity availability (0-70)
            capacity_ratio = min(remaining_capacity / max(kw_requested, 1), 2.0) # Cap ratio at 2.0
            base_score = int((capacity_ratio / 2.0) * 70)
            
            # Bonus points for grid-friendly technologies
            bonus = 0
            
            # Bonus for Producers (Solar PV) - they add green energy!
            # We can infer producer if type is 'feed_in' (need to pass type to this function)
            # For now, let's assume if it's a "feed_in" request (we need to pass this param)
            # Since we don't have 'type' here yet, let's use a heuristic or update the signature later.
            # For now, let's give a bonus if recommendations include Solar.
            
            has_solar_rec = any(r['type'] == 'solar' for r in result['recommendations'])
            if has_solar_rec:
                bonus += 15
                
            # Bonus for flexible loads (EV, Battery, Heat Pump)
            has_flex_rec = any(r['type'] in ['ev', 'battery', 'heatpump'] for r in result['recommendations'])
            if has_flex_rec:
                bonus += 15
                
            result["eco_score"] = min(base_score + bonus, 100)

            return result

        except Exception as e:
            logger.error(f"Error getting station data: {str(e)}", exc_info=True)
            return None

    def get_all_stations(self):
        # Return a list of all stations with their coordinates and capacity
        stations = []
        for index, row in self.stations_df.iterrows():
            if pd.notna(row['Breitengrad']) and pd.notna(row['Längengrad']):
                # Check if coordinates are swapped (Heilbronn is approx Lat 49, Lon 9)
                lat = row['Breitengrad']
                lon = row['Längengrad']
                
                # Simple heuristic: If Lat is small (e.g. 9) and Lon is large (e.g. 49), swap them
                if lat < 15 and lon > 45:
                    lat, lon = lon, lat

                # Determine status based on remaining capacity (simple heuristic)
                # Green: > 100kW remaining, Yellow: > 0kW, Red: <= 0kW
                remaining = row['Übrige Trafokapazität bei Gleichzeitigkeitsfaktor 0,7']
                
                # Handle NaN values which cause JSON serialization errors
                if pd.isna(remaining):
                    remaining = 0.0
                
                status = 'green'
                if remaining <= 0:
                    status = 'red'
                elif remaining < 100:
                    status = 'yellow'

                stations.append({
                    "id": row['ONS'],
                    "lat": lat,
                    "lon": lon,
                    "status": status,
                    "remaining_capacity": remaining
                })
        return stations

