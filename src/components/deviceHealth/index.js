import React, { useContext, useEffect, useState, useMemo } from "react";
import { Box } from "@chakra-ui/react";
import {
  Table, Thead, Tbody, Tr, Th, Td, Spinner, Center, Heading, Button, Text,
  Circle, Tooltip, useToast
} from "@chakra-ui/react";
import { fetchDeviceHealth, fetchMotorHealth, resetDevice } from "../../API/apiHelper.js";
import { getFleetData } from "hooks/fleetService";
import DeviceLogs from "./deviceLogs/DeviceLogs";
import { AppContext, FleetsAppContext } from "store/AppContext";

function DeviceHealth() {
  const { showDeviceLog, loadAllData, fleetLoading,
    isStale, motorMap, formatTimestamp, handleReset,
    handleDeviceLogs, loading, filteredDeviceHealth } = useContext(FleetsAppContext);
  const [autoLockMap, setAutoLockMap] = useState({});
  const [fleet, setFleet] = useState([]);
  const [fleetLoadingLocal, setFleetLoadingLocal] = useState(true);

  const toast = useToast();
  useEffect(() => {
    loadAllData();
  }, [])

  useEffect(() => {
    getFleetData(setFleet, setFleetLoadingLocal);
  }, [])

  const handleToggleAutoLock = async (deviceSerial, currentState) => {
    const newState = !currentState;

    try {
      const endpoint = newState
        ? `http://ekco-tracking.co.za:3002/locks/enable-auto-lock/${deviceSerial}`
        : `http://ekco-tracking.co.za:3002/locks/disable-auto-lock/${deviceSerial}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to toggle auto lock');
      }

      toast({
        title: `Auto lock ${newState ? 'enabled' : 'disabled'}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      loadAllData(); //refreshing data from DB to get auto_lock status
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
  };


  const fleetNumberMap = useMemo(() => {
    const map = {};
    fleet.forEach(vehicle => {
      map[vehicle.device_serial] = vehicle.fleet_number || 'N/A';
    });
    return map;
  }, [fleet]);
 // console.log("filtered devices health ", filteredDeviceHealth)
  return (
    <>
      {showDeviceLog ? (
        <DeviceLogs />) : null}
      <Heading mb={4}>Device Health</Heading>
      <Button mb={4} onClick={loadAllData} isLoading={loading}>
        Refresh
      </Button>

      {(loading || fleetLoading || fleetLoadingLocal) && filteredDeviceHealth.length === 0 ? (
        <Center><Spinner size="xl" /></Center>
      ) : (
      <Box overflowX="auto" width="100%" height="80vh" overflowY="auto">
          <Table size="sm" overflowX={'scroll'}>
            <Thead position="sticky" top={0} bg="gray.100" zIndex={1}>
              <Tr>
                <Th>Status</Th>
                <Th>Device Serial</Th>
                <Th>Fleet Number</Th>
                <Th>Car Battery Status</Th>
                <Th>Device Battery Voltage</Th>
                <Th>Firmware Version</Th>
                <Th>Board Revision</Th>
                <Th>Gyro Health Status</Th>
                <Th>Motor Serial</Th>
                <Th>Motor Cycles</Th>
                <Th>Time</Th>
               {/*  <Th>Logs</Th> */}
              {/*   <Th>AutoLock</Th> */}
                <Th>Reset</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredDeviceHealth.map((device) => {
                const stale = isStale(device.time);
                const motors = motorMap[device.device_serial] || [];
                const autoLockEnabled = device.auto_lock;

                // Render for devices with NO motors
                if (motors.length === 0) {
                  return (
                    <Tr key={device.device_serial}>
                      <Td>
                        <Tooltip label={stale ? "Stale (>2 days old)" : "Healthy"}>
                          <Circle size="12px" bg={stale ? "red.500" : "green.500"} />
                        </Tooltip>
                      </Td>
                      <Td>{device.device_serial}</Td>
                      <Td>{fleetNumberMap[device.device_serial] || 'N/A'}</Td>
                      <Td>{device.car_battery_status ? "On" : "Off"}</Td>
                      <Td>{device.device_battery_voltage}</Td>
                      <Td>{device.firmware_version}</Td>
                      <Td>{device.board_revision}</Td>
                      <Td colSpan={1}>
                        <Text color="gray.400" fontStyle="italic">No motors</Text>
                      </Td>
                      <Td></Td> {/* Empty for Motor Serial */}
                      <Td></Td> {/* Empty for Motor Cycles */}
                      <Td>{formatTimestamp(device.time)}</Td>
                      {/* **Added View Logs button here** */}
                     {/*  <Td>
                        <Button
                          colorScheme="green"
                          width="100%"
                          onClick={() => handleDeviceLogs(device.device_serial)}
                        >
                          View Logs
                        </Button>
                      </Td> */}
                      <Td>
                        <Button
                          colorScheme={autoLockEnabled ? "red" : "green"}
                          size="sm"
                          onClick={() => handleToggleAutoLock(device.device_serial, autoLockEnabled)}
                        >
                          {autoLockEnabled ? "Disable" : "Enable"}
                        </Button>
                      </Td>
                      <Td>
                        <Button
                          colorScheme="green"
                          width="100%"
                          onClick={() => handleReset(device.device_serial)}
                        >
                          Reset
                        </Button>
                      </Td>
                    </Tr>
                  );
                }

                // Render for devices WITH motors
                return motors.map((motor, index) => (
                  <Tr key={`${device.device_serial}-${motor.motor_serial}`}>
                    <Td>
                      {index === 0 && (
                        <Tooltip label={stale ? "Stale (>2 days old)" : "Healthy"}>
                          <Circle size="12px" bg={stale ? "red.500" : "green.500"} />
                        </Tooltip>
                      )}
                    </Td>
                    <Td>{index === 0 ? device.device_serial : null}</Td>
                    <Td>{index === 0 ? (fleetNumberMap[device.device_serial] || 'N/A') : null}</Td>
                    <Td>{index === 0 ? (device.car_battery_status ? "Connected" : "Disconnected") : null}</Td>
                    <Td>{index === 0 ? device.device_battery_voltage : null}</Td>
                    <Td>{index === 0 ? device.firmware_version : null}</Td>
                    <Td>{index === 0 ? device.board_revision : null}</Td>
                    <Td>
                      {index === 0
                        ? (
                          device.gyro_health_status === true ||
                          device.gyro_health_status === "true" ||
                          device.gyro_health_status === 1
                        )
                          ? <Text>Healthy</Text>
                          : <Text>Unhealthy</Text>
                        : null}
                    </Td>
                    <Td>{motor.motor_serial}</Td>
                    <Td>{motor.motor_cycles}</Td>
                    <Td>{index === 0 ? formatTimestamp(device.time) : null}</Td>
                    {/* Show View Logs button ONLY on first row for the device (index === 0) */}
                   {/*  <Td>
                      {index === 0 && (
                        <Button
                          colorScheme="green"
                          width="100%"
                          onClick={() => handleDeviceLogs(device.device_serial)}
                        >
                          View Logs
                        </Button>
                      )}
                    </Td> */}
                  {/*   <Td>
                      {index === 0 && (
                        <Button
                          colorScheme={autoLockEnabled ? "red" : "green"}
                          size="sm"
                          onClick={() => handleToggleAutoLock(device.device_serial, autoLockEnabled)}
                        >
                          {autoLockEnabled ? "Disable" : "Enable"}
                        </Button>
                      )}
                    </Td> */}
                    <Td>
                      {index === 0 && (
                        <Button
                          colorScheme="green"
                          width="100%"
                          onClick={() => handleReset(device.device_serial)}
                        >
                          Reset
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ));
              })}
            </Tbody>
          </Table>
        </Box>
      )}
      {(!loading && filteredDeviceHealth.length === 0) && (
        <Text>No device health data available for your fleet.</Text>
      )}
    </>
  );
}

export default DeviceHealth;