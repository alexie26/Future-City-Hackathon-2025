import React, { useState } from 'react';
import axios from 'axios';
import OverlayMenu from './components/OverlayMenu';
import LayersMenu from './components/LayersMenu';
import MapView from './components/MapView';
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [stationLocation, setStationLocation] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [allStations, setAllStations] = useState([]);
  const [layers, setLayers] = useState({
    lv: { enabled: false },
    mv: { enabled: false },
    hv: { enabled: false },
    assets: { enabled: false },
    reservations: { enabled: false },
    routing: { enabled: false },
    heatmap: {
      enabled: true,
      settings: {
        voltageLevel: 'MV',
        type: 'Loads'
      }
    },
    parcels: { enabled: false }
  });

  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState(null);

  React.useEffect(() => {
    // Fetch all stations on load
    const fetchStations = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/stations`);
        setAllStations(res.data);
      } catch (err) {
        console.error("Failed to fetch stations:", err);
      }
    };
    fetchStations();
  }, []);

  const handleLayerChange = (layerId, enabled, settings = null) => {
    setLayers(prev => ({
      ...prev,
      [layerId]: settings
        ? { enabled, settings }
        : { ...prev[layerId], enabled }
    }));
  };

  const handleCheck = async ({ address, type, kw, coordinates }) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setUserLocation(null);
    setStationLocation(null);

    try {
      let lat, lon;

      // If coordinates provided from autocomplete, use them directly
      if (coordinates) {
        lat = coordinates.lat;
        lon = coordinates.lon;
        setUserLocation([lat, lon]);
      } else {
        // Otherwise, geocode the address
        const geoRes = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', Heilbronn')}`);

        if (geoRes.data.length === 0) {
          throw new Error("Address not found in Heilbronn area. Please check the address and try again.");
        }

        lat = parseFloat(geoRes.data[0].lat);
        lon = parseFloat(geoRes.data[0].lon);

        // Validate coordinates are in reasonable range for Heilbronn
        if (lat < 48 || lat > 50 || lon < 8 || lon > 10) {
          throw new Error("The address appears to be outside the Heilbronn service area.");
        }

        setUserLocation([lat, lon]);
      }

      // 2. Call Backend with timeout
      const apiRes = await axios.post(
        `${import.meta.env.VITE_API_URL}/check-feasibility`,
        {
          lat,
          lon,
          kw_requested: kw,
          type: type === 'load' ? 'consumer' : 'producer'  // Map frontend values to backend values
        },
        {
          timeout: 10000 // 10 second timeout
        }
      );

      setResult({ ...apiRes.data, kw_requested: kw });

      if (apiRes.data.station_lat && apiRes.data.station_lon) {
        setStationLocation([apiRes.data.station_lat, apiRes.data.station_lon]);
      }

      // Assuming station location is not returned by backend explicitly in lat/lon,
      // but we need it for the map.
      // Wait, the backend returns `nearest_station_id`.
      // I should probably return station lat/lon from backend to plot it.
      // Let's assume for now I can't plot the station exactly unless I update backend.
      // I'll update backend to return station lat/lon.
      // For now, I'll just plot a point nearby or skip the station marker if I don't have coords.
      // Actually, I can update the backend quickly.
      // But let's stick to the plan. I'll check if I can get station coords.
      // The backend `get_station_data` returns `nearest_station_id`.
      // I'll update the backend to return `station_lat` and `station_lon`.

      // For this turn, I'll assume the backend returns it or I'll mock it slightly offset from user for visual.
      // Or better, I'll update the backend in the next step if needed.
      // Let's check `grid_data.py` again. It has the coords.

    } catch (err) {
      console.error("Error details:", err);

      if (err.code === 'ECONNABORTED') {
        setError("Request timed out. The backend server may be slow or unavailable. Please try again.");
      } else if (err.response) {
        // Server responded with error
        const errorData = err.response.data;

        if (errorData.detail && typeof errorData.detail === 'object') {
          // Structured error from backend
          switch (errorData.detail.error) {
            case 'NO_STATION_FOUND':
              setError("No electrical station found near this location. This area may not be covered by our service. Please try a different address in Heilbronn.");
              break;
            case 'VALIDATION_ERROR':
              setError(`Invalid input: ${errorData.detail.message}`);
              break;
            case 'INTERNAL_ERROR':
              setError("A server error occurred. Our team has been notified. Please try again later.");
              break;
            default:
              setError(errorData.detail.message || "An error occurred while checking feasibility.");
          }
        } else if (typeof errorData.detail === 'string') {
          setError(errorData.detail);
        } else {
          setError("Server error occurred. Please try again.");
        }
      } else if (err.request) {
        setError("Cannot connect to backend server. Please ensure the backend is running at " + import.meta.env.VITE_API_URL);
      } else {
        setError(err.message || "An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoadInsights = async () => {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/insights/summary`,
        {
          timeout: 10000
        }
      );
      setInsights(res.data);
    } catch (err) {
      console.error('Failed to load insights', err);
      setInsightsError('Failed to load planning insights. Please try again.');
    } finally {
      setInsightsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen relative font-sans overflow-hidden">
      {/* Full Screen Map */}
      <div className="absolute inset-0 z-0">
        <MapView
          userLocation={userLocation}
          stationLocation={stationLocation}
          allStations={allStations}
          heatmapEnabled={layers.heatmap.enabled}
        />
      </div>

      {/* Overlay Menu (Left) */}
      <OverlayMenu
        onCheck={handleCheck}
        result={result}
        loading={loading}
        error={error}
        insights={insights}
        insightsLoading={insightsLoading}
        insightsError={insightsError}
        onLoadInsights={handleLoadInsights}
      />

      {/* Layers Menu (Right) */}
      <LayersMenu
        layers={layers}
        onLayerChange={handleLayerChange}
      />
    </div>
  );
}

export default App;
