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

    def _generate_recommendations(self, remaining_capacity, kw_requested, traffic_light, grid_level, lang: str = "en"):
        """Generate eco-friendly recommendations based on grid conditions.

        lang: 'en' (default) or 'de' for German UI texts.
        """
        recommendations = []
        
        capacity_ratio = remaining_capacity / max(kw_requested, 1)
        
        # Solar PV recommendations
        if capacity_ratio > 3:
            if lang == "de":
                title = "🌞 Ideal für Solar-PV-Installation"
                description = (
                    "Dieser Standort hat eine ausgezeichnete Netzkapazität für Solarenergie. "
                    "Eine Solaranlage kann helfen, Stromkosten zu senken und erneuerbare Energien zu fördern."
                )
                benefits = [
                    "Stromkosten um bis zu 70 % reduzieren",
                    "Zu Klimazielen beitragen",
                    "Schnelle Netzanschlussgenehmigung",
                ]
            else:
                title = "🌞 Ideal for Solar PV Installation"
                description = (
                    "This location has excellent grid capacity for solar energy. Consider installing solar panels "
                    "to reduce energy costs and support renewable energy."
                )
                benefits = [
                    "Reduce electricity bills by up to 70%",
                    "Contribute to climate goals",
                    "Fast grid connection approval",
                ]

            recommendations.append({
                "type": "solar",
                "icon": "sun",
                "title": title,
                "description": description,
                "priority": "high",
                "benefits": benefits,
            })
        elif capacity_ratio > 1.5:
            if lang == "de":
                title = "☀️ Gutes Solar-PV-Potenzial"
                description = (
                    "Eine Solaranlage ist hier gut möglich. Intelligente Wechselrichter werden für eine optimale "
                    "Netzintegration empfohlen."
                )
                benefits = [
                    "Erneuerbare Energien unterstützen",
                    "Intelligente Netzintegration möglich",
                ]
            else:
                title = "☀️ Good Solar PV Potential"
                description = (
                    "Solar installation is viable here. Smart inverters recommended for optimal grid integration."
                )
                benefits = [
                    "Support renewable energy",
                    "Smart grid integration available",
                ]

            recommendations.append({
                "type": "solar",
                "icon": "sun",
                "title": title,
                "description": description,
                "priority": "medium",
                "benefits": benefits,
            })
        
        # Battery storage recommendations
        if traffic_light in ["yellow", "red"]:
            if lang == "de":
                title = "🔋 Batteriespeicher empfohlen"
                description = (
                    "Ein Batteriespeicher hilft, das Netz zu entlasten und eine Notstromversorgung bereitzustellen. "
                    "Dieses Gebiet profitiert besonders von Lastverschiebung."
                )
                benefits = [
                    "Netzbelastung reduzieren",
                    "Überschüssige Solarenergie speichern",
                    "Notstrom bei Ausfällen",
                    "Lastverschiebung nach Zeittarifen",
                ]
            else:
                title = "🔋 Battery Storage Recommended"
                description = (
                    "Adding battery storage would help reduce grid stress and provide backup power. "
                    "This area would benefit from load balancing."
                )
                benefits = [
                    "Reduce grid stress",
                    "Store excess solar energy",
                    "Backup power during outages",
                    "Time-of-use optimization",
                ]

            recommendations.append({
                "type": "battery",
                "icon": "battery",
                "title": title,
                "description": description,
                "priority": "high" if traffic_light == "red" else "medium",
                "benefits": benefits,
            })
        elif capacity_ratio > 2:
            if lang == "de":
                title = "🔋 Batteriespeicher optional"
                description = (
                    "Die Netzkapazität ist gut, aber ein Speicher kann Ihre Solarinvestition maximieren "
                    "und mehr Unabhängigkeit vom Netz bringen."
                )
                benefits = [
                    "Energieunabhängigkeit",
                    "Maximaler Ertrag aus der Solaranlage",
                ]
            else:
                title = "🔋 Battery Storage Optional"
                description = (
                    "Grid capacity is good, but battery storage can still maximize your solar investment and provide energy independence."
                )
                benefits = [
                    "Energy independence",
                    "Maximize solar ROI",
                ]

            recommendations.append({
                "type": "battery",
                "icon": "battery",
                "title": title,
                "description": description,
                "priority": "low",
                "benefits": benefits,
            })
        
        # EV charging recommendations
        if capacity_ratio > 2 and kw_requested < 100:
            if lang == "de":
                title = "🚗 Geeignet für E-Ladung"
                description = (
                    "Dieser Standort eignet sich für Ladeinfrastruktur für E-Fahrzeuge. "
                    "Intelligente Ladesysteme helfen, das Laden in netzdienliche Zeiten zu verschieben."
                )
                benefits = [
                    "Bereit für Schnellladen",
                    "Intelligentes Laden möglich",
                    "Netzfreundliche Ladezeiten",
                ]
            else:
                title = "🚗 EV Charging Suitable"
                description = (
                    "This location supports EV charging infrastructure. Smart charging systems recommended to optimize grid usage during off-peak hours."
                )
                benefits = [
                    "Fast charging ready",
                    "Smart charging available",
                    "Grid-friendly charging schedules",
                ]

            recommendations.append({
                "type": "ev",
                "icon": "car",
                "title": title,
                "description": description,
                "priority": "high",
                "benefits": benefits,
            })
        elif capacity_ratio > 1:
            if lang == "de":
                title = "⚡ Smartes E-Laden empfohlen"
                description = (
                    "E-Laden ist möglich, besonders mit smarter Ladetechnik, um die Netzbelastung "
                    "in Nebenzeiten zu verschieben."
                )
                benefits = [
                    "Günstigere Tarife in Nebenzeiten",
                    "Geringere Netzbelastung",
                ]
            else:
                title = "⚡ Smart EV Charging Recommended"
                description = (
                    "EV charging is possible with smart charging technology to balance grid load during off-peak hours."
                )
                benefits = [
                    "Off-peak charging discounts",
                    "Reduced grid impact",
                ]

            recommendations.append({
                "type": "ev",
                "icon": "car",
                "title": title,
                "description": description,
                "priority": "medium",
                "benefits": benefits,
            })
        
        # Heat pump recommendations
        if capacity_ratio > 1.5 and grid_level == "Niederspannung":
            if lang == "de":
                title = "🌡️ Wärmepumpe geeignet"
                description = (
                    "Für den Einbau einer Wärmepumpe wird eine hohe Effizienz erwartet. "
                    "Dies ist eine sehr gute Alternative zu fossilen Heizsystemen."
                )
                benefits = [
                    "Gas- oder Ölheizung ersetzen",
                    "Geringere Betriebskosten",
                    "CO₂-Emissionen um ca. 60 % senken",
                ]
            else:
                title = "🌡️ Heat Pump Suitable"
                description = (
                    "High efficiency expected for heat pump installation. This is an excellent alternative to fossil fuel heating."
                )
                benefits = [
                    "Replace gas/oil heating",
                    "Lower running costs",
                    "Reduce CO2 emissions by 60%",
                ]

            recommendations.append({
                "type": "heatpump",
                "icon": "thermometer",
                "title": title,
                "description": description,
                "priority": "high",
                "benefits": benefits,
            })
        
        # Grid-friendly behavior suggestions
        if traffic_light == "yellow":
            if lang == "de":
                title = "🌿 Netzfreundliche Verbrauchsmuster"
                description = (
                    "Nutzen Sie zeitvariable Tarife und verschieben Sie Lasten in Nebenzeiten, "
                    "um die Netzstabilität zu unterstützen."
                )
                benefits = [
                    "Niedrigere Stromkosten in Nebenzeiten",
                    "Unterstützung der Netzstabilität",
                    "Positive Umwelteffekte",
                ]
            else:
                title = "🌿 Grid-Friendly Consumption Patterns"
                description = (
                    "Consider time-of-use optimization and load shifting to off-peak hours to support grid stability."
                )
                benefits = [
                    "Lower electricity rates during off-peak",
                    "Support grid stability",
                    "Environmental benefits",
                ]

            recommendations.append({
                "type": "behavior",
                "icon": "leaf",
                "title": title,
                "description": description,
                "priority": "medium",
                "benefits": benefits,
            })
        
        # Community energy recommendations
        if capacity_ratio > 2.5:
            if lang == "de":
                title = "👥 Gemeinschaftsenergie-Potenzial"
                description = (
                    "Dieses Gebiet eignet sich gut für Gemeinschaftssolar- oder Energieprojekte. "
                    "Prüfen Sie die Teilnahme an einer lokalen Energieinitiative."
                )
                benefits = [
                    "Erneuerbare Energie gemeinsam nutzen",
                    "Gemeinschaftliche Kosteneinsparungen",
                    "Lokale Energie-Resilienz",
                ]
            else:
                title = "👥 Community Energy Potential"
                description = (
                    "This area is ideal for community solar or shared energy projects. Consider joining or starting a local energy initiative."
                )
                benefits = [
                    "Share renewable energy",
                    "Community cost savings",
                    "Local energy resilience",
                ]

            recommendations.append({
                "type": "community",
                "icon": "users",
                "title": title,
                "description": description,
                "priority": "low",
                "benefits": benefits,
            })
        
        return recommendations

    def get_station_data(self, lat, lon, kw_requested, lang: str = "en"):
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
            
            logger.debug(f"Capacity data - remaining_safe: {result['remaining_safe']} kW, requested: {kw_requested} kW")
            

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
                        logger.debug(f"Escalated to MV, capacity: {uw_capacity_kw} kW")

            # Calculate traffic light status
            remaining_capacity = result["remaining_safe"]
            
            logger.debug(f"Final remaining_safe: {remaining_capacity}, threshold 70%: {remaining_capacity * 0.7}")
            
            if kw_requested <= remaining_capacity * 0.7:
                result["traffic_light"] = "green"
                result["status"] = "approved"
                result["message"] = (
                    "Der Anschluss ist mit der aktuellen Netzkapazität voraussichtlich möglich."
                    if lang == "de"
                    else "Connection is likely feasible with current grid capacity."
                )
                logger.debug(f"GREEN - {kw_requested} <= {remaining_capacity * 0.7}")
            elif kw_requested <= remaining_capacity:
                result["traffic_light"] = "yellow"
                result["status"] = "review_needed"
                result["message"] = (
                    "Weitere technische Prüfung erforderlich. Bitte wenden Sie sich für eine detaillierte Bewertung an unser Planungsteam."
                    if lang == "de"
                    else "Further technical review needed. Please contact our engineering team for detailed assessment."
                )
                logger.debug(f"YELLOW - {kw_requested} <= {remaining_capacity}")
            else:
                result["traffic_light"] = "red"
                result["status"] = "not_feasible"
                if result["grid_level"] == "Niederspannung":
                    result["message"] = (
                        "Mit der aktuellen Niederspannungskapazität nicht möglich. Ein Mittelspannungsanschluss oder Netzausbau kann erforderlich sein."
                        if lang == "de"
                        else "Not feasible with current low voltage capacity. Medium voltage connection or grid expansion may be required."
                    )
                else:
                    result["message"] = (
                        "Mit der aktuellen Kapazität nicht möglich. Ein umfangreicher Netzausbau ist erforderlich."
                        if lang == "de"
                        else "Not feasible with current capacity. Significant grid expansion required."
                    )
                logger.debug(f"RED - {kw_requested} > {remaining_capacity}")
            
            # Generate recommendations (new feature)
            result["recommendations"] = self._generate_recommendations(
                remaining_capacity,
                kw_requested,
                result["traffic_light"],
                result["grid_level"],
                lang=lang,
            )
            
            # Add eco-score (0-100) for frontend display
            capacity_percentage = min((remaining_capacity / max(kw_requested, 1)) * 100, 100)
            result["eco_score"] = int(capacity_percentage * 0.7)  # Scale to 0-70 range, reserve top 30% for perfect conditions

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

