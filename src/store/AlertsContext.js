import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { collection, query, orderBy, where, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from 'lib/firebase';
import { useToast } from '@chakra-ui/react';
import { fetchTop200AlertsDevice } from "API/apiHelper";
import { getFleetData } from 'hooks/fleetService';
import VehicleDetailComponent from 'components/vehicles/VehicleDetails';
import { useNavigate } from "react-router-dom";

import remote from "assets/remote.png";
import chain from "assets/chain.png";
import door from "assets/car-door.png";
import sound from "assets/sounds/error.mp3"

export const AlertsContext = React.createContext();



export const AlertsProvider = ({ children }) => {
    const [selectedVehicle, setSelectedVehicle] = useState(null);
  

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
    /*   trulyNewFetchedAlerts.forEach((alert) => {
        toast({
          title: "New Alert Received",
          description: `${alert.alert} - ${new Date(parseInt(alert.time) * 1000).toLocaleString()}`,
          status: "info",
          duration: 3000,
          isClosable: true,
          position: "top",
        });
      }); */

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
            title: `New Alert For ${alert.deviceSerial.toString()}`,
            description: `${alert.alertType} - ${alert.date}`,
            status: "info",
            duration: 4000,
            isClosable: true,
            position: "top",
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
    <AlertsContext.Provider value={{isLoadingAlerts, isLoadingVehicles,
        fetchAlertData,filteredAlerts, getVehicleDetails, setSelectedVehicle
     
    }}>
      {children}
    </AlertsContext.Provider>
  );
};

export const useAlertsContext = () => useContext(AlertsContext);
