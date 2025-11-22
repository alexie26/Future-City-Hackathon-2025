import React, { useState } from 'react';
import axios from 'axios';
import Hero from './components/Hero';
import InputCard from './components/InputCard';
import MapView from './components/MapView';
import { CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, Sun, Battery, Zap, Thermometer, Leaf, Car } from 'lucide-react';

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
      // 1. Geocode address
      const geoRes = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', Heilbronn')}`);

      if (geoRes.data.length === 0) {
        throw new Error("Address not found in Heilbronn area. Please check the address and try again.");
      }

      const lat = parseFloat(geoRes.data[0].lat);
      const lon = parseFloat(geoRes.data[0].lon);
      
      // Validate coordinates are in reasonable range for Heilbronn
      if (lat < 48 || lat > 50 || lon < 8 || lon > 10) {
        throw new Error("The address appears to be outside the Heilbronn service area.");
      }
      
      setUserLocation([lat, lon]);

      // 2. Call Backend with timeout
      const apiRes = await axios.post(
        `${import.meta.env.VITE_API_URL}/check-feasibility`, 
        {
          lat,
          lon,
          kw_requested: kw,
          type
        },
        {
          timeout: 10000 // 10 second timeout
        }
      );

      setResult({ ...apiRes.data, kw_requested: kw });

      if (apiRes.data.station_lat && apiRes.data.station_lon) {
        setStationLocation([apiRes.data.station_lat, apiRes.data.station_lon]);
      }

    } catch (err) {
      console.error("Error details:", err);
      
      if (err.code === 'ECONNABORTED') {
        setError("Request timed out. The backend server may be slow or unavailable. Please try again.");
      } else if (err.response) {
        // Server responded with error
        const errorData = err.response.data;
        
        if (errorData.detail && typeof errorData.detail === 'object') {
          // Structured error from backend
          switch(errorData.detail.error) {
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

  const getRecommendationIcon = (type) => {
    switch(type) {
      case 'solar': return Sun;
      case 'battery': return Battery;
      case 'ev': return Car; // Changed from Zap to Car
      case 'heatpump': return Thermometer;
      case 'behavior': return Leaf;
      default: return Leaf;
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'border-green-500 bg-green-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-300 bg-gray-50';
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
              <div className={`p-6 text-center ${
                result.traffic_light === 'green' ? 'bg-green-50' : 
                result.traffic_light === 'yellow' ? 'bg-yellow-50' : 
                'bg-red-50'
              }`}>
                {result.traffic_light === 'green' && (
                  <>
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-2" />
                    <h2 className="text-2xl font-bold text-green-700">Excellent Grid Compatibility ✓</h2>
                    <p className="text-green-600 mt-2">Your location is ideal for sustainable energy solutions</p>
                  </>
                )}
                {result.traffic_light === 'yellow' && (
                  <>
                    <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-2" />
                    <h2 className="text-2xl font-bold text-yellow-700">Good with Optimization</h2>
                    <p className="text-yellow-600 mt-2">Smart solutions recommended for optimal grid integration</p>
                  </>
                )}
                {result.traffic_light === 'red' && (
                  <>
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-2" />
                    <h2 className="text-2xl font-bold text-red-700">Enhanced Solutions Needed</h2>
                    <p className="text-red-600 mt-2">Alternative approaches recommended for this location</p>
                  </>
                )}
                
                {/* Eco Score Display */}
                {result.eco_score !== undefined && (
                  <div className="mt-4">
                    <div className="text-sm text-gray-600 mb-1">Grid Compatibility Score</div>
                    <div className="flex items-center justify-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-3 max-w-xs">
                        <div 
                          className={`h-3 rounded-full ${
                            result.eco_score >= 70 ? 'bg-green-500' : 
                            result.eco_score >= 40 ? 'bg-yellow-500' : 
                            'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(result.eco_score, 100)}%` }}
                        />
                      </div>
                      <span className="font-bold text-lg">{result.eco_score}/100</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Recommendations Section */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="p-6 border-t border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Leaf className="w-5 h-5 text-green-600" />
                    Eco-Friendly Recommendations
                  </h3>
                  <div className="space-y-3">
                    {result.recommendations.map((rec, index) => {
                      const IconComponent = getRecommendationIcon(rec.type);
                      return (
                        <div 
                          key={index} 
                          className={`border-l-4 p-4 rounded-r-lg ${getPriorityColor(rec.priority)}`}
                        >
                          <div className="flex items-start gap-3">
                            <IconComponent className="w-5 h-5 mt-1 flex-shrink-0" />
                            <div>
                              <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                              <p className="text-sm text-gray-700 mt-1">{rec.description}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Technical Details (Collapsed by default) */}
              <div className="border-t border-gray-100">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full p-4 flex items-center justify-between text-gray-600 hover:bg-gray-50"
                >
                  <span className="text-sm font-medium">Technical Details (For Professionals)</span>
                  {showDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>

                {showDetails && (
                  <div className="p-4 bg-gray-50 text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Grid Level:</span>
                      <span className="font-medium">{result.grid_level}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Distance to Station:</span>
                      <span className="font-medium">{result.distance_meters} m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Requested Power:</span>
                      <span className="font-medium">{result.kw_requested} kW</span>
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
