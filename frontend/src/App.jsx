import React, { useState, useEffect } from 'react';
import axios from 'axios';
import OverlayMenu from './components/OverlayMenu';
import LayersMenu from './components/LayersMenu';
import MapView from './components/MapView';
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

// Add retry utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retryRequest = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Don't retry on 4xx errors (client errors)
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        throw error;
      }

      console.warn(`Request failed, retrying (${i + 1}/${maxRetries})...`);
      await sleep(delay * (i + 1)); // Exponential backoff
    }
  }
};

const App = () => {
  // Main App Component
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [stationLocation, setStationLocation] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [allStations, setAllStations] = useState([]);
  const [activeLayers, setActiveLayers] = useState([]); // Array of active layers

  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState(null);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    // Fetch all stations on load with retry logic
    const fetchStations = async () => {
      try {
        const res = await retryRequest(() =>
          axios.get(`${import.meta.env.VITE_API_URL}/stations`, { timeout: 10000 })
        );

        if (!res.data || !Array.isArray(res.data)) {
          throw new Error('Invalid response format from stations endpoint');
        }

        setAllStations(res.data);
        setApiError(null);
      } catch (err) {
        console.error("Failed to fetch stations:", err);
        setApiError(`Unable to load grid data: ${err.message}`);

        // Set empty array to prevent map errors
        setAllStations([]);
      }
    };

    fetchStations();
  }, []);

  const handleLayerChange = (layerId) => {
    setActiveLayers(prev => {
      if (prev.includes(layerId)) {
        return prev.filter(id => id !== layerId); // Remove if already active
      } else {
        return [...prev, layerId]; // Add if not active
      }
    });
  };

  const handleCheck = async ({ address, type, kw, technology = "Other" }) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setUserLocation(null);
    setStationLocation(null);

    try {
      // Validate inputs
      if (!address || address.trim().length === 0) {
        throw new Error("Please enter a valid address");
      }

      if (!kw || isNaN(kw) || kw <= 0) {
        throw new Error("Please enter a valid power value (kW)");
      }

      if (kw > 10000) {
        throw new Error("Power value exceeds maximum limit (10000 kW)");
      }

      // 1. Geocode address with retry
      let geoRes;
      try {
        geoRes = await retryRequest(() =>
          axios.get(`https://nominatim.openstreetmap.org/search`, {
            params: {
              format: 'json',
              q: `${address}, Heilbronn, Germany`
            },
            timeout: 5000
          })
        );
      } catch (geoError) {
        console.error("Geocoding failed:", geoError);
        throw new Error("Unable to locate address. Please check your internet connection and try again.");
      }

      if (!geoRes.data || geoRes.data.length === 0) {
        // Try without explicitly adding Heilbronn
        try {
          geoRes = await retryRequest(() =>
            axios.get(`https://nominatim.openstreetmap.org/search`, {
              params: {
                format: 'json',
                q: address
              },
              timeout: 5000
            })
          );
        } catch (geoError) {
          throw new Error("Unable to locate address. Please try again.");
        }
      }

      if (!geoRes.data || geoRes.data.length === 0) {
        throw new Error("Address not found. Please try: 'Street Name Number, Heilbronn' (e.g. 'Karlstraße 2, Heilbronn')");
      }

      const lat = parseFloat(geoRes.data[0].lat);
      const lon = parseFloat(geoRes.data[0].lon);

      // Validate coordinates
      if (isNaN(lat) || isNaN(lon)) {
        throw new Error("Invalid coordinates received from geocoding service");
      }

      console.log(`Geocoded address: ${address} -> (${lat}, ${lon})`);

      // Validate coordinates are in Heilbronn area (more precise range)
      // Heilbronn coordinates: approximately 49.14°N, 9.22°E
      if (lat < 49.0 || lat > 49.3 || lon < 9.0 || lon > 9.5) {
        console.warn(`Coordinates outside typical Heilbronn area: (${lat}, ${lon})`);
        throw new Error("The address appears to be outside the Heilbronn service area. Please enter an address in Heilbronn.");
      }

      setUserLocation([lat, lon]);

      // 2. Map frontend type to backend type
      const backendType = type === 'consumer' ? 'load' : 'feed_in';

      // 3. Call Backend with retry logic
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      console.log(`Calling API: ${apiUrl}/check-feasibility`);

      let apiRes;
      try {
        apiRes = await retryRequest(() =>
          axios.post(`${apiUrl}/check-feasibility`, {
            address,
            lat,
            lon,
            kw_requested: kw,
            type: backendType,
            technology
          }, {
            timeout: 15000 // 15 second timeout
          })
        );
      } catch (apiError) {
        console.error("API call failed:", apiError);

        if (apiError.response) {
          // Server responded with error
          const errorData = apiError.response.data;

          if (errorData.detail) {
            if (typeof errorData.detail === 'object') {
              throw new Error(errorData.detail.message || JSON.stringify(errorData.detail));
            }
            throw new Error(errorData.detail);
          }
        }

        throw new Error("Backend service unavailable. Please try again later.");
      }

      // Validate response structure
      if (!apiRes.data) {
        throw new Error("Invalid response from backend service");
      }

      console.log('API Response:', apiRes.data);
      setResult(apiRes.data);

      // Set station location if available
      if (apiRes.data.station_lat && apiRes.data.station_lon) {
        if (!isNaN(apiRes.data.station_lat) && !isNaN(apiRes.data.station_lon)) {
          setStationLocation([apiRes.data.station_lat, apiRes.data.station_lon]);
        }
      }

    } catch (err) {
      console.error("Error details:", err);

      // Determine user-friendly error message
      let errorMessage = "An unexpected error occurred. Please try again.";

      if (err.message) {
        errorMessage = err.message;
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = "Request timed out. The server may be slow or unavailable. Please try again.";
      } else if (err.request && !err.response) {
        errorMessage = `Cannot connect to backend server. Please ensure the backend is running and accessible.`;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadInsights = async () => {
    setInsightsLoading(true);
    setInsightsError(null);

    try {
      const res = await retryRequest(() =>
        axios.get(`${import.meta.env.VITE_API_URL}/insights/summary`, {
          timeout: 10000
        })
      );

      if (!res.data) {
        throw new Error('Invalid response from insights endpoint');
      }

      setInsights(res.data);
    } catch (err) {
      console.error('Failed to load insights', err);
      setInsightsError(err.message || 'Failed to load planning insights. Please try again.');
    } finally {
      setInsightsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen relative font-sans overflow-hidden">
      {/* API Error Banner */}
      {apiError && (
        <div className="absolute top-0 left-0 right-0 bg-red-600 text-white px-4 py-2 text-sm z-50 flex items-center justify-between">
          <span>⚠️ {apiError}</span>
          <button onClick={() => setApiError(null)} className="text-white hover:text-gray-200">
            ✕
          </button>
        </div>
      )}

      {/* Full Screen Map */}
      <div className="absolute inset-0 z-0">
        <MapView
          userLocation={userLocation}
          stationLocation={stationLocation}
          allStations={allStations}
          activeLayers={activeLayers}
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
        activeLayers={activeLayers}
        onLayerChange={handleLayerChange}
      />
    </div>
  );
}

export default App;
