import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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

const MapView = ({ userLocation, stationLocation, allStations = [] }) => {
    // Default center (Heilbronn)
    const defaultCenter = [49.1427, 9.2109];
    const center = userLocation || defaultCenter;
    const zoom = userLocation ? 15 : 13;

    return (
        <MapContainer center={defaultCenter} zoom={13} className="h-full w-full rounded-xl z-0">
            <ChangeView center={center} zoom={zoom} />
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* All Stations (Red dots) */}
            {allStations.map((station) => (
                <CircleMarker
                    key={station.id}
                    center={[station.lat, station.lon]}
                    pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.7 }}
                    radius={3}
                >
                    <Popup>
                        Station ID: {station.id}
                    </Popup>
                </CircleMarker>
            ))}

            {/* User Location (Green dot) */}
            {userLocation && (
                <CircleMarker
                    center={userLocation}
                    pathOptions={{ color: 'green', fillColor: '#10B981', fillOpacity: 0.9 }}
                    radius={8}
                >
                    <Popup>Your Location</Popup>
                </CircleMarker>
            )}

            {/* Nearest Station (Highlighted) */}
            {stationLocation && (
                <Marker position={stationLocation}>
                    <Popup>Nearest Station</Popup>
                </Marker>
            )}
        </MapContainer>
    );
};

export default MapView;
