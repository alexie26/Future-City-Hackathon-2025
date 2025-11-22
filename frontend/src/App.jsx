import React, { useState } from 'react';
import axios from 'axios';
import Hero from './components/Hero';
import InputCard from './components/InputCard';
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

  const handleCheck = async ({ address, type, kw }) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setUserLocation(null);
    setStationLocation(null);

    try {
      // 1. Geocode address (Mocking for now as per instructions, or using Nominatim)
      // Using Nominatim for better experience
      const geoRes = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', Heilbronn')}`);

      if (geoRes.data.length === 0) {
        throw new Error("Address not found in Heilbronn area.");
      }

      const lat = parseFloat(geoRes.data[0].lat);
      const lon = parseFloat(geoRes.data[0].lon);
      setUserLocation([lat, lon]);

      // 2. Call Backend
      const apiRes = await axios.post(`${import.meta.env.VITE_API_URL}/check-feasibility`, {
        lat,
        lon,
        kw_requested: kw,
        type
      });

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
      console.error(err);
      setError(err.message || "An error occurred while checking feasibility.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Hero />

      <main className="flex-grow p-4 md:p-6 flex flex-col md:flex-row gap-6">
        {/* Left Side: Input & Results */}
        <div className="w-full md:w-1/3 flex flex-col gap-6">
          <InputCard onCheck={handleCheck} />

          {loading && (
            <div className="text-center p-4 text-gray-500">Calculating feasibility...</div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
              {error}
            </div>
          )}

          {result && (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-fade-in">
              <div className={`p-6 text-center ${result.kw_requested <= result.remaining_safe ? 'bg-green-50' : 'bg-red-50'}`}>
                {result.kw_requested <= result.remaining_safe ? (
                  <>
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-2" />
                    <h2 className="text-2xl font-bold text-green-700">Approved</h2>
                    <p className="text-green-600">Grid capacity available.</p>
                  </>
                ) : (
                  <>
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-2" />
                    <h2 className="text-2xl font-bold text-red-700">Grid Expansion Needed</h2>
                    <p className="text-red-600">Requested power exceeds safe capacity.</p>
                  </>
                )}
              </div>

              <div className="border-t border-gray-100">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full p-4 flex items-center justify-between text-gray-600 hover:bg-gray-50"
                >
                  <span className="font-medium">Technical Details</span>
                  {showDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>

                {showDetails && (
                  <div className="p-4 bg-gray-50 text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Grid Level:</span>
                      <span className="font-medium">{result.grid_level}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Station ID:</span>
                      <span className="font-medium">{result.nearest_station_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Distance:</span>
                      <span className="font-medium">{result.distance_meters} m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Max Capacity:</span>
                      <span className="font-medium">{result.max_capacity} kW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Current Load (PV):</span>
                      <span className="font-medium">{result.current_load_pv} kW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Remaining (Safe):</span>
                      <span className="font-medium">{result.remaining_safe} kW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Remaining (Raw):</span>
                      <span className="font-medium">{result.remaining_raw} kW</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Map */}
        <div className="w-full md:w-2/3 h-[500px] md:h-auto">
          <MapView userLocation={userLocation} stationLocation={stationLocation} allStations={allStations} />
        </div>
      </main>
    </div>
  );
}

export default App;
