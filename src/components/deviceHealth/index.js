import React, { useContext, useEffect, useState } from "react";
import {
  Table, Thead, Tbody, Tr, Th, Td, Spinner, Center, Heading, Button, Text,
  Circle, Tooltip, useToast
} from "@chakra-ui/react";
import { fetchDeviceHealth, fetchMotorHealth, resetDevice } from "API/apiHelper";
import { getFleetData } from "hooks/fleetService";
import DeviceLogs from "./deviceLogs/DeviceLogs";
import { AppContext, FleetsAppContext } from "store/AppContext";

function DeviceHealth() {
   
  const { showDeviceLog, loadAllData, fleetLoading,
     isStale, motorMap, formatTimestamp, handleReset, 
     handleDeviceLogs, loading, filteredDeviceHealth}= useContext(FleetsAppContext);
useEffect(() => {
  loadAllData();
}, [])
  return (
    <>
    {showDeviceLog? (
    <DeviceLogs/>) :null}
      <Heading mb={4}>Device Health</Heading>
      <Button mb={4} onClick={loadAllData} isLoading={loading}>
        Refresh
      </Button>

      {(loading || fleetLoading) && filteredDeviceHealth.length === 0 ? (
        <Center><Spinner size="xl" /></Center>
      ) : (
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Status</Th>
              <Th>Device Serial</Th>
              <Th>Car Battery Status</Th>
              <Th>Device Battery Voltage</Th>
              <Th>Firmware Version</Th>
              <Th>Board Revision</Th>
                 <Th>Gyro Health Status</Th>
              <Th>Motor Serial</Th>
              <Th>Motor Cycles</Th>
              <Th>Time</Th>
              <Th>Logs</Th>
              <Th>Reset Button</Th>
            </Tr>
          </Thead>
          <Tbody>

            {filteredDeviceHealth.map((device) => {
              const stale = isStale(device.time);
              const motors = motorMap[device.device_serial] || [];

              if (motors.length === 0) {
                return (
                  <Tr key={device.device_serial}>
                    <Td>
                      <Tooltip label={stale ? "Stale (>2 days old)" : "Healthy"}>
                        <Circle size="12px" bg={stale ? "red.500" : "green.500"} />
                      </Tooltip>
                    </Td>
                    <Td>{device.device_serial}</Td>
                    <Td>{device.car_battery_status ? "On" : "Off"}</Td>
                    <Td>{device.device_battery_voltage}</Td>
                    <Td>{device.firmware_version}</Td>
                    <Td>{device.board_revision}</Td>
                 
                    <Td colSpan={2}>
                      <Text color="gray.400" fontStyle="italic">No motors</Text>
                    </Td>
                    <Td>{formatTimestamp(device.time)}</Td>
                    <Td colSpan={2}>
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
                  <Td>{index === 0 ? (device.car_battery_status ? "Connected" : "Disconnected") : null}</Td>
                  <Td>{index === 0 ? device.device_battery_voltage : null}</Td>
                  <Td>{index === 0 ? device.firmware_version : null}</Td>
                  <Td>{index === 0 ? device.board_revision : null}</Td>
<Td>
  {index === 0
    ? (
        device.gyro_health_status === true ||
        device.gyro_health_status === 'true' ||
        device.gyro_health_status === 1
      )
      ? <Text>Healthy</Text>
      : <Text>Unhealthy</Text>
    : null}
</Td>
                  <Td>{motor.motor_serial}</Td>
                  <Td>{motor.motor_cycles}</Td>
                  <Td>{index === 0 ? formatTimestamp(device.time) : null}</Td>
                  <Td>{device.logs ? (<Button
                        colorScheme="green"
                        width="100%"
                        onClick={ ()=>
                           handleDeviceLogs(device.device_serial) 
                        }
                      >
                        View Logs
                      </Button>) : <Text>null</Text> }</Td>
                  <Td colSpan={2}>
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
      )}
      {(!loading && filteredDeviceHealth.length === 0) && (
        <Text>No device health data available for your fleet.</Text>
      )}
    </>
  );
}

export default DeviceHealth;