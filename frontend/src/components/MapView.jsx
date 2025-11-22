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

const MapView = ({ userLocation, stationLocation, allStations = [], lang = 'en' }) => {
    // Default center (Heilbronn)
    const defaultCenter = [49.1427, 9.2109];
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
                if (!s || !s.lat || !s.lon || !s.remaining_capacity) {
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

            // Create Bounding Box (Heilbronn area approx)
            const bbox = [9.0, 49.0, 9.4, 49.3]; // [minX, minY, maxX, maxY]

            // Generate Voronoi
            const voronoi = turf.voronoi(points, { bbox });

            // IMPORTANT: Map properties back to polygons!
            // Turf.voronoi preserves the order, so index i corresponds to points.features[i]
            if (voronoi && voronoi.features) {
                voronoi.features.forEach((feature, i) => {
                    if (feature && points.features[i]) {
                        feature.properties = points.features[i].properties;
                    }
                });
            }

            console.log(`Voronoi generated successfully with ${voronoi?.features?.length || 0} polygons`);
            return voronoi;
        } catch (e) {
            console.error("Voronoi generation failed:", e);
            return null;
        }
    }, [allStations]);

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
                    layer.setStyle({ fillOpacity: 0.5, weight: 2, color: '#666' });
                },
                mouseout: (e) => {
                    const layer = e.target;
                    // Reset style
                    const capacity = feature.properties.remaining_capacity;
                    let opacity = 0.2;
                    if (capacity < 50) opacity = 0.3;

                    layer.setStyle({ fillOpacity: opacity, weight: 0 });
                }
            });
        }
    };

    const getStyle = (feature) => {
        const capacity = feature.properties.remaining_capacity;
        let color = '#10b981'; // Emerald Green
        let opacity = 0.2;

        if (capacity < 50) {
            color = '#ef4444'; // Red
            opacity = 0.3;
        } else if (capacity < 150) {
            color = '#f59e0b'; // Amber
            opacity = 0.2;
        }

        return {
            fillColor: color,
            weight: 0,
            opacity: 0,
            color: 'white',
            fillOpacity: opacity
        };
    };

    return (
        <MapContainer center={defaultCenter} zoom={13} className="h-full w-full rounded-xl z-0">
            <ChangeView center={center} zoom={zoom} />
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Voronoi Overlay */}
            {voronoiPolygons && (
                <GeoJSON
                    data={voronoiPolygons}
                    style={getStyle}
                    onEachFeature={onEachFeature}
                />
            )}

            {/* All Stations (Small dots on top) */}
            {allStations.map((station, index) => (
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
            ))}

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
