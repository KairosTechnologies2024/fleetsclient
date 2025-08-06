import React, { useEffect, useState } from "react";
import {
  Table, Thead, Tbody, Tr, Th, Td, Spinner, Center, Heading, Button,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  Stack, Box, Input, InputGroup, InputRightElement, Circle, Tooltip, Flex, Text
} from "@chakra-ui/react";
import { GoogleMap, MarkerF, useLoadScript } from "@react-google-maps/api";
import { Outlet, useNavigate } from "react-router-dom";
import VehicleDetailComponent from "./VehicleDetails";
import { getFleetData } from "hooks/fleetService";
import { parseWKBLocation } from "API/apiHelper";

const endPin = require("assets/endPin.png");
const mapContainerStyle = { width: "100%", height: "500px" };
const defaultCenter = { lat: -25.746111, lng: 28.188056 };
const API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

function Fleet() {
  const navigate = useNavigate();
  const { isLoaded } = useLoadScript({ googleMapsApiKey: API_KEY });
  const [fleet, setFleet] = useState([]);
  const [lockStatusMap, setLockStatusMap] = useState({});
  const [loading, setLoading] = useState(true); // Initial loading state for fleet data
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [isTracking, setIsTracking] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false); // State for filtering loading

  useEffect(() => {
    // getFleetData should ideally set loading to false when it's done fetching
    // Make sure your getFleetData function handles setting setLoading(false)
    getFleetData(setFleet, setLoading);
  }, []);

  // Fetch initial lock status for all vehicles after fleet is loaded
  useEffect(() => {
    // Only fetch lock statuses if fleet data has been loaded and it's not empty
    if (!loading && fleet.length === 0) return; // If fleet is loaded but empty, no statuses to fetch

    const fetchLockStatuses = async () => {
      try {
        const res = await fetch("https://fleetsvehicleapi.onrender.com/api/lockStatuses");
        if (res.ok) {
          const data = await res.json();
          const statusMap = {};
          const statusLookup = {};

          data.lockStatuses.forEach(({ serial_number, status }) => {
            statusLookup[serial_number] = status;
          });

          fleet.forEach(vehicle => {
            const apiStatus = statusLookup[vehicle.device_serial];
            let statusLabel;

            if (Number(apiStatus) === 1) {
              statusLabel = "LOCKED";
            } else if (Number(apiStatus) === 0) {
              statusLabel = "UNLOCKED";
            } else if (apiStatus !== undefined) {
              statusLabel = "LOCK JAMMED !";
            } else {
              statusLabel = "NO DATA";
            }

            statusMap[vehicle.device_serial] = { status: statusLabel, timestamp: Date.now() };
          });
          setLockStatusMap(prev => ({ ...statusMap, ...prev }));
        }
      } catch (e) {
        console.error("Error fetching lock statuses:", e);
        const errorStatusMap = {};
        fleet.forEach(vehicle => {
          errorStatusMap[vehicle.device_serial] = { status: "NO DATA", timestamp: Date.now() };
        });
        setLockStatusMap(errorStatusMap);
      }
    };
    // Only call fetchLockStatuses if fleet is not empty or loading is complete
    if (fleet.length > 0 || !loading) {
      fetchLockStatuses();
    }
  }, [fleet, loading]); // Added loading to dependency array

  useEffect(() => {
    if (isTracking && selectedLocation) {
      setMapCenter({
        lat: selectedLocation.latitude || defaultCenter.lat,
        lng: selectedLocation.longitude || defaultCenter.lng,
      });
    }
  }, [selectedLocation, isTracking]);

  useEffect(() => {
    const ws = new WebSocket("wss://fleetsgpsapi.onrender.com");

    ws.onopen = () => console.log("Connected to WebSocket");
    ws.onerror = (error) => console.error("WebSocket Error:", error);

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "gps_update" || message.type === "alert_update") {
          const gpsUpdates = message.type === "gps_update"
            ? message.data.map((item) => {
                const { latitude, longitude } = parseWKBLocation(item.location);
                return {
                  device_serial: item.device_serial,
                  latitude,
                  longitude,
                  speed: item.speed,
                  timestamp: Number(item.time),
                };
              })
            : [];

          const alertUpdates = message.type === "alert_update"
            ? message.data.map((alert) => ({
                device_serial: alert.device_serial,
                alert: alert.alert.toUpperCase(),
                timestamp: Number(alert.time),
              }))
            : [];

          setFleet((prevFleet) =>
            prevFleet.map((device) => {
              const gpsUpdate = gpsUpdates.find((d) => d.device_serial === device.device_serial);
              return gpsUpdate ? { ...device, ...gpsUpdate } : device;
            })
          );

          setLockStatusMap((prev) => {
            const updated = { ...prev };
            alertUpdates.forEach((alert) => {
              const validStatuses = ["LOCKED", "UNLOCKED", "LOCK JAMMED !"];
              if (validStatuses.includes(alert.alert)) {
                const prevEntry = updated[alert.device_serial];
                if (!prevEntry || alert.timestamp > prevEntry.timestamp) {
                  updated[alert.device_serial] = {
                    status: alert.alert,
                    timestamp: alert.timestamp,
                  };
                }
              }
            });
            return updated;
          });

          // WebSocket updates don't necessarily mean initial loading is done.
          // The `getFleetData` function should control `setLoading(false)`.
        }
      } catch (err) {
        console.error("Error handling WebSocket message:", err);
      }
    };

    ws.onclose = () => console.log("Disconnected from WebSocket");
    return () => ws.close();
  }, []);

  const handleClearSearch = () => {
    setSearchTerm("");
    setIsFiltering(false);
  };

  const filteredFleet = fleet.filter((vehicle) => {
    const term = searchTerm.toLowerCase();
    return (
      vehicle.vehicle_name?.toLowerCase().includes(term) ||
      vehicle.vehicle_model?.toLowerCase().includes(term) ||
      String(vehicle.vehicle_year).includes(term)
    );
  });

  useEffect(() => {
    if (searchTerm !== "") {
      setIsFiltering(true);
      const timer = setTimeout(() => {
        setIsFiltering(false);
      }, 0);
      return () => clearTimeout(timer);
    } else {
      setIsFiltering(false);
    }
  }, [searchTerm, fleet]);

  const getLockStatusColor = (entry) => {
    const status = entry?.status;
    if (status === "LOCKED") return "red.400";
    if (status === "UNLOCKED") return "green.400";
    if (status === "LOCK JAMMED !") return "yellow.400";
    return "gray.300";
  };

  const getLockStatusLabel = (entry) => {
    return entry?.status || "UNKNOWN";
  };

  if (!isLoaded) return <Spinner size="xl" />; // Google Maps API loading

  return (
    <>
      <Center flexDirection="column" p={6} w="full">
        <Heading mb={6} size="lg">Vehicle List</Heading>

        <Box w="full" maxW="600px" mb={4}>
          <InputGroup>
            <Input
              placeholder="Search by name, model, or year"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <InputRightElement width="4.5rem">
                <Button size="sm" onClick={handleClearSearch}>
                  Clear
                </Button>
              </InputRightElement>
            )}
          </InputGroup>
        </Box>

        {/* Primary Loading State: Check `loading` first */}
        {loading ? (
          <Center minH="200px"><Spinner size="xl" /></Center>
        ) : (
          <Box w="full" overflowX="auto">
            <Table variant="striped" colorScheme="gray" w="full">
              <Thead>
                <Tr>
                  <Th>Vehicle Name</Th>
                  <Th>Model</Th>
                  <Th>Year</Th>
                  <Th>Latitude</Th>
                  <Th>Longitude</Th>
                  <Th>Speed (km/h)</Th>
                  <Th>Timestamp</Th>
                  <Th>Lock Status</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {/* Secondary Loading State for Filtering */}
                {isFiltering ? (
                  <Tr>
                    <Td colSpan={9}>
                      <Center p={4}><Spinner size="md" /></Center>
                    </Td>
                  </Tr>
                ) : (
                  // Display based on filteredFleet length when not filtering
                  filteredFleet.length === 0 ? (
                    <Tr>
                      <Td colSpan={9}>
                        <Center p={4}>
                          <Text fontSize="lg" color="gray.500">
                            {searchTerm ? `No results found for "${searchTerm}".` : "No vehicles to display."}
                          </Text>
                        </Center>
                      </Td>
                    </Tr>
                  ) : (
                    filteredFleet.map((item) => {
                      const lockStatusEntry = lockStatusMap[item.device_serial];
                      return (
                        <Tr key={item.device_serial}>
                          <Td>{item.vehicle_name}</Td>
                          <Td>{item.vehicle_model}</Td>
                          <Td>{item.vehicle_year}</Td>
                          <Td>{item.latitude ? item.latitude.toFixed(6) : "-"}</Td>
                          <Td>{item.longitude ? item.longitude.toFixed(6) : "-"}</Td>
                          <Td>{item.speed ?? "-"} km/h</Td>
                          <Td>
                            {item.timestamp
                              ? new Date(item.timestamp * 1000).toLocaleString()
                              : "-"}
                          </Td>
                          <Td>
                            <Tooltip label={getLockStatusLabel(lockStatusEntry)}>
                              <Circle size="16px" bg={getLockStatusColor(lockStatusEntry)} />
                            </Tooltip>
                          </Td>
                          <Td>
                            <Stack direction="row" spacing={3}>
                              <Button
                                size="sm"
                                colorScheme="blue"
                                onClick={() => {
                                  setSelectedLocation(item);
                                  setMapCenter({
                                    lat: item.latitude || defaultCenter.lat,
                                    lng: item.longitude || defaultCenter.lng,
                                  });
                                  setIsTracking(true);
                                }}
                              >
                                View on Map
                              </Button>
                              <Button
                                size="sm"
                                colorScheme="green"
                                onClick={() => {
                                  navigate(`/protected/vehicles/vehicle-details/${item.device_serial}`);
                                }}
                              >
                                Details
                              </Button>
                            </Stack>
                          </Td>
                        </Tr>
                      );
                    })
                  )
                )}
              </Tbody>
            </Table>
          </Box>
        )}

        {selectedLocation && (
          <Modal
            isOpen={!!selectedLocation}
            onClose={() => setSelectedLocation(null)}
            size="2xl"
          >
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>
                <Flex direction="row" spacing={4} alignItems="center" gap={4}>
                  <Text>
                    Location: Lat {selectedLocation.latitude}, Long {selectedLocation.longitude}
                  </Text>
                  <Button
                    mb={2}
                    colorScheme="blue"
                    onClick={() => {
                      setMapCenter({
                        lat: selectedLocation.latitude || defaultCenter.lat,
                        lng: selectedLocation.longitude || defaultCenter.lng,
                      });
                      setIsTracking(true);
                    }}
                  >
                    Track
                  </Button>
                </Flex>
              </ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <Center>
                  <Box w="full" maxH="500px" overflow="hidden">
                    <GoogleMap
                      mapContainerStyle={{ width: "100%", height: "500px", borderRadius: "10px" }}
                      center={mapCenter}
                      zoom={13}
                    >
                      {selectedLocation.latitude && selectedLocation.longitude && (
                        <MarkerF
                          position={{
                            lat: selectedLocation.latitude,
                            lng: selectedLocation.longitude,
                          }}
                          title={`Device: ${selectedLocation.device_serial}`}
                          icon={{
                            url: endPin,
                            scaledSize: window.google?.maps
                              ? new window.google.maps.Size(45, 65)
                              : null,
                          }}
                        />
                      )}
                    </GoogleMap>
                  </Box>
                </Center>
              </ModalBody>
            </ModalContent>
          </Modal>
        )}
      </Center>
    </>
  );
}

export default Fleet;