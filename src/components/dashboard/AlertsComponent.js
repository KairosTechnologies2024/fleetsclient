import React, { useState, useEffect, useRef } from "react";
import {
  Flex,
  Heading,
  Avatar,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Center,
  Spinner,
  Button,
  Box,
  useToast 
  
} from "@chakra-ui/react";
import { fetchTop200AlertsDevice } from "API/apiHelper";
import { getFleetData } from "hooks/fleetService";
import VehicleDetailComponent from "../vehicles/VehicleDetails";
import { useNavigate } from "react-router-dom";

import remote from "assets/remote.png";
import chain from "assets/chain.png";
import door from "assets/car-door.png";
import sound from "assets/sounds/error.mp3"

function AlertsComponent() {
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);

  const toast = useToast();
  const loadedAlertKeysRef = useRef(new Set());
  const alertSoundRef = useRef(new Audio(sound));

  const fetchAlertData = async () => {
    setIsLoadingAlerts(true);
    setIsLoadingVehicles(true);

    try {
      const fetchedAlerts = await fetchTop200AlertsDevice();

      await getFleetData((fetchedVehicles) => {
        setVehicles(fetchedVehicles);
      }, setIsLoadingVehicles);

      // Identify truly new alerts (not already in loadedAlertKeysRef)
      const trulyNewFetchedAlerts = fetchedAlerts.filter((alert) => {
        const key = `${alert.device_serial}-${alert.time}-${alert.alert}`;
        return !loadedAlertKeysRef.current.has(key);
      });

      // Show toast for each new alert
      trulyNewFetchedAlerts.forEach((alert) => {
        toast({
          title: "New Alert Received",
          description: `${alert.alert} - ${new Date(parseInt(alert.time) * 1000).toLocaleString()}`,
          status: "info",
          duration: 4000,
          isClosable: true,
          position: "top-right",
        });
      });

      // Play sound if there are new alerts
      if (trulyNewFetchedAlerts.length > 0) {
        alertSoundRef.current.play().catch((e) => {
          console.warn("Autoplay blocked or error playing sound:", e);
        });
      }

      const mappedAlerts = fetchedAlerts.map((alert) => {
        const key = `${alert.device_serial}-${alert.time}-${alert.alert}`;
        loadedAlertKeysRef.current.add(key);
        return {
          alertType: alert.alert,
          deviceSerial: alert.device_serial,
          date: new Date(parseInt(alert.time) * 1000).toLocaleString(),
          rawTime: parseInt(alert.time),
          isNew: false // always false on load
        };
      });

      setAlerts(
        mappedAlerts.sort((a, b) => b.rawTime - a.rawTime).slice(0, 200)
      );
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoadingAlerts(false);
    }
  };

  useEffect(() => {
    fetchAlertData();
  }, []);

  useEffect(() => {
    // const ws = new WebSocket('ws://localhost:3001');
    const ws = new WebSocket("wss://fleetsgpsapi.onrender.com");

    // const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    // const ws = new WebSocket(`${protocol}://${window.location.hostname}:3001`);

    ws.onopen = () => {
      console.log("✅ Connected to WebSocket for alerts");
    };

    ws.onerror = (err) => {
      console.error("❌ WebSocket error:", err);
    };

    ws.onclose = () => {
      // console.log("🔌 WebSocket connection closed");
    };

    ws.onmessage = (event) => {
      // console.log("🟢 WebSocket message received:", event.data);

      let message;
      try {
        message = JSON.parse(event.data);
      } catch (err) {
        console.error("❌ Failed to parse WebSocket message:", err);
        return;
      }

      // console.log("📨 Parsed WebSocket message:", message);

      if (message.type?.toLowerCase() === "alert_update") {
        const parsedAlerts = message.data.map((alert) => {
          const rawTime = parseInt(alert.time);
          return {
            alertType: alert.alert,
            deviceSerial: alert.device_serial,
            date: new Date(rawTime * 1000).toLocaleString(),
            rawTime,
          };
        });

        // console.log("📥 Parsed alerts:", parsedAlerts);

        const trulyNewAlerts = parsedAlerts.filter((alert) => {
          const key = `${alert.deviceSerial}-${alert.rawTime}-${alert.alertType}`;
          return !loadedAlertKeysRef.current.has(key);
        });

        // console.log("🆕 Truly new alerts:", trulyNewAlerts);

        if (trulyNewAlerts.length > 0) {
          alertSoundRef.current.play().catch((e) => {
            console.warn("Autoplay blocked or error playing sound:", e);
          });
        }

        trulyNewAlerts.forEach((alert) => {
          toast({
            title: "New Alert Received",
            description: `${alert.alertType} - ${alert.date}`,
            status: "info",
            duration: 4000,
            isClosable: true,
            position: "top-right",
          });
        });

        const alertsWithNewFlag = parsedAlerts.map((alert) => {
          const key = `${alert.deviceSerial}-${alert.rawTime}-${alert.alertType}`;
          return {
            ...alert,
            isNew: !loadedAlertKeysRef.current.has(key),
          };
        });

        setAlerts((prevAlerts) => {
          const combined = [...alertsWithNewFlag, ...prevAlerts];
          const uniqueAlerts = Array.from(
            new Map(
              combined.map((item) => {
                const key = `${item.deviceSerial}-${item.rawTime}-${item.alertType}`;
                loadedAlertKeysRef.current.add(key);
                return [key, item];
              })
            ).values()
          );

          return uniqueAlerts.sort((a, b) => b.rawTime - a.rawTime).slice(0, 200);
        });

        setTimeout(() => {
          setAlerts((prev) =>
            prev.map((a) =>
              trulyNewAlerts.some(
                (na) =>
                  na.deviceSerial === a.deviceSerial &&
                  na.rawTime === a.rawTime &&
                  na.alertType === a.alertType
              )
                ? { ...a, isNew: false }
                : a
            )
          );
        }, 5000);
      }
    };


    return () => ws.close();
  }, []);

  const getVehicleDetails = (deviceSerial) =>
    vehicles.find((v) => v.vehicle_device_serial === deviceSerial) || {};

  const filteredAlerts = alerts.filter((alert) =>
    vehicles.some((vehicle) => vehicle.vehicle_device_serial === alert.deviceSerial)
  );

  if (selectedVehicle) {
    return (
      <VehicleDetailComponent
        vehicle={selectedVehicle}
        onClose={() => setSelectedVehicle(null)}
      />
    );
  }

  return (
    <Center flexDirection="column" p={6} w="full">
      <Heading mb={6} size="lg">
        Critical Alerts
      </Heading>

      {isLoadingAlerts || isLoadingVehicles ? (
        <Center minH="200px">
          <Spinner size="xl" />
        </Center>
      ) : (
        <Box w="full">
          <Button onClick={fetchAlertData} colorScheme="teal" size="sm" mb={4}>
            Refresh
          </Button>
          <Table variant="striped" colorScheme="gray" w="full">
            <Thead>
              <Tr>
                <Th>Alert Type</Th>
                <Th>Vehicle</Th>
                <Th>No. Plate</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredAlerts.length === 0 ? (
                <Tr>
                  <Td colSpan={4}>
                    <Center>
                      <Heading size="sm" color="gray.500">
                        No critical alerts found.
                      </Heading>
                    </Center>
                  </Td>
                </Tr>
              ) : (
                filteredAlerts.map((alert, idx) => {
                  const vehicle = getVehicleDetails(alert.deviceSerial);
                  const icon =
                    alert.alertType === "Possible remote jamming detected !"
                      ? remote
                      : alert.alertType === "Door opened"
                        ? door
                        : chain;

                  return (
                    <Tr
                      key={idx}
                      bg={alert.isNew ? "blue.100" : undefined}
                      transition="background-color 0.5s ease"
                    >
                      <Td>
                        <Flex align="center">
                          <Avatar size="sm" mr={2} src={icon} />
                          <Flex direction="column">
                            <Heading size="sm" letterSpacing="tight">
                              {alert.alertType}
                            </Heading>
                            <Text fontSize="sm" color="gray">
                              {alert.date}
                            </Text>
                          </Flex>
                        </Flex>
                      </Td>
                      <Td>
                        {vehicle.vehicle_year || "Unknown Year"}{" "}
                        {vehicle.vehicle_name || "Unknown Model"}{" "}
                        {vehicle.vehicle_model || ""}
                      </Td>
                      <Td>{vehicle.vehicle_reg || "Unknown Plate"}</Td>
                      <Td>
                        <Button
                          colorScheme="green"
                          onClick={() => setSelectedVehicle(vehicle)}
                        >
                          View
                        </Button>
                      </Td>
                    </Tr>
                  );
                })
              )}
            </Tbody>
          </Table>
        </Box>
      )}
    </Center>
  );
}


export default AlertsComponent;