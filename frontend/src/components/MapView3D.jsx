import React, { useEffect, useRef } from 'react';
import 'ol/ol.css';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat, toLonLat } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { Style, Circle, Fill, Stroke } from 'ol/style';
import { defaults as defaultControls } from 'ol/control';

const MapView3D = ({ userLocation, stationLocation, allStations = [] }) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const vectorLayer = useRef(null);

    const defaultCenter = [9.2109, 49.1427]; // Heilbronn [lng, lat]
    const center = userLocation ? [userLocation[1], userLocation[0]] : defaultCenter;

    useEffect(() => {
        if (map.current) return;

        console.log('Initializing 3D map...');

        // Create vector layer for markers
        const vectorSource = new VectorSource();
        vectorLayer.current = new VectorLayer({
            source: vectorSource,
            style: (feature) => {
                const type = feature.get('type');
                
                if (type === 'user') {
                    return new Style({
                        image: new Circle({
                            radius: 10,
                            fill: new Fill({ color: '#2563EB' }),
                            stroke: new Stroke({ color: 'white', width: 3 })
                        })
                    });
                } else if (type === 'nearest') {
                    return new Style({
                        image: new Circle({
                            radius: 15,
                            fill: new Fill({ color: '#ef4444' }),
                            stroke: new Stroke({ color: 'white', width: 3 })
                        })
                    });
                } else {
                    const status = feature.get('status');
                    const color = status === 'green' ? '#10b981' : 
                                 status === 'yellow' ? '#f59e0b' : '#ef4444';
                    return new Style({
                        image: new Circle({
                            radius: 6,
                            fill: new Fill({ color: color }),
                            stroke: new Stroke({ color: 'white', width: 2 })
                        })
                    });
                }
            }
        });

        // Initialize map
        map.current = new Map({
            target: mapContainer.current,
            layers: [
                new TileLayer({
                    source: new OSM({
                        attributions: '© OpenStreetMap contributors'
                    })
                }),
                vectorLayer.current
            ],
            view: new View({
                center: fromLonLat(center),
                zoom: userLocation ? 16 : 13,
                rotation: 0
            }),
            controls: defaultControls({
                zoom: true,
                rotate: true,
                attribution: true
            })
        });

        console.log('3D map initialized successfully');

        return () => {
            console.log('Cleaning up 3D map');
            if (map.current) {
                map.current.setTarget(null);
                map.current = null;
            }
        };
    }, []);

    // Update markers
    useEffect(() => {
        if (!vectorLayer.current) return;

        console.log('Updating markers:', { 
            stations: allStations.length, 
            userLocation, 
            stationLocation 
        });

        const vectorSource = vectorLayer.current.getSource();
        vectorSource.clear();

        // Add station markers
        allStations.forEach((station) => {
            if (!station.lat || !station.lon) return;

            const feature = new Feature({
                geometry: new Point(fromLonLat([station.lon, station.lat])),
                type: 'station',
                status: station.status,
                name: station.id,
                capacity: station.remaining_capacity
            });

            vectorSource.addFeature(feature);
        });

        // Add user location
        if (userLocation) {
            const userFeature = new Feature({
                geometry: new Point(fromLonLat([userLocation[1], userLocation[0]])),
                type: 'user',
                name: 'Your Location'
            });
            vectorSource.addFeature(userFeature);

            // Animate to user location
            map.current?.getView().animate({
                center: fromLonLat([userLocation[1], userLocation[0]]),
                zoom: 16,
                duration: 1000
            });
        }

        // Add nearest station
        if (stationLocation) {
            const stationFeature = new Feature({
                geometry: new Point(fromLonLat([stationLocation[1], stationLocation[0]])),
                type: 'nearest',
                name: 'Nearest Station'
            });
            vectorSource.addFeature(stationFeature);
        }
    }, [userLocation, stationLocation, allStations]);

    // Add click handler for popups
    useEffect(() => {
        if (!map.current) return;

        const handleClick = (evt) => {
            const feature = map.current.forEachFeatureAtPixel(evt.pixel, (feature) => feature);
            
            if (feature) {
                const coords = feature.getGeometry().getCoordinates();
                const type = feature.get('type');
                const name = feature.get('name');
                
                let content = `<strong>${name}</strong>`;
                if (type === 'station') {
                    const capacity = feature.get('capacity');
                    content += `<br/>Capacity: ${capacity || 0} kW`;
                }
                
                // Create popup overlay
                const popup = document.createElement('div');
                popup.innerHTML = content;
                popup.style.cssText = `
                    position: absolute;
                    background: white;
                    padding: 10px;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    font-family: sans-serif;
                    font-size: 14px;
                    white-space: nowrap;
                    z-index: 1000;
                    pointer-events: none;
                `;
                
                const pixel = map.current.getPixelFromCoordinate(coords);
                popup.style.left = `${pixel[0]}px`;
                popup.style.top = `${pixel[1] - 40}px`;
                
                mapContainer.current.appendChild(popup);
                
                setTimeout(() => popup.remove(), 3000);
            }
        };

        map.current.on('click', handleClick);

        return () => {
            map.current?.un('click', handleClick);
        };
    }, []);

    return (
        <div className="relative h-full w-full bg-gray-100">
            <div 
                ref={mapContainer} 
                className="h-full w-full"
                style={{ minHeight: '100%' }}
            />
            
            {/* 3D Effect Overlay */}
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg px-4 py-2 z-10">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">3D Street View Mode</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">Drag to pan • Shift+Drag to rotate</p>
            </div>
        </div>
    );
};

export default MapView3D;
