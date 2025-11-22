import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom colored icons
const createIcon = (color) => {
    return new L.Icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/markers/marker-icon-2x-${color}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
};

const blueIcon = createIcon('blue');
const yellowIcon = createIcon('gold'); // 'yellow' is not always available in this set, gold is close

function ChangeView({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
}

const MapView = ({ userLocation, stationLocation }) => {
    const center = userLocation || [49.1427, 9.2109]; // Default to Heilbronn
    const zoom = userLocation ? 15 : 13;

    return (
        <div className="h-full w-full rounded-xl overflow-hidden shadow-lg border border-gray-200 z-0">
            <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
                <ChangeView center={center} zoom={zoom} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {userLocation && (
                    <Marker position={userLocation} icon={blueIcon}>
                        <Popup>You are here</Popup>
                    </Marker>
                )}

                {stationLocation && (
                    <Marker position={stationLocation} icon={yellowIcon}>
                        <Popup>Grid Station</Popup>
                    </Marker>
                )}

                {userLocation && stationLocation && (
                    <Polyline
                        positions={[userLocation, stationLocation]}
                        pathOptions={{ color: 'black', dashArray: '5, 10' }}
                    />
                )}
            </MapContainer>
        </div>
    );
};

export default MapView;
