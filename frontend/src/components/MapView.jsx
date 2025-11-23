import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import * as turf from '@turf/turf';

// Fix for default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

function ChangeView({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, zoom);
        }
    }, [center, zoom, map]);
    return null;
}

// Default center (Heilbronn)
const defaultCenter = [49.1427, 9.2109];

const MapView = ({ userLocation, stationLocation, allStations = [], activeLayers = [], lang = 'en' }) => {
    const center = userLocation || defaultCenter;
    const zoom = userLocation ? 15 : 13;

    // Calculate Voronoi Polygons
    const voronoiPolygons = useMemo(() => {
        try {
            if (!allStations || !allStations.length) {
                console.log("No stations data available for Voronoi");
                return null;
            }

            // Filter out duplicate coordinates to prevent Voronoi errors
            const seen = new Set();
            const uniqueStations = allStations.filter(s => {
                if (!s || typeof s.lat !== 'number' || typeof s.lon !== 'number' || typeof s.remaining_capacity !== 'number') {
                    console.warn("Invalid station data:", s);
                    return false;
                }
                const key = `${s.lat},${s.lon}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            if (uniqueStations.length < 3) {
                console.log("Not enough stations for Voronoi (need at least 3)");
                return null;
            }

            // Create FeatureCollection of points
            const points = turf.featureCollection(
                uniqueStations.map(station => turf.point([station.lon, station.lat], { ...station }))
            );

            // Create Bounding Box (Expanded to avoid visible square edges)
            const bbox = [8.5, 48.5, 10.0, 49.8]; // [minX, minY, maxX, maxY]

            // Generate Voronoi with large bbox
            const voronoi = turf.voronoi(points, { bbox });

            // Create a mask from the convex hull of points + buffer
            // This creates a nice organic shape around the city
            const hull = turf.convex(points);
            const mask = turf.buffer(hull, 1.5, { units: 'kilometers' });

            const clippedFeatures = voronoi.features.map((feature, i) => {
                if (!feature) return null;

                // Map properties
                if (points.features[i]) {
                    feature.properties = points.features[i].properties;
                }

                try {
                    // Try to clip with the organic mask
                    const clipped = turf.intersect(feature, mask);
                    if (clipped) {
                        clipped.properties = feature.properties;
                        return clipped;
                    }
                } catch (e) {
                    console.warn("Clipping failed for feature, using original", e);
                }

                // Fallback: Return original feature if clipping fails
                // This ensures we never lose the colors!
                return feature;
            }).filter(f => f !== null);

            const finalCollection = turf.featureCollection(clippedFeatures);

            console.log(`Voronoi generated successfully with ${finalCollection.features.length} polygons`);
            return finalCollection;
        } catch (e) {
            console.error("Voronoi generation failed:", e);
            return null;
        }
    }, [allStations]); // Generate once when stations change

    const onEachFeature = (feature, layer) => {
        if (feature.properties) {
            const { id, remaining_capacity } = feature.properties;
            const zoneLabel = lang === 'de' ? 'Netzgebiet' : 'Grid Zone';
            const capacityLabel = lang === 'de' ? 'Kapazität' : 'Capacity';
            layer.bindPopup(`
                <div class="font-sans">
                    <h3 class="font-bold">${zoneLabel}: ${id}</h3>
                    <p>${capacityLabel}: ${remaining_capacity} kW</p>
                </div>
            `);

            layer.on({
                mouseover: (e) => {
                    const layer = e.target;
                    layer.setStyle({ fillOpacity: 0.6, weight: 2, color: '#666' });
                },
                mouseout: (e) => {
                    const layer = e.target;
                    // Reset to original style based on capacity
                    const capacity = feature.properties.remaining_capacity;
                    let color, opacity;

                    if (capacity >= 150) {
                        color = '#ef4444';
                        opacity = 0.4;
                    } else if (capacity >= 50) {
                        color = '#f59e0b';
                        opacity = 0.35;
                    } else {
                        color = '#10b981';
                        opacity = 0.3;
                    }

                    layer.setStyle({
                        fillColor: color,
                        fillOpacity: opacity,
                        weight: 0,
                        color: 'white'
                    });
                }
            });
        }
    };

    const getStyle = (feature) => {
        const capacity = feature.properties.remaining_capacity;

        // Color based on capacity in each region
        // Green = Low/Weak capacity (<50 kW)
        // Yellow = Medium capacity (50-150 kW)
        // Red = High/Strong capacity (>150 kW)
        let color, opacity;

        if (capacity >= 150) {
            // High capacity - RED (Strong grid)
            color = '#ef4444';
            opacity = 0.4;
        } else if (capacity >= 50) {
            // Medium capacity - YELLOW
            color = '#f59e0b';
            opacity = 0.35;
        } else {
            // Low capacity - GREEN (Weak grid)
            color = '#10b981';
            opacity = 0.3;
        }

        return {
            fillColor: color,
            weight: 0,
            opacity: 0,
            color: 'white',
            fillOpacity: opacity
        };
    };

    // Filter Voronoi polygons based on active layers
    const filteredVoronoiPolygons = useMemo(() => {
        if (!voronoiPolygons || activeLayers.length === 0) return null;

        // If 'voltage-regions' is active, show all voltage regions
        if (activeLayers.includes('voltage-regions')) {
            return voronoiPolygons; // Show all regions
        }

        const filteredFeatures = voronoiPolygons.features.filter(feature => {
            const capacity = feature.properties.remaining_capacity;

            // Check if feature belongs to any active layer
            let shouldShow = false;

            if (activeLayers.includes('lv') && capacity < 50) {
                shouldShow = true;
            }
            if (activeLayers.includes('mv') && capacity >= 50 && capacity < 150) {
                shouldShow = true;
            }
            if (activeLayers.includes('hv') && capacity >= 150) {
                shouldShow = true;
            }

            return shouldShow;
        });

        return {
            ...voronoiPolygons,
            features: filteredFeatures
        };
    }, [voronoiPolygons, activeLayers]);

    return (
        <MapContainer center={defaultCenter} zoom={13} className="h-full w-full rounded-xl z-0">
            <ChangeView center={center} zoom={zoom} />
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Voronoi Overlay - Show filtered polygons based on voltage level */}
            {filteredVoronoiPolygons && activeLayers.length > 0 && (
                <GeoJSON
                    key={activeLayers.join(',')} // Re-render when combination changes
                    data={filteredVoronoiPolygons}
                    style={getStyle}
                    onEachFeature={onEachFeature}
                />
            )}

            {/* All Stations (Small dots) - DISABLED FOR NOW */}
            {/* {allStations.map((station, index) => (
                <CircleMarker
                    key={`station-${index}-${station.lat}-${station.lon}`}
                    center={[station.lat, station.lon]}
                    pathOptions={{
                        color: 'black',
                        fillColor: 'white',
                        fillOpacity: 1,
                        weight: 1
                    }}
                    radius={2}
                />
            ))} */}

            {/* User Location (Green dot) */}
            {userLocation && (
                <CircleMarker
                    center={userLocation}
                    pathOptions={{ color: 'blue', fillColor: '#2563EB', fillOpacity: 1 }}
                    radius={8}
                >
                    <Popup>{lang === 'de' ? 'Ihr Standort' : 'Your Location'}</Popup>
                </CircleMarker>
            )}

            {/* Nearest Station (Highlighted) */}
            {stationLocation && (
                <Marker position={stationLocation}>
                    <Popup>{lang === 'de' ? 'Nächste Station' : 'Nearest Station'}</Popup>
                </Marker>
            )}
        </MapContainer>
    );
};

export default MapView;
