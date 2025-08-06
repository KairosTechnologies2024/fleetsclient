import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useToast } from "@chakra-ui/react";

const AlertContext = createContext();

export const useAlertContext = () => useContext(AlertContext);

export const AlertService = ({ children }) => {
  const [latestAlerts, setLatestAlerts] = useState([]);
  const toast = useToast();
  const ws = useRef(null);

  useEffect(() => {
    // ws.current = new WebSocket("ws://localhost:3001");
    ws.current = new WebSocket("ws://ekco-tracking.co.za:3001");

    ws.current.onopen = () => console.log("WebSocket connected");

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "alert_update" && Array.isArray(message.data)) {
          const newAlerts = message.data.map((alert) => ({
            alertType: alert.alert,
            deviceSerial: alert.device_serial,
            date: new Date(parseInt(alert.time) * 1000).toLocaleString(),
            rawTime: parseInt(alert.time),
          }));

          setLatestAlerts((prev) => [...newAlerts, ...prev].slice(0, 200));

          // Show toast for each new alert
          newAlerts.forEach((alert) => {
            toast({
              title: "New Alert",
              description: `${alert.alertType} (${alert.deviceSerial})`,
              status: "warning",
              duration: 5000,
              isClosable: true,
              position: "top-right",
            });
          });
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    };

    ws.current.onclose = () => console.log("WebSocket closed");

    return () => ws.current?.close();
  }, []);

  return (
    <AlertContext.Provider value={{ latestAlerts }}>
      {children}
    </AlertContext.Provider>
  );
};
