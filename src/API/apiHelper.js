import axios from "axios";

//Production
/* const API_URL_DEVICES = "https://fleetsgpsapi.onrender.com/api/data";
const API_URL_ALERTS = "https://fleetsgpsapi.onrender.com/api/alerts";
const API_URL_VEHICLES = "http://fleetsvehicleapi.onrender.com/api/vehicles";

const API_URL_DEVICE_HEALTH = "https://fleetsgpsapi.onrender.com/api/deviceHealth";
const API_URL_MOTOR_HEALTH = "https://fleetsgpsapi.onrender.com/api/motorHealth";
const API_URL_TRIP_REPORT = "http://fleetsvehicleapi.onrender.com/api/tripReports";
const API_URL_IGNITION = "https://fleetsgpsapi.onrender.com/api/ignitionStatus";
const API_URL_RESET_DEVICE = "http://fleetsvehicleapi.onrender.com/api/reset"; */



/* const API_URL_IGNITION = "http://localhost:3001/api/ignitionStatus"; */
//Local
/* const API_URL_DEVICES = "http://localhost:3001/api/data";
 const API_URL_ALERTS = "http://localhost:3001/api/alerts";
const API_URL_VEHICLES = "http://localhost:3002/api/vehicles";

const API_URL_DEVICE_HEALTH = "http://localhost:3001/api/deviceHealth";
 const API_URL_MOTOR_HEALTH = "http://localhost:3001/api/motorHealth";
 const API_URL_TRIP_REPORT = "http://localhost:3002/api/tripReports";
 const API_URL_IGNITION = "http://localhost:3001/api/ignitionStatus";
 const API_URL_RESET_DEVICE = "http://localhost:3002/api/reset"; */


//On render

const REACT_APP_AUTH_TOKEN= process.env.REACT_APP_AUTH_TOKEN;

const API_URL_DEVICES = "https://fleetsgpsapi.onrender.com/api/data";
const API_URL_ALERTS = "https://fleetsgpsapi.onrender.com/api/alerts";
const API_URL_VEHICLES = "https://fleetsvehicleapi.onrender.com/api/vehicles";

const API_URL_DEVICE_HEALTH = "https://fleetsgpsapi.onrender.com/api/deviceHealth";
const API_URL_MOTOR_HEALTH = "https://fleetsgpsapi.onrender.com/api/motorHealth";
const API_URL_TRIP_REPORT = "https://fleetsvehicleapi.onrender.com/api/tripReports";
const API_URL_IGNITION = "https://fleetsgpsapi.onrender.com/api/ignitionStatus";
const API_URL_RESET_DEVICE = "https://fleetsvehicleapi.onrender.com/api/reset";



//Devices
// Function to parse HEX format
export function parseWKBLocation(wkbHex) {
    if (!wkbHex || wkbHex.length < 34) return { latitude: null, longitude: null };

    // Convert hex 
    const buffer = new Uint8Array(
        wkbHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
    );

    const dataView = new DataView(buffer.buffer);

    // Determine endianness
    const isLittleEndian = buffer[0] === 1;

    // Read Longitude 
    const longitude = dataView.getFloat64(9, isLittleEndian);

    // Read Latitude
    const latitude = dataView.getFloat64(17, isLittleEndian);

    // console.log(`Parsed WKB Location -> Lat: ${latitude}, Lng: ${longitude}`);

    return { latitude, longitude };
}


//Fetch all fleet devices
export async function fetchFleet(limit = 10) {
    try {
        const response = await axios.get(`${API_URL_DEVICES}?limit=${limit}`,
            {
            headers:{
                'authorization': process.env.REACT_APP_AUTH_TOKEN,
            }
    });
        console.log("Raw API Response:", response.data);

        const parsedData = response.data.map(item => {
            console.log(`Raw WKB HEX for ${item.device_serial}:`, item.location);

            const parsedLocation = parseWKBLocation(item.location);
            console.log(`Parsed Location for ${item.device_serial}:`, parsedLocation);

            return {
                ...item,
                timestamp: parseInt(item.time, 10),
                ...parsedLocation
            };
        });

        console.log("Final Parsed Fleet Data:", parsedData);
        return parsedData;
    } catch (error) {
        console.error("Error fetching fleet data:", error.response?.data || error.message);
        return [];
    }

}

//fetch latest coords for each device
export async function fetchUniqueFleet(limit = 10) {
    try {
        const response = await axios.get(`${API_URL_DEVICES}/latest`,{
            headers:{
                'authorization': process.env.REACT_APP_AUTH_TOKEN,
            }});
        console.log("Raw API Response:", response.data);

        const parsedData = response.data.map(item => {
            console.log(`Raw WKB HEX for ${item.device_serial}:`, item.location);

            const parsedLocation = parseWKBLocation(item.location);
            console.log(`Parsed Location for ${item.device_serial}:`, parsedLocation);

            return {
                ...item,
                timestamp: parseInt(item.time, 10),
                ...parsedLocation
            };
        });

        console.log("Final Parsed Fleet Data:", parsedData);
        return parsedData;
    } catch (error) {
        console.error("Error fetching fleet data:", error.response?.data || error.message);
        return [];
    }
}

// Fetch latest coordinates for a unique device
export async function fetchLatestCoordinates(deviceSerial) {
    try {
        const response = await axios.get(`${API_URL_DEVICES}/${deviceSerial}/coordinates`,
            {
            headers:{
                'authorization': process.env.REACT_APP_AUTH_TOKEN,
            }
    });
        console.log(`Latest Coordinates for ${deviceSerial}:`, response.data);

        const parsedLocation = parseWKBLocation(response.data.location);
        console.log(`Parsed Location for ${deviceSerial}:`, parsedLocation);

        return {
            ...response.data,
            ...parsedLocation,
            timestamp: parseInt(response.data.time, 10),
        };
    } catch (error) {
        console.error(`Error fetching latest coordinates for ${deviceSerial}:`, error.response?.data || error.message);
        return null;
    }
}

//Alerts
// Fetch all alerts
export async function fetchAlerts() {
    try {
        const response = await axios.get(`${API_URL_ALERTS}`,
            {
            headers:{
                'authorization': process.env.REACT_APP_AUTH_TOKEN,
            }}
        );
        console.log("Fetched Alerts:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error fetching alerts:", error.response?.data || error.message);
        return [];
    }
}

//Fetch top 200
export async function fetchTop200Alerts() {
    try {
        const response = await axios.get(`${API_URL_ALERTS}/latest200`,
            {
            headers:{
                'authorization': process.env.REACT_APP_AUTH_TOKEN,
            }
    });
        console.log("Fetched Alerts:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error fetching alerts:", error.response?.data || error.message);
        return [];
    }
}

//Fetch top 200 for each device
export async function fetchTop200AlertsDevice() {
    try {
        const response = await axios.get(`${API_URL_ALERTS}/top200`,
            {
            headers:{
                'authorization': process.env.REACT_APP_AUTH_TOKEN,
            }
    });
        // console.log("Fetched Top 200 Alerts per Device:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error fetching top 200 alerts per device:", error.response?.data || error.message);
        return [];
    }
}

// Fetch alerts for a specific device
export async function fetchDeviceAlerts(deviceSerial, limit = 10) {
    try {
        const response = await axios.get(`${API_URL_ALERTS}/${deviceSerial}?limit=${limit}`,
            {
            headers:{
                'authorization': process.env.REACT_APP_AUTH_TOKEN,
            }
    });
        console.log(`Fetched Alerts for ${deviceSerial}:`, response.data);
        return response.data;
    } catch (error) {
        console.error(`Error fetching alerts for ${deviceSerial}:`, error.response?.data || error.message);
        return [];
    }
}

//Vehciles
// Fetch all vehicles



export async function fetchVehicles(limit = 10) {
    try {
        const response = await fetch(`${API_URL_VEHICLES}`,{
            headers:{
                'authorization': process.env.REACT_APP_AUTH_TOKEN,
            }});

        if (!response.ok) {
            throw new Error(`Error fetching vehicles: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error in fetchVehicles:", error);
        throw error;
    }
}

// Fetch unique vehicle by device_serial number
export async function fetchUniqueVehicle(device_serial, limit = 10) {
    const safeDeviceSerial = device_serial ?? 0;

    try {
        const response = await fetch(`${API_URL_VEHICLES}/${safeDeviceSerial}`,{
            headers:{
                'authorization': process.env.REACT_APP_AUTH_TOKEN,
            }
        });

        if (response.ok) {
            const data = await response.json();
            return data[0];
        } else {
            console.error("Error fetching vehicle data:", response.statusText);
            return null;
        }
    } catch (error) {
        console.error(`Error in fetchUniqueVehicle for ${safeDeviceSerial}:`, error);
        throw error;
    }
}

export async function fetchUniqueFleetMerged() {
    try {
        const vehiclesRes = await axios.get(`${API_URL_VEHICLES}`,{
            headers:{
                'authorization': process.env.REACT_APP_AUTH_TOKEN,
            }
    });
        const devicesRes = await axios.get(`${API_URL_DEVICES}/latest`, {
            headers:{
                'authorization': process.env.REACT_APP_AUTH_TOKEN,
            }});

        const devicesMap = new Map(
            devicesRes.data.map(device => [device.device_serial, device])
        );

        const merged = vehiclesRes.data.map(vehicle => {
            const device = devicesMap.get(vehicle.device_serial);
            const parsedLocation = device ? parseWKBLocation(device.location) : { latitude: null, longitude: null };

            return {
                ...device,
                ...vehicle,
                timestamp: device ? parseInt(device.time, 10) : null,
                ...parsedLocation
            };
        });

        return merged;
    } catch (error) {
        console.error("Error merging fleet and vehicle data:", error);
        return [];
    }
}

//Utilities 
//Device Health
export async function fetchDeviceHealth() {
    try {
        const response = await fetch(`${API_URL_DEVICE_HEALTH}`,{
            headers:{
                'authorization': process.env.REACT_APP_AUTH_TOKEN,
            },
            
    });

        if (!response.ok) {
            throw new Error(`Error fetching Device Health: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error in fetchDeviceHealth:", error);
        throw error;
    }
}

//Motor Health
export async function fetchMotorHealth() {
    try {
        const response = await fetch(`${API_URL_MOTOR_HEALTH}`, {
            headers:{
                'authorization': process.env.REACT_APP_AUTH_TOKEN,
     } });

        if (!response.ok) {
            throw new Error(`Error fetching Device Health: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error in fetchDeviceHealth:", error);
        throw error;
    }
}

//Reset device
export async function resetDevice(serial_number, status = 1) {
    try {
        const res = await fetch(`${API_URL_RESET_DEVICE}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "authorization": process.env.REACT_APP_AUTH_TOKEN,
            },
            body: JSON.stringify({ serial_number, status }),
        });

        if (!res.ok) throw new Error("Failed to send reset command");

        const data = await res.json();
        return data;
    } catch (err) {
        console.error("❌ Error resetting device:", err);
        throw err;
    }
}

//Trip Reports
export async function fetchTripReport(deviceId) {
    const res = await fetch(`${API_URL_TRIP_REPORT}/${deviceId}`,{
            headers:{
                'authorization': process.env.REACT_APP_AUTH_TOKEN,
            }});

    if (!res.ok) throw new Error("Failed to fetch trip data");

    const data = await res.json();

    const parsed = data
        .map((trip) => {
            const start = trip.start_location ? parseWKBLocation(trip.start_location) : null;
            const end = trip.end_location ? parseWKBLocation(trip.end_location) : null;

            if (!start || !end) return null;

            return {
                device_serial: trip.device_serial,
                kilometres: trip.kilometres,
                start_time: trip.start_time,
                end_time: trip.end_time,
                start,
                end,
                path: trip.path ?? [],
            };
        })
        .filter(Boolean);


    return parsed;
}


// Ignition status
export async function fetchIgnitionStatusFromAPI(serial) {
    try {
        const res = await fetch(`${API_URL_IGNITION}/${serial}`,
            {
            headers:{
                'authorization': process.env.REACT_APP_AUTH_TOKEN,
            }
    });
        if (!res.ok) throw new Error("Failed to fetch ignition status");

        const data = await res.json();
console.log("Ignition API response:", data); // Add this line
   
        // Get the latest record based on timestamp if needed
        const latest = data.reduce((a, b) =>
            parseInt(a.time) > parseInt(b.time) ? a : b
        );

        const status = latest?.ignition_status?.toLowerCase();
        console.log("API Ignition Status", status);

        if (status === "on" || status === "off") {
            return status;
        } else {
            return null;
        }
    } catch (err) {
        console.error("Error fetching ignition status:", err);
        return null;
    }
}
