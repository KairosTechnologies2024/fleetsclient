import React, { useState, useEffect, useRef } from "react";
import { Spinner } from "@chakra-ui/react";
import {
    Box,
    Text,
    Heading,
    Button,
    Stack,
    Divider,
    Center,
    SimpleGrid,
    HStack,
    useToast,
} from "@chakra-ui/react";
import { GoogleMap, MarkerF, useLoadScript } from "@react-google-maps/api";
import { fetchLatestCoordinates, parseWKBLocation, fetchIgnitionStatusFromAPI } from "API/apiHelper";
import { fetchAddress } from "hooks/fleetService";
import { useNavigate, useParams } from "react-router-dom";
import { Flex } from "@chakra-ui/react";
const endPin = require("assets/endPin.png");

//production
const API_URL_VEHICLES = "http://ekco-tracking.co.za:3002";
const API_URL_ALERTS = "http://ekco-tracking.co.za:3001/api/alerts";
const API_WEB_SOCKET = "ws://ekco-tracking.co.za:3001";

//local
// const API_URL_VEHICLES = "http://localhost:3002";
// const API_URL_ALERTS = "http://localhost:3001/api/alerts";
// const API_WEB_SOCKET = "ws://localhost:3001";

const mapContainerStyle = {
    width: "100%",
    height: "400px",
};

const defaultCenter = { lat: -25.746111, lng: 28.188056 };
const mapZoom = 13;
const API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

function VehicleDetailComponent({ onClose }) {
    const { id } = useParams();
    const mapRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [loadingStatus, setLoadingStatus] = useState(false);
    const [loadingAddress, setLoadingAddress] = useState(false);
    const [isArmed, setIsArmed] = useState(null);
    const [ignitionStatus, setIgnitionStatus] = useState(null);
    const [vehicle, setVehicle] = useState(null);
    const [location, setLocation] = useState(defaultCenter);
    const [mapCenter, setMapCenter] = useState(defaultCenter);
    const [isTracking, setIsTracking] = useState(true);
    const [address, setAddress] = useState("");
    const [liveSpeed, setLiveSpeed] = useState(0);
    const [liveTimestamp, setLiveTimestamp] = useState(null);
    const [deviceAlerts, setDeviceAlerts] = useState([]);
    const navigate = useNavigate();

    const { isLoaded } = useLoadScript({
        googleMapsApiKey: API_KEY || "",
    });

    const toast = useToast();

    // Fetch vehicle data and alerts in parallel by id
    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [vehicleRes, alertRes] = await Promise.all([
                    fetch(`${API_URL_VEHICLES}/api/vehicles`),
                    fetch(API_URL_ALERTS)
                ]);
                const vehicles = await vehicleRes.json();
                const alertsData = await alertRes.json();
                if (!isMounted) return;
                const match = vehicles.find((v) => v.device_serial === id);
                if (match) {
                    setVehicle(match);
                    setLocation({
                        lat: match.latitude || defaultCenter.lat,
                        lng: match.longitude || defaultCenter.lng,
                    });
                    setMapCenter({
                        lat: match.latitude || defaultCenter.lat,
                        lng: match.longitude || defaultCenter.lng,
                    });
                    setLiveSpeed(match.speed || 0);
                    setLiveTimestamp(match.timestamp || null);
                    setIsArmed(match.lock_status === "LOCKED");
                }
                const matchedAlerts = alertsData
                    .filter((a) => a.device_serial === id)
                    .sort((a, b) => parseInt(b.time) - parseInt(a.time));
                setDeviceAlerts(matchedAlerts);
                if (matchedAlerts[0]) {
                    const lastAlert = matchedAlerts[0].alert.toUpperCase();
                    if (lastAlert === "LOCKED") setIsArmed(true);
                    else if (lastAlert === "UNLOCKED") setIsArmed(false);
                }
            } catch (err) {
                console.error("Failed to fetch vehicle or alert status", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        if (id) fetchData();
        return () => { isMounted = false; };
    }, [id]);

    // Fetch ignition status
    useEffect(() => {
        const getIgnitionStatus = async () => {
            if (!id) return;
            const status = await fetchIgnitionStatusFromAPI(id);
            setIgnitionStatus(status);
        };
        getIgnitionStatus();
    }, [id]);

    // WebSocket updates
    useEffect(() => {
        if (!id) return;
        const ws = new WebSocket(API_WEB_SOCKET);
        ws.onopen = () => console.log("VehicleDetails.js: ✅ Connected to WebSocket");
        ws.onerror = (error) => console.error("VehicleDetails.js: ❌ WebSocket Error:", error);
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === "gps_update") {
                    const updates = message.data.map((item) => {
                        const { latitude, longitude } = parseWKBLocation(item.location);
                        return {
                            device_serial: item.device_serial,
                            latitude,
                            longitude,
                            speed: item.speed,
                            timestamp: Number(item.time),
                        };
                    });
                    const matched = updates.find((d) => d.device_serial === id);
                    if (matched) {
                        setLiveSpeed(matched.speed);
                        setLiveTimestamp(matched.timestamp);
                        setLocation({ lat: matched.latitude, lng: matched.longitude });
                    }
                    setLoading(false);
                } else if (message.type?.toLowerCase() === "alert_update") {
                    const alerts = message.data.map((alert) => ({
                        device_serial: alert.device_serial,
                        alert: alert.alert,
                        time: alert.time,
                    }));
                    const relevant = alerts.filter((a) => a.device_serial === id);
                    if (relevant.length) {
                        const latest = relevant[0];
                        const upperAlert = latest.alert.toUpperCase();
                        if (upperAlert === "LOCKED") setIsArmed(true);
                        else if (upperAlert === "UNLOCKED") setIsArmed(false);
                        setDeviceAlerts((prev) => {
                            if (
                                prev.length > 0 &&
                                prev[0].time === latest.time &&
                                prev[0].alert === latest.alert
                            ) {
                                return prev;
                            }
                            return [latest, ...prev];
                        });
                    }
                } else if (message.type?.toLowerCase() === "engine_update") {
                    const cleanSerial = (s) => s?.replace(/[{}]/g, "").trim().toLowerCase();
                    const incoming = cleanSerial(id);
                    const updates = message.data.filter(
                        (entry) => cleanSerial(entry.device_serial) === incoming
                    );
                    if (updates.length > 0) {
                        const latest = updates.reduce((a, b) =>
                            parseInt(a.time) > parseInt(b.time) ? a : b
                        );
                        const status = latest.ignition_status?.toLowerCase();
                        setIgnitionStatus(status);
                    } else {
                        fetchIgnitionStatusFromAPI(id);
                    }
                }
            } catch (err) {
                console.error("VehicleDetails.js: Error handling WebSocket message:", err);
            }
        };
        ws.onclose = () => console.log("VehicleDetails.js: Disconnected from WebSocket");
        return () => ws.close();
    }, [id]);

    // Polling fallback for alert history (every 2 seconds)
    useEffect(() => {
        if (!id) return;
        let isMounted = true;
        const interval = setInterval(async () => {
            try {
                const alertRes = await fetch(API_URL_ALERTS);
                const alertsData = await alertRes.json();
                const matchedAlerts = alertsData
                    .filter((a) => a.device_serial === id)
                    .sort((a, b) => parseInt(b.time) - parseInt(a.time));
                if (!isMounted) return;
                setDeviceAlerts((prev) => {
                    if (
                        prev.length > 0 &&
                        matchedAlerts.length > 0 &&
                        prev[0].time === matchedAlerts[0].time &&
                        prev[0].alert === matchedAlerts[0].alert
                    ) {
                        return prev;
                    }
                    return matchedAlerts;
                });
            } catch (err) {
                // Optionally log polling error
            }
        }, 2000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [id]);

    useEffect(() => {
        if (isTracking && mapRef.current) {
            mapRef.current.panTo(location);
            setMapCenter(location);
        }
    }, [location, isTracking]);

    const toggleArmedStatus = async () => {
        if (!vehicle) return;
        const newStatus = !isArmed;
        setIsArmed(newStatus);
        setLoadingStatus(true);
        try {
            const response = await fetch(`${API_URL_VEHICLES}/api/lockVehicle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    serial_number: vehicle.device_serial,
                    status: newStatus ? 1 : 0,
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Unknown error");
            toast({
                title: `Vehicle ${newStatus ? "Armed" : "Disarmed"}`,
                description: result.message,
                status: "success",
                duration: 4000,
                isClosable: true,
            });
        } catch (error) {
            setIsArmed(!newStatus);
            toast({
                title: "Failed to update lock",
                description: error.message,
                status: "error",
                duration: 4000,
                isClosable: true,
            });
        } finally {
            setLoadingStatus(false);
        }
    };

    const handleUnjamLock = async () => {
        if (!vehicle) return;
        setLoadingStatus(true);
        try {
            const response = await fetch(`${API_URL_VEHICLES}/api/lockVehicle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    serial_number: vehicle.device_serial,
                    status: 0,
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Unknown error");
            setIsArmed(false);
            toast({
                title: "Vehicle Un-jammed and Disarmed",
                description: result.message,
                status: "success",
                duration: 4000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: "Failed to un-jam lock",
                description: error.message,
                status: "error",
                duration: 4000,
                isClosable: true,
            });
        } finally {
            setLoadingStatus(false);
        }
    };

    const refreshMap = async () => {
        if (!vehicle) return;
        setLoading(true);
        const coords = await fetchLatestCoordinates(vehicle.device_serial);
        if (coords) {
            setLocation({
                lat: coords.latitude || defaultCenter.lat,
                lng: coords.longitude || defaultCenter.lng,
            });
        }
        setLoading(false);
    };

    const getAddress = async () => {
        setLoadingAddress(true);
        try {
            const addr = await fetchAddress(location.lat, location.lng);
            setAddress(addr);
        } catch (err) {
            toast({
                title: "Address fetch failed",
                description: err.message,
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setLoadingAddress(false);
        }
    };

    if (loading || !vehicle) {
        return (
            <Flex position="fixed" top={0} left={0} w="100vw" h="100vh" align="center" justify="center" bg="white" zIndex={9999}>
                <Spinner size="xl" thickness="4px" speed="0.65s" color="teal.500" />
            </Flex>
        );
    }

    return (
        <Box p={6} bg="gray.50" borderRadius="lg" boxShadow="md">
<Button colorScheme="blue" onClick={() => navigate("/protected/vehicles")}>← Back</Button>
            <Heading size="lg" mt={4} textAlign="center">
                {vehicle.vehicle_name}
            </Heading>

            <Stack spacing={6} p={6} bg="white" borderRadius="md" boxShadow="sm">
                <SimpleGrid columns={3} spacing={6} w="full">
                    <Text><strong>Vehicle Brand:</strong> {vehicle.vehicle_name || "N/A"}</Text>
                    <Text><strong>Model:</strong> {vehicle.vehicle_model || "N/A"}</Text>
                    <Text><strong>Year:</strong> {vehicle.vehicle_year || "N/A"}</Text>
                    <Text><strong>License Plate:</strong> {vehicle.vehicle_reg || "N/A"}</Text>
                    <Text><strong>Colour:</strong> {vehicle.vehicle_colour || "N/A"}</Text>
                    <Text><strong>Device Serial:</strong> {vehicle.device_serial || "N/A"}</Text>
                </SimpleGrid>

                <Divider />

                <SimpleGrid columns={3} spacing={6} w="full">
                    <Text><strong>Speed:</strong> {liveSpeed} km/h</Text>
                    <Text><strong>Longitude:</strong> {location.lng || "N/A"}</Text>
                    <Text><strong>Latitude:</strong> {location.lat || "N/A"}</Text>
                    <Text>
                        <strong>Date/Time:</strong>{" "}
                        {liveTimestamp ? new Date(liveTimestamp * 1000).toLocaleString() : "N/A"}
                    </Text>

                    {/* Ignition Status */}
                    <Box>
                        <Text fontWeight="bold" mb={1}>Engine Status:</Text>
                        <Text color={
                            ignitionStatus === "on" ? "green.500" :
                                ignitionStatus === "off" ? "red.500" :
                                    "gray.500"
                        }>
                            {ignitionStatus === null ? "Waiting for ignition data..." : ignitionStatus.toUpperCase()}
                        </Text>
                    </Box>

                    {/* Lock, Unlock & Unjam Buttons*/}
                    <Box>
                        <Text fontWeight="bold" mb={1}>Lock Status:</Text>
                        <HStack spacing={4}>
                            <Button
                                size="md"
                                colorScheme="green"
                                onClick={() => !isArmed && toggleArmedStatus()}
                                isDisabled={isArmed || loadingStatus || isArmed === null}
                            >
                                Activate
                            </Button>
                            <Button
                                size="md"
                                colorScheme="red"
                                onClick={() => isArmed && toggleArmedStatus()}
                                isDisabled={!isArmed || loadingStatus || isArmed === null}
                            >
                                Deactivate
                            </Button>
                            <Button
                                size="md"
                                colorScheme="yellow"
                                onClick={handleUnjamLock}
                                isDisabled={
                                    !deviceAlerts.length ||
                                    !deviceAlerts[0].alert?.toUpperCase().includes("LOCK JAMMED") ||
                                    loadingStatus
                                }
                            >
                                Un-jam Lock
                            </Button>
                        </HStack>
                    </Box>
                </SimpleGrid>
            </Stack>

            {/* Alert History */}
            <Box mt={6} p={4} bg="white" borderRadius="md" boxShadow="sm">
                <Heading size="md" mb={2}>Alert History</Heading>
                {deviceAlerts.length === 0 ? (
                    <Text color="gray.500">No alerts available for this device.</Text>
                ) : (
                    <Box maxHeight="220px" overflowY="auto">
                        <Stack spacing={3}>
                            {deviceAlerts.slice(0, 10).map((alert, index) => (
                                <Box
                                    key={index}
                                    p={3}
                                    borderWidth="1px"
                                    borderRadius="md"
                                    bg={
                                        alert.alert?.toUpperCase() === "LOCK JAMMED !" ? "yellow.100" :
                                            alert.alert?.toUpperCase() === "LOCKED" ? "green.50" :
                                                alert.alert?.toUpperCase() === "UNLOCKED" ? "red.50" :
                                                    "white"
                                    }
                                >
                                    <Text><strong>Type:</strong> {alert.alert}</Text>
                                    <Text><strong>Time:</strong> {new Date(parseInt(alert.time) * 1000).toLocaleString()}</Text>
                                </Box>
                            ))}
                        </Stack>
                    </Box>
                )}
            </Box>

            <Box mt={6}>
                <Button
                    colorScheme="teal"
                    width="100%"
                    size="lg"
                    onClick={() => {
                        if (!vehicle) return;
                        const cleanSerial = vehicle.device_serial.replace(/[{}]/g, "");
                        navigate(`/protected/vehicles/tripReport/${cleanSerial}`);
                    }}
                >
                    Vehicle Trip Reports
                </Button>
            </Box>

            {/* Address */}
            <Box mt={6} p={4} bg="white" borderRadius="md" boxShadow="sm">
                <HStack justify="space-between" mb={2}>
                    <Heading size="md">Approximate Vehicle Address</Heading>
                    <Button size="sm" onClick={getAddress} isLoading={loadingAddress} colorScheme="blue">
                        Get Address
                    </Button>
                </HStack>
                <Text color="gray.600">{address || "No address fetched yet."}</Text>
            </Box>

            {/* Map */}
            <Box mt={6} p={4} bg="white" borderRadius="md" boxShadow="sm">
                <Heading size="md" mb={2}>Approximate Vehicle Location</Heading>
                {isLoaded ? (
<GoogleMap
    mapContainerStyle={mapContainerStyle}
    zoom={mapZoom}
    center={mapCenter}
    onLoad={(map) => { mapRef.current = map; }}
    onDragStart={() => setIsTracking(false)}
>
    <MarkerF
        key={vehicle.device_serial}
        position={{ lat: location.lat, lng: location.lng }}
        title={`Device: ${vehicle.device_serial}`}
        icon={{
            url: endPin,
            scaledSize: new window.google.maps.Size(45, 65),
        }}
    />
</GoogleMap>
                ) : (
                    <Center p={4}><Text color="gray.500">Loading map...</Text></Center>
                )}
            </Box>

            <Flex direction="column" alignItems="center">
                <Button
                    colorScheme="teal"
                    mb={2}
                    onClick={() => {
                        setMapCenter({
                            lat: location.lat,
                            lng: location.lng,
                        });
                        setIsTracking(true);
                    }}
                >
                    Track
                </Button>
                <Button colorScheme="teal" onClick={refreshMap} isLoading={loading}>
                    Refresh Map
                </Button>
           </Flex>
        </Box>
    );
}

export default VehicleDetailComponent;
