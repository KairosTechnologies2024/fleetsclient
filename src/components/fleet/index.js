import React, { useEffect, useState, useRef } from "react";
import { Center, Spinner, Button } from "@chakra-ui/react";
import { parseWKBLocation } from "API/apiHelper";
import { getFleetData } from "hooks/fleetService"; // Import from fleetService.js
import { GoogleMap, MarkerF, InfoWindow, useLoadScript } from "@react-google-maps/api";

// Marker Asset
const endPin = require("assets/endPin.png");


const mapContainerStyle = {
  width: "100%",
  height: "80vh",
};

// Google Maps API Key
const API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

function FleetMap() {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: API_KEY,
  });

  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: -25.746111, lng: 28.188056 });
  const [mapZoom, setMapZoom] = useState(5); // Track zoom level
  const [mapBounds, setMapBounds] = useState(null); // Track current bounds
  const [hasAutoFitted, setHasAutoFitted] = useState(false);


  const mapRef = useRef(null);

  // Fetch fleet data on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await getFleetData(setFleet, setLoading);
    };

    fetchData();
  }, []);

  // WebSocket handling
  useEffect(() => {

    // const ws = new WebSocket('ws://localhost:3001');
    const ws = new WebSocket('wss://ekco-tracking.co.za:3001');

    // const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    // const ws = new WebSocket(`${protocol}://${window.location.hostname}:3001`);

    ws.onopen = () => {
      console.log("Connected to WebSocket");
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "gps_update") {
          // Parse WKB location into lat/lng
          const parsedData = message.data.map(item => {
            const { latitude, longitude } = parseWKBLocation(item.location);
            return {
              ...item,
              latitude,
              longitude,
              timestamp: parseInt(item.time, 10),
            };
          });

          setFleet(prevFleet => {
            let didChange = false;

            const updatedFleet = prevFleet.map(device => {
              const update = parsedData.find(d => d.device_serial === device.device_serial);
              if (
                update &&
                (device.latitude !== update.latitude || device.longitude !== update.longitude)
              ) {
                didChange = true;
                return { ...device, ...update };
              }
              return device;
            });

            return didChange ? updatedFleet : prevFleet;
          });

          setLoading(false);
        }
      } catch (err) {
        console.error("Error handling WebSocket message:", err.message);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket Error:", error);
    };

    ws.onclose = () => {
      console.log("Disconnected from WebSocket");
    };

    return () => {
      ws.close();
    };
  }, []);

  // Update map bounds
  useEffect(() => {
    if (fleet.length > 0 && mapRef.current) {
      const bounds = new window.google.maps.LatLngBounds();
      fleet.forEach((device) => {
        if (device.latitude && device.longitude) {
          bounds.extend({ lat: device.latitude, lng: device.longitude });
        }
      });


      if (!hasAutoFitted) {
        mapRef.current.fitBounds(bounds);
        setMapBounds(bounds);
        setHasAutoFitted(true);
      }
    }
  }, [fleet, mapBounds]);

  // Loading state handling
  if (!isLoaded) return <Spinner size="xl" />;
  if (loading) return <Center h="100vh"><Spinner size="xl" /></Center>;

  return (
    <div>
      <Button
        onClick={async () => {
          setHasAutoFitted(false); // Reset fit state
          setLoading(true);
          await getFleetData(setFleet, setLoading);
        }}
        colorScheme="teal"
        mb={4}
      >
        Refresh
      </Button>

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={mapZoom} // Control zoom level
        center={mapCenter} // Control center position
        onLoad={(map) => {
          mapRef.current = map;
        }}
        onClick={() => setSelectedDevice(null)}
      >
        {fleet.map((device) => (
          <MarkerF
            key={device.device_serial}
            position={{
              lat: device.latitude,
              lng: device.longitude,
            }}
            title={`Device: ${device.device_serial}`}
            icon={{
              url: endPin,
              scaledSize: new window.google.maps.Size(45, 65),
            }}
            // onLoad={(marker) => {
            //   markerRefs.current[device.device_serial] = marker;
            // }}
            onClick={() => setSelectedDevice(device)}
          />

        ))}

        {selectedDevice && (
          <InfoWindow
            position={{
              lat: selectedDevice.latitude,
              lng: selectedDevice.longitude,
            }}
            onCloseClick={() => setSelectedDevice(null)}
          >
            <div>
              <h3><strong>Device:</strong> {selectedDevice.device_serial}</h3>
              <p><strong>Vehicle:</strong> {selectedDevice.vehicle_name} {selectedDevice.vehicle_model} {selectedDevice.vehicle_year}</p>
              <p><strong>Registration:</strong> {selectedDevice.vehicle_reg}</p>
              <p><strong>Date/Time:</strong> {new Date(selectedDevice.time * 1000).toLocaleString()}</p>
              <p><strong>Speed:</strong> {selectedDevice.speed} km/h</p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}

export default FleetMap;
