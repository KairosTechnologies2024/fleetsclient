
import React, { useContext, useEffect, useState } from "react";
import {
  Table, Thead, Tbody, Tr, Th, Td, Spinner, Center, Heading, Button, Text,
  Circle, Tooltip, useToast
} from "@chakra-ui/react";
import { fetchDeviceHealth, fetchMotorHealth, resetDevice } from "API/apiHelper";
import { getFleetData } from "hooks/fleetService";



export const FleetsAppContext = React.createContext();



export const AppContext = ({ children }) => {
   
/* DEVICE HEALTH */

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
    <FleetsAppContext.Provider value={{
     showDeviceLog, setShowDeviceLog, serialNumber, loadAllData, loading, fleetLoading,
     filteredDeviceHealth, isStale, motorMap, formatTimestamp, handleReset, handleDeviceLogs, loading, filteredDeviceHealth
    }}>
      {children}
    </FleetsAppContext.Provider>
  );
};


