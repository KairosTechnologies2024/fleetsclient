import { fetchUniqueVehicle, fetchTop200Alerts, fetchUniqueFleetMerged } from "API/apiHelper";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import axios from "axios";

const auth = getAuth();
const db = getFirestore();
const API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const getUserCompanyId = async (email) => {
  if (!email) return null;

  try {
    // Check fleetControllers collection
    const controllersQuery = query(collection(db, "fleetControllers"), where("email", "==", email));
    const controllersSnapshot = await getDocs(controllersQuery);

    if (!controllersSnapshot.empty) {
      return controllersSnapshot.docs[0].data().company_id;
    }

    // Check fleetCustomers collection
    const customersQuery = query(collection(db, "fleetCustomers"), where("email", "==", email));
    const customersSnapshot = await getDocs(customersQuery);

    if (!customersSnapshot.empty) {
      return customersSnapshot.docs[0].data().company_id;
    }

    return null;
  } catch (error) {
    console.error("Error fetching user company_id:", error);
    return null;
  }
};

export const getFleetData = async (setFleet, setLoading) => {
  setLoading(true);
  const loggedInEmail = auth.currentUser?.email;

  try {
    const userCompanyId = await getUserCompanyId(loggedInEmail);

    if (!userCompanyId) {
      console.warn("No company_id found for the logged-in user.");
      setFleet([]); // No data if no company_id is found
      setLoading(false);
      return;
    }

    // const data = await fetchUniqueFleet();
    const data = await fetchUniqueFleetMerged();
    
    // Fetch vehicle details and filter by company_id
    const fleetWithVehicleInfo = await Promise.all(
      data.map(async (device) => {
        try {
          const vehicleData = await fetchUniqueVehicle(device.device_serial);
          
          if (vehicleData?.company_id !== userCompanyId) {
            return null; // Exclude vehicles that don't match the company_id
          }

          return {
            ...device,
            vehicle_name: vehicleData?.vehicle_name || "N/A",
            vehicle_model: vehicleData?.vehicle_model || "N/A",
            vehicle_year: vehicleData?.vehicle_year || "N/A",
            vehicle_reg: vehicleData?.vehicle_reg || "N/A",
            vehicle_colour: vehicleData?.vehicle_colour || "N/A",
            vehicle_device_serial: vehicleData?.device_serial ?? 0,
            vehicle_company_id: vehicleData?.company_id || "N/A",
          };
        } catch (error) {
          console.error("Error fetching vehicle data:", error);
          return null;
        }
      })
    );

    // Filter out null values (vehicles that didn't match company_id)
    setFleet(fleetWithVehicleInfo.filter(Boolean));
  } catch (error) {
    console.error("Error fetching fleet data:", error);
  } finally {
    setLoading(false);
  }
};

export const fetchAddress = async (lat, lng) => {
  try {
      const response = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}`
      );
      if (response.data.status === "OK") {
          return response.data.results[0]?.formatted_address || "Address not found";
      } else {
          return "Address not found";
      }
  } catch (error) {
      console.error("Error fetching address:", error);
      return "Error fetching address";
  }
};

export const fetchAlertData = async (setAlerts, setVehicles, setIsLoadingAlerts, setIsLoadingVehicles) => {
  setIsLoadingAlerts(true);
  setIsLoadingVehicles(true);

  try {
      const fetchedAlerts = await fetchTop200Alerts();

      // Fetch fleet data
      await getFleetData(setVehicles, setIsLoadingVehicles);

      // Map API response to expected format for alerts
      const mappedAlerts = fetchedAlerts.map((alert) => ({
          alertType: alert.alert,
          deviceSerial: alert.device_serial,
          date: new Date(parseInt(alert.time) * 1000).toLocaleString(),
      }));

      setAlerts(mappedAlerts);
  } catch (error) {
      console.error("Error fetching data:", error);
      setAlerts([]);
      setVehicles([]);
  }

  setIsLoadingAlerts(false);
};