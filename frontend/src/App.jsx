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

  const [lang, setLang] = useState('en');

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

  const toggleLang = () => {
    setLang(prev => (prev === 'en' ? 'de' : 'en'));
  };

  const handleLayerChange = (layerId, enabled, settings = null) => {
    setLayers(prev => ({
      ...prev,
      [layerId]: settings
        ? { enabled, settings }
        : { ...prev[layerId], enabled }
    }));
  };

  const handleCheck = async ({ address, type, kw, technology = "Other" }) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setUserLocation(null);
    setStationLocation(null);

    try {
      // 1. Geocode address - try with and without "Heilbronn"
      let geoRes = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', Heilbronn, Germany')}`);

      if (geoRes.data.length === 0) {
        // Try without explicitly adding Heilbronn
        geoRes = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
      }

      if (geoRes.data.length === 0) {
        throw new Error("Address not found. Please try: 'Street Name Number, Heilbronn' (e.g. 'Karlstraße 2, Heilbronn')");
      }

      const lat = parseFloat(geoRes.data[0].lat);
      const lon = parseFloat(geoRes.data[0].lon);
      
      console.log(`Geocoded address: ${address} -> (${lat}, ${lon})`);
      
      // Validate coordinates are in reasonable range for Heilbronn area
      if (lat < 48.5 || lat > 50 || lon < 8.5 || lon > 10) {
        throw new Error("The address appears to be outside the Heilbronn service area. Please enter an address in Heilbronn.");
      }
      
      setUserLocation([lat, lon]);

      // 2. Map frontend type to backend type
      const backendType = type === 'consumer' ? 'load' : 'feed_in';

      // 3. Call Backend with updated endpoint
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      console.log(`Calling API: ${apiUrl}/check-feasibility`);
      
      const apiRes = await axios.post(`${apiUrl}/check-feasibility`, {
        address,
        lat,
        lon,
        kw_requested: kw,
        type: backendType,
        technology,
        lang,
      }, {
        timeout: 10000 // 10 second timeout
      });

      console.log('API Response:', apiRes.data);
      setResult(apiRes.data);

      // Set station location if available
      if (apiRes.data.station_lat && apiRes.data.station_lon) {
        setStationLocation([apiRes.data.station_lat, apiRes.data.station_lon]);
      }

    } catch (err) {
      console.error("Error details:", err);
      
      if (err.code === 'ECONNABORTED') {
        setError(lang === 'de'
          ? 'Zeitüberschreitung. Der Backend-Server ist langsam oder nicht erreichbar. Bitte später erneut versuchen.'
          : 'Request timed out. The backend server may be slow or unavailable. Please try again.');
      } else if (err.response?.data?.detail) {
        setError(typeof err.response.data.detail === 'string' 
          ? err.response.data.detail 
          : JSON.stringify(err.response.data.detail));
      } else if (err.request) {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        setError(lang === 'de'
          ? `Keine Verbindung zum Backend-Server unter ${baseUrl}. Bitte prüfen, ob der Server läuft.`
          : `Cannot connect to backend server at ${baseUrl}. Please ensure the backend is running.`);
      } else {
        setError(lang === 'de'
          ? `Ein unerwarteter Fehler ist aufgetreten${err.message ? `: ${err.message}` : '. Bitte später erneut versuchen.'}`
          : `An unexpected error occurred${err.message ? `: ${err.message}` : '. Please try again.'}`);
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
          lang={lang}
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
        lang={lang}
        onToggleLang={toggleLang}
      />

      {/* Layers Menu (Right) */}
      <LayersMenu
        layers={layers}
        onLayerChange={handleLayerChange}
        lang={lang}
      />
    </div>
  );
}

export default App;
