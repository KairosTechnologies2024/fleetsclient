import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Table, Thead, Tbody, Tr, Th, Td, Spinner, Center, Heading, Button,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  Stack, Box, Input, InputGroup, InputRightElement, Circle, Tooltip, Flex, Text,
  Select, Menu, MenuButton, MenuList, MenuItem, IconButton
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import { GoogleMap, MarkerF, useLoadScript } from "@react-google-maps/api";
import { Outlet, useNavigate } from "react-router-dom";
import VehicleDetailComponent from "./VehicleDetails";
import { getFleetData } from "hooks/fleetService";
import { parseWKBLocation, fetchIgnitionStatusFromAPI } from "API/apiHelper";
import { useAlertsContext } from "store/AlertsContext";

const endPin = require("assets/endPin.png");
const mapContainerStyle = { width: "100%", height: "500px" };
const defaultCenter = { lat: -25.746111, lng: 28.188056 };
const API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const sample= process.env.REACT_APP_SAMPLE;
//console.log("IT WORKS", sample)
const getLockStatusColor = (entry) => {
  const status = entry?.status;
  if (status === "LOCKED") return "red.400";
  if (status === "UNLOCKED") return "green.400";
  if (status === "LOCK JAMMED !") return "yellow.400";
  if (status === "AUTOLOCK ENABLED !") return "pink.300";
  if (status === "AUTOLOCK DISABLED !") return "green.200";
  return "gray.300";
};

const getLockStatusLabel = (entry) => {
  return entry?.status || "UNKNOWN";
};

function Fleet() {
  const navigate = useNavigate();
  const { isLoaded } = useLoadScript({ googleMapsApiKey: API_KEY });
  const { filteredAlerts } = useAlertsContext();
  const [fleet, setFleet] = useState([]);
  const [lockStatusMap, setLockStatusMap] = useState({});
  const [ignitionStatusMap, setIgnitionStatusMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [isTracking, setIsTracking] = useState(true);
  const [lockStatusFilter, setLockStatusFilter] = useState("All");
  const [engineStatusFilter, setEngineStatusFilter] = useState("All");

  // Computed state for a single spinner
  const isLoading = loading || !isLoaded;

  useEffect(() => {
    getFleetData(setFleet, setLoading);
  }, []);

  useEffect(() => {
    async function fetchIgnitionStatuses() {
      if (fleet.length === 0) return;
      const statusMap = {};
      await Promise.all(
        fleet.map(async (vehicle) => {
          try {
            const status = await fetchIgnitionStatusFromAPI(vehicle.device_serial);
            statusMap[vehicle.device_serial] = status ?? "-";
          } catch (error) {
            statusMap[vehicle.device_serial] = "-";
          }
        })
      );
      setIgnitionStatusMap(statusMap);
    }
    fetchIgnitionStatuses();
  }, [fleet]);

  useEffect(() => {
    if (isTracking && selectedLocation) {
      setMapCenter({
        lat: selectedLocation.latitude || defaultCenter.lat,
        lng: selectedLocation.longitude || defaultCenter.lng,
      });
    }
  }, [selectedLocation, isTracking]);

  // New effect to update lockStatusMap based on alerts from AlertsContext
  useEffect(() => {
    if (!fleet.length || !filteredAlerts.length) return;

    const statusMap = {};

    fleet.forEach(vehicle => {
      // Get all alerts for this vehicle's device_serial sorted by time descending
      const alertsForDevice = filteredAlerts
        .filter(alert => alert.deviceSerial === vehicle.device_serial)
        .sort((a, b) => b.rawTime - a.rawTime);

      // Find the first alert with a known lock-related type
      const knownTypes = new Set(["LOCKED", "UNLOCKED", "LOCK JAMMED !", "AUTOLOCK ENABLED !", "AUTOLOCK DISABLED !"]);
      let latestKnownAlert = null;
      for (const alert of alertsForDevice) {
        if (knownTypes.has(alert.alertType)) {
          latestKnownAlert = alert;
          break;
        }
      }

      if (latestKnownAlert) {
        statusMap[vehicle.device_serial] = {
          status: latestKnownAlert.alertType,
          timestamp: latestKnownAlert.rawTime * 1000 // convert to ms
        };
      } else {
        statusMap[vehicle.device_serial] = {
          status: "NO DATA",
          timestamp: null
        };
      }
    });

    setLockStatusMap(statusMap);
  }, [fleet, filteredAlerts]);

  useEffect(() => {
    const ws = new WebSocket("wss://fleetsclient.onrender.com");

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
        } else if (message.type?.toLowerCase() === "engine_update") {
          const updates = message.data;
          setIgnitionStatusMap(prev => {
            const updated = { ...prev };
            updates.forEach(entry => {
              const cleanSerial = entry.device_serial?.replace(/[{}]/g, "").trim().toLowerCase();
              if (cleanSerial) {
                updated[cleanSerial] = entry.ignition_status?.toLowerCase();
              }
            });
            return updated;
          });
        }
      } catch (err) {
        console.error("Error handling WebSocket message:", err);
      }
    };

    ws.onclose = () => console.log("Disconnected from WebSocket");
    return () => ws.close();
  }, []);

  const filteredFleet = useMemo(() => {
    return fleet.filter((vehicle) => {
      const term = searchTerm.toLowerCase();
      const searchMatch = (
        vehicle.vehicle_name?.toLowerCase().includes(term) ||
        vehicle.fleet_number?.toLowerCase().includes(term) ||
        vehicle.device_serial?.toLowerCase().includes(term) ||
        vehicle.vehicle_model?.toLowerCase().includes(term) ||
        vehicle.vehicle_reg?.toLowerCase().includes(term) ||
        String(vehicle.vehicle_year).includes(term)
      );
      const lockStatusEntry = lockStatusMap[vehicle.device_serial];
      const lockStatus = lockStatusEntry?.status;
      const lockMatch = lockStatusFilter === "All" || lockStatus === lockStatusFilter;

      const engineStatus = ignitionStatusMap[vehicle.device_serial];
      const engineMatch = engineStatusFilter === "All" || engineStatus === engineStatusFilter.toLowerCase();

      return searchMatch && lockMatch && engineMatch;
    });
  }, [fleet, searchTerm, lockStatusFilter, engineStatusFilter, lockStatusMap, ignitionStatusMap]);

  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
  }, []);

  const handleGoToVehicle = useCallback(() => {
    if (filteredFleet.length === 1) {
      navigate(`/protected/vehicles/vehicle-details/${filteredFleet[0].device_serial}`);
    }
  }, [filteredFleet, navigate]);

  const VehicleRow = React.memo(({ item, lockStatusMap, ignitionStatusMap, getLockStatusColor, getLockStatusLabel, setSelectedLocation, setMapCenter, setIsTracking, navigate }) => {
    const lockStatusEntry = lockStatusMap[item.device_serial];
    return (
      <Tr>
        <Td>{item.device_serial}</Td>
        <Td>{item.vehicle_reg}</Td>
        <Td>{item.fleet_number}</Td>
        <Td>
          <Text color={
            ignitionStatusMap[item.device_serial] === "on" ? "green.500" :
            ignitionStatusMap[item.device_serial] === "off" ? "red.500" :
            "gray.500"
          }>
            {ignitionStatusMap[item.device_serial]?.toUpperCase() ?? "-"}
          </Text>
        </Td>
        {/* <Td>
          <Tooltip label={getLockStatusLabel(lockStatusEntry)}>
            <Circle size="16px" bg={getLockStatusColor(lockStatusEntry)} />
          </Tooltip>
        </Td> */}
        <Td>{item.speed > 0 ? "Moving" : "Parked"}</Td>
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
  });

  if (isLoading) {
    return (
      <Center minH="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }



  return (
    <>
      <Center flexDirection="column" p={6} w="full">
        <Heading mb={6} size="lg">Vehicle List</Heading>
        <Box w="full" maxW="600px" mb={4}>
          <InputGroup>
            <Input
              placeholder="Search by fleet number, serial, or registration"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredFleet.length === 1) {
                  handleGoToVehicle();
                }
              }}
            />
            {searchTerm && (
              <InputRightElement width={filteredFleet.length === 1 ? "9rem" : "4.5rem"}>
                <Flex direction="row" justify="flex-end">
                  {filteredFleet.length === 1 && (
                    <Button size="sm" mr={1} onClick={handleGoToVehicle}>
                      Go
                    </Button>
                  )}
                  <Button size="sm" onClick={handleClearSearch}>
                    Clear
                  </Button>
                </Flex>
              </InputRightElement>
            )}
          </InputGroup>
        </Box>
        <Box w="full" overflowX="auto" height="80vh" overflowY="auto">
          <Table variant="striped" colorScheme="gray" w="full" >
            <Thead position="sticky" top={0} bg="#fff" zIndex={1}>
              <Tr>
                <Th>Device Serial</Th>
                <Th>Registration</Th>
                <Th>Fleet Number</Th>
                <Th>
                  Engine Status
                  <Menu portal>
                    <MenuButton as={IconButton} icon={<ChevronDownIcon />} size="sm" variant="ghost" ml={2} />
                    <MenuList zIndex={1000}>
                      <MenuItem onClick={() => setEngineStatusFilter("All")}>All</MenuItem>
                      <MenuItem onClick={() => setEngineStatusFilter("on")}>On</MenuItem>
                      <MenuItem onClick={() => setEngineStatusFilter("off")}>Off</MenuItem>
                    </MenuList>
                  </Menu>
                </Th>
                {/* <Th>
                  Lock Status
                  <Menu portal>
                    <MenuButton as={IconButton} icon={<ChevronDownIcon />} size="sm" variant="ghost" ml={2} />
                    <MenuList zIndex={1000}>
                      <MenuItem onClick={() => setLockStatusFilter("All")}>All</MenuItem>
                      <MenuItem onClick={() => setLockStatusFilter("LOCKED")}>Locked</MenuItem>
                      <MenuItem onClick={() => setLockStatusFilter("UNLOCKED")}>Unlocked</MenuItem>
                      <MenuItem onClick={() => setLockStatusFilter("LOCK JAMMED !")}>Jammed</MenuItem>
                      <MenuItem onClick={() => setLockStatusFilter("AUTOLOCK ENABLED !")}>Autolock Enabled</MenuItem>
                      <MenuItem onClick={() => setLockStatusFilter("AUTOLOCK DISABLED !")}>Autolock Disabled</MenuItem>
                      <MenuItem onClick={() => setLockStatusFilter("NO DATA")}>No Data</MenuItem>
                    </MenuList>
                  </Menu>
                </Th> */}
                <Th>Motion</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredFleet.length === 0 ? (
                <Tr>
                  <Td colSpan={6}>
                    <Center p={4}>
                      <Text fontSize="lg" color="gray.500">
                        {searchTerm ? `No results found for "${searchTerm}".` : "No vehicles to display."}
                      </Text>
                    </Center>
                  </Td>
                </Tr>
              ) : (
                filteredFleet.map((item) => (
                  <VehicleRow
                    key={item.device_serial}
                    item={item}
                    lockStatusMap={lockStatusMap}
                    ignitionStatusMap={ignitionStatusMap}
                    getLockStatusColor={getLockStatusColor}
                    getLockStatusLabel={getLockStatusLabel}
                    setSelectedLocation={setSelectedLocation}
                    setMapCenter={setMapCenter}
                    setIsTracking={setIsTracking}
                    navigate={navigate}
                  />
                ))
              )}
            </Tbody>
          </Table>
        </Box>
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
                    {isLoaded ? (
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
                              scaledSize: new window.google.maps.Size(45, 65),
                            }}
                          />
                        )}
                      </GoogleMap>
                    ) : (
                      <Text color="gray.500">Loading map...</Text>
                    )}
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