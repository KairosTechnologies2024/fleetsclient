import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Heading,
  Text,
  Button,
  Input,
  FormControl,
  FormLabel,
  Spinner,
  Stack,
} from "@chakra-ui/react";
import { MapContainer, Polyline, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { fetchTripReport } from "API/apiHelper";
import Papa from "papaparse";
import "leaflet/dist/leaflet.css";

const startPin = require("assets/startPin.png");
const endPin = require("assets/endPin.png");

const startIcon = new L.Icon({
  iconUrl: startPin,
  iconSize: [45, 45],
  iconAnchor: [25, 32],
  popupAnchor: [0, -32],
});

const endIcon = new L.Icon({
  iconUrl: endPin,
  iconSize: [45, 45],
  iconAnchor: [25, 32],
  popupAnchor: [0, -32],
});

const TripReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [trips, setTrips] = useState([]);
  const [error, setError] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    setError(null);
    setTrips([]);
    setShowMap(false);
    setSelectedTrip(null);
    setSearchTerm("");

    try {
      const allTrips = await fetchTripReport(id);
      const fromTs = new Date(startDate).getTime() / 1000;
      const toTs = new Date(endDate).getTime() / 1000;

      const filtered = allTrips.filter(
        (trip) =>
          Number(trip.start_time) >= fromTs && Number(trip.end_time) <= toTs
      );

      setTrips(filtered);
    } catch (err) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!trips.length) return;

    const csvData = trips.map((trip) => ({
      Vehicle: trip.device_serial,
      Kilometres: trip.kilometres,
      "Start Time": new Date(Number(trip.start_time) * 1000).toLocaleString("en-ZA"),
      "End Time": new Date(Number(trip.end_time) * 1000).toLocaleString("en-ZA"),
      "Start Lat": trip.start.latitude,
      "Start Lng": trip.start.longitude,
      "End Lat": trip.end.latitude,
      "End Lng": trip.end.longitude,
    }));

    const csv = Papa.unparse(csvData, {
      quotes: false,
      delimiter: ";",
      header: true,
    });

    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${id}-trip-${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTrips = trips.filter((trip) => {
    const start = new Date(Number(trip.start_time) * 1000)
      .toLocaleString("en-ZA")
      .toLowerCase();
    const end = new Date(Number(trip.end_time) * 1000)
      .toLocaleString("en-ZA")
      .toLowerCase();
    return (
      start.includes(searchTerm.toLowerCase()) ||
      end.includes(searchTerm.toLowerCase())
    );
  });

  return (
    <Box p={6}>
      <Button colorScheme="blue" mb={4} onClick={() => navigate(-1)}>
        ← Back
      </Button>

      <Heading size="lg">Trip Report</Heading>
      <Text mt={4} fontSize="lg">
        Device Serial: <strong>{id}</strong>
      </Text>

      <Box mt={6}>
        <Box display="flex" gap={4} mb={4}>
          <FormControl>
            <FormLabel>Start Date</FormLabel>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </FormControl>

          <FormControl>
            <FormLabel>End Date</FormLabel>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </FormControl>
        </Box>

        <Box display="flex" gap={4} mb={4}>
          <Box flex="1">
            <Button
              colorScheme="teal"
              width="100%"
              onClick={handleGenerateReport}
              isDisabled={!startDate || !endDate || loading}
            >
              {loading ? <Spinner size="sm" mr={2} /> : null}
              Generate Trip Report
            </Button>
          </Box>

          <Box flex="1">
            <Button
              colorScheme="green"
              width="100%"
              onClick={handleExportCSV}
              isDisabled={!trips.length}
            >
              Export CSV
            </Button>
          </Box>
        </Box>

        {trips.length > 0 && (
          <Box mb={4}>
            <Input
              placeholder="Search by start/end time..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedTrip(null);
              }}
            />
          </Box>
        )}
      </Box>

      {error && (
        <Text mt={4} color="red.500">
          {error}
        </Text>
      )}

      {filteredTrips.length > 0 ? (
        <Box mt={8}>
          <Heading size="md" mb={4}>
            Trip Summary from {startDate} to {endDate}
          </Heading>
          <Stack spacing={3} maxHeight="300px" overflowY="auto">
            {filteredTrips.map((trip, idx) => (
              <Box
                key={idx}
                p={3}
                borderWidth="1px"
                borderRadius="md"
                _hover={{ bg: "gray.50", cursor: "pointer" }}
                onClick={() => {
                  setSelectedTrip(trip);
                  setShowMap(true);
                }}
              >
                <Text><strong>Vehicle:</strong> {trip.device_serial}</Text>
                <Text><strong>Kilometres:</strong> {trip.kilometres}</Text>
                <Text><strong>Start Time:</strong> {new Date(Number(trip.start_time) * 1000).toLocaleString("en-ZA")}</Text>
                <Text><strong>End Time:</strong> {new Date(Number(trip.end_time) * 1000).toLocaleString("en-ZA")}</Text>
              </Box>
            ))}
          </Stack>
        </Box>
      ) : (
        trips.length > 0 && (
          <Text mt={8} color="gray.600">
            No results match your search.
          </Text>
        )
      )}

      {showMap && selectedTrip && (
        <Box mt={10} height="500px" borderRadius="md" overflow="hidden">
          <Heading size="md" mb={4}>
            Trip Route Map
          </Heading>
          <MapContainer
            center={[selectedTrip.start.latitude, selectedTrip.start.longitude]}
            zoom={13}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {selectedTrip.path && selectedTrip.path.length > 0 && (
              <Polyline
                positions={selectedTrip.path.map((point) => [point.latitude, point.longitude])}
                color="blue"
              />
            )}
            <Marker position={[selectedTrip.start.latitude, selectedTrip.start.longitude]} icon={startIcon}>
              <Popup>Trip Start</Popup>
            </Marker>
            <Marker position={[selectedTrip.end.latitude, selectedTrip.end.longitude]} icon={endIcon}>
              <Popup>Trip End</Popup>
            </Marker>
          </MapContainer>

        </Box>
      )}
    </Box>
  );
};

export default TripReport;
