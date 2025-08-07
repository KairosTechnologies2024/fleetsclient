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
import { AlertsContext } from "store/AlertsContext";
import { useContext } from "react";

function AlertsComponent() {

const {isLoadingAlerts, isLoadingVehicles,
        fetchAlertData,filteredAlerts, getVehicleDetails, setSelectedVehicle}= useContext(AlertsContext);
 const navigate = useNavigate();
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