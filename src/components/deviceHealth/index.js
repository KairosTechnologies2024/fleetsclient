import React, { useEffect, useState } from "react";
import {
  Table, Thead, Tbody, Tr, Th, Td, Spinner, Center, Heading, Button, Text,
  Circle, Tooltip, useToast
} from "@chakra-ui/react";
import { fetchDeviceHealth, fetchMotorHealth, resetDevice } from "API/apiHelper";
import { getFleetData } from "hooks/fleetService";
import DeviceLogs from "./deviceLogs/DeviceLogs";

function DeviceHealth() {
  const [deviceHealthData, setDeviceHealthData] = useState([]);
  const [motorHealthData, setMotorHealthData] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fleetLoading, setFleetLoading] = useState(false);
 const [showDeviceLog, setShowDeviceLog]= useState(false);
 const [serialNumber, setSerialNumber]= useState(null);
 
  const toast = useToast();

  const loadAllData = async () => {
    setLoading(true);
    try {
      await getFleetData(setFleet, setFleetLoading);

      const [devices, motors] = await Promise.all([
        fetchDeviceHealth(),
        fetchMotorHealth()
      ]);
      setDeviceHealthData(devices);
      setMotorHealthData(motors);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const formatTimestamp = (timestamp) => {
    const ts = Number(timestamp);
    if (isNaN(ts)) return timestamp;
    const date = new Date(ts * 1000);
    return date.toLocaleString();
  };

  const isStale = (timestamp) => {
    const ts = Number(timestamp);
    if (isNaN(ts)) return true;
    const date = new Date(ts * 1000);
    const now = new Date();
    const diffInMs = now - date;
    const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
    return diffInMs > twoDaysInMs;
  };

  const fleetDeviceSerials = fleet.map((vehicle) => vehicle.device_serial);

  const filteredDeviceHealth = deviceHealthData.filter((device) =>
    fleetDeviceSerials.includes(device.device_serial)
  );

  const motorMap = motorHealthData.reduce((acc, motor) => {
    const list = acc[motor.device_serial] || [];
    list.push(motor);
    acc[motor.device_serial] = list;
    return acc;
  }, {});

  const handleReset = async (serial) => {
    try {
      await resetDevice(serial);
      toast({
        title: "Reset sent successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Reset failed",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDeviceLogs = (deviceSerial)=>{


    setSerialNumber(deviceSerial);
    setShowDeviceLog(true);
  }

  return (
    <>
    {showDeviceLog? (
    <DeviceLogs showDeviceLog={showDeviceLog} setShowDeviceLog= {setShowDeviceLog} serialNumber={serialNumber}/>) :null}
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