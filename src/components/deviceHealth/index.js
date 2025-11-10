import React, { useContext, useEffect, useState, useMemo } from "react";
import { Box } from "@chakra-ui/react";
import {
  Table, Thead, Tbody, Tr, Th, Td, Spinner, Center, Heading, Button, Text,
  Circle, Tooltip, useToast, Input
} from "@chakra-ui/react";
import { fetchDeviceHealth, fetchMotorHealth, resetDevice } from "../../API/apiHelper.js";
import { getFleetData } from "hooks/fleetService";
import DeviceLogs from "./deviceLogs/DeviceLogs";
import { AppContext, FleetsAppContext } from "store/AppContext";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../../assets/ekco-original logo.png';

function DeviceHealth() {
  const { showDeviceLog, loadAllData, fleetLoading,
    isStale, motorMap, formatTimestamp, handleReset,
    handleDeviceLogs, loading, filteredDeviceHealth } = useContext(FleetsAppContext);
  const [autoLockMap, setAutoLockMap] = useState({});
  const [fleet, setFleet] = useState([]);
  const [fleetLoadingLocal, setFleetLoadingLocal] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  const generatePDF = () => {
    const pdf = new jsPDF('l', 'mm', 'a4'); // landscape orientation

    // Add logo
    const img = new Image();
    img.src = logo;
    pdf.addImage(img, 'PNG', 14, 10, 30, 15); // x, y, width, height

    // Add title
    pdf.setFontSize(18);
    pdf.text('Device Health Report', 50, 20);
    pdf.setFontSize(12);
    pdf.text(`Generated on: ${new Date().toLocaleString()}`, 50, 30);

    // Prepare table data
    const tableColumns = [
      'Status',
      'Device Serial',
      'Fleet Number',
      'Car Battery Status',
      'Device Battery Voltage',
      'Firmware Version',
      'Board Revision',
      'Gyro Health Status',
      'Motor Serial',
      'Motor Cycles',
      'Time'
    ];

    const tableRows = [];

    filteredDevices.forEach(device => {
      const stale = isStale(device.time);
      const motors = motorMap[device.device_serial] || [];
      const fleetNumber = fleetNumberMap[device.device_serial] || 'N/A';

      if (motors.length === 0) {
        // Device with no motors
        tableRows.push([
          stale ? 'Stale' : 'Healthy',
          device.device_serial,
          fleetNumber,
          device.car_battery_status ? 'On' : 'Off',
          device.device_battery_voltage,
          device.firmware_version,
          device.board_revision,
          device.gyro_health_status === true || device.gyro_health_status === "true" || device.gyro_health_status === 1 ? 'Healthy' : 'Unhealthy',
          'N/A',
          'N/A',
          formatTimestamp(device.time)
        ]);
      } else {
        // Devices with motors
        motors.forEach((motor, index) => {
          tableRows.push([
            index === 0 ? (stale ? 'Stale' : 'Healthy') : '',
            index === 0 ? device.device_serial : '',
            index === 0 ? fleetNumber : '',
            index === 0 ? (device.car_battery_status ? 'Connected' : 'Disconnected') : '',
            index === 0 ? device.device_battery_voltage : '',
            index === 0 ? device.firmware_version : '',
            index === 0 ? device.board_revision : '',
            index === 0 ? (device.gyro_health_status === true || device.gyro_health_status === "true" || device.gyro_health_status === 1 ? 'Healthy' : 'Unhealthy') : '',
            motor.motor_serial,
            motor.motor_cycles,
            index === 0 ? formatTimestamp(device.time) : ''
          ]);
        });
      }
    });

    // Generate table
    autoTable(pdf, {
      head: [tableColumns],
      body: tableRows,
      startY: 40,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { top: 40 },
    });

    pdf.save('device-health-report.pdf');
  };

  // Filter devices based on search term
  const filteredDevices = filteredDeviceHealth.filter(device => {
    const fleetNumber = fleetNumberMap[device.device_serial] || '';
    return fleetNumber.toLowerCase().includes(searchTerm.toLowerCase());
  });

 // console.log("filtered devices health ", filteredDeviceHealth)
  return (
    <>
      {showDeviceLog ? (
        <DeviceLogs />) : null}
      <Heading mb={4}>Device Health</Heading>
      <Box mb={4} display="flex" alignItems="center" gap={4}>
        <Input
          placeholder="Search by Fleet Number"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          width="300px"
        />
        <Button onClick={loadAllData} isLoading={loading}>
          Refresh
        </Button>
        <Button onClick={generatePDF} colorScheme="blue">
          Generate PDF Report
        </Button>
      </Box>

      {(loading || fleetLoading || fleetLoadingLocal) && filteredDevices.length === 0 ? (
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
              {filteredDevices.map((device) => {
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
      {(!loading && filteredDevices.length === 0) && (
        <Text>No device health data available for your fleet.</Text>
      )}
    </>
  );
}

export default DeviceHealth;