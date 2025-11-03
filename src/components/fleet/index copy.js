import React, { useEffect, useState } from "react";
import {
  Grid,
  GridItem,
  Text,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Image,
  Stack,
  Heading,
  Button,
  Spacer,
  Center,
  Spinner,
  Icon,
  Flex,
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Checkbox,
  FormControl,
  FormLabel,
  Input
} from "@chakra-ui/react";
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  limit,
} from "firebase/firestore";
import { db } from "lib/firebase";
import "react-datepicker/dist/react-datepicker.css";
import DatePicker from "react-datepicker";
import { useAuth } from "hooks/auth";
import { useNavigate } from "react-router-dom";
import { IoArrowBack, IoCheckmark, IoTrashBin } from "react-icons/io5";
import {
  setDefaults,
  fromLatLng
} from "react-geocode";
import EkcoTheme from 'const/ekco-theme';
import GoogleMapReact from 'google-map-react';
import { GoogleMap, Marker, useLoadScript, Polyline } from "@react-google-maps/api";

setDefaults({
  // key: "AIzaSyARw_5tEnsh2wVgvnMyR4L3Lu2dHWn-mU4",
  language: "en",
  region: "es"
});

function FleetCopy() {
  const { user, isLoading } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)));
  const [endDate, setEndDate] = useState(new Date());

  const [trips, setTrips] = useState([]);
  const [gpsLogs, setGpsLogs] = useState([]);

  const [gpsMarkerStart, setGpsMarkerStart] = useState([]);
  const [gpsMarkerEnd, setGpsMarkerEnd] = useState([]);
  const [gpsLines, setGpsLines] = useState(new Date());
  
  const [items, setItems] = useState([]);
  const [selectedTrips, setSelectedTrips] = useState([]);
  const [selectedTripsCount, setSelectedTripsCount] = useState(selectedTrips.length);

  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [displayView, setDisplayView] = useState('');
  const [tripDate, setTripDate] = useState('');
  const [vehicleDisplay, setVehicleDisplay] = useState('');
  const [startAddressDisplay, setStartAddressDisplay] = useState('');
  const [endAddressDisplay, setEndAddressDisplay] = useState('');
  const [distance, setDistance] = useState(0);

  const [center, setCenter] = useState({ lat: 34.0522, lng: -118.2437 });
  const [lat, setLat] = useState("0")
  const [long, setLong] = useState("0")

  // const { isLoaded } = useLoadScript({
  //   googleMapsApiKey: "AIzaSyARw_5tEnsh2wVgvnMyR4L3Lu2dHWn-mU4",
  // });

  const mapOptions = {
    draggable: false
  };

  const navigation = useNavigate()

  const MyMarker = () => <div style={{ width: 10, height: 10, backgroundColor: '#000', borderRadius: 10}}></div>;
  const Marker = () => <div style={{ width: 10, height: 10, backgroundColor: '#0f3054', borderRadius: 10}}></div>;

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLat(latitude);
          setLong(longitude);
          setCenter({ lat: parseFloat(latitude), lng: parseFloat(longitude) });
        },
        (error) => {
          // console.error("Error getting current location:", error);
        }
      );
    }
  }, []);

  useEffect(() => {
    if (user) {
      getAlerts(user.userId);
    }
  }, [user]);

  useEffect(() => {
    filter();
  }, [selectedVehicle])

  const getAlerts = async (userId) => {
    setIsLoadingAlerts(true);
    try {
      const q = query(
        collection(db, "vehicles"),
        where("userId", "==", userId)
      );

      const results = await getDocs(q);
      const res = [];
      results.forEach((alert) => {
        if (alert.data().deviceSerial !== "-") {
          res.push(alert.data());
        }
      });
      setAlerts(res);
      setVehicles(res);
      setTimeout(() => {
        getLocations();
      }, 1000);
    } catch (error) {
      // console.log(error);
    }
    setIsLoadingAlerts(false);
  };

  const getLocations = async () => {
    setIsLoadingLocations(true);

    let serialNumber = '';
    let currentLocations = [];

    for(var count = 0; count < vehicles.length; count++) {
      serialNumber = vehicles[count].deviceSerial;

      try {
        const gpsQ = query(
          collection(db, "gps"),
          where("serialNumber", "==", serialNumber),
          orderBy("rawDate", "desc"),
          limit(1)
        )

        const results = await getDocs(gpsQ);

        results.forEach((gps) => {
          if(!currentLocations.some(s => s.serialNumber === gps.data().serialNumber)) {
            currentLocations.push(gps.data());
          }
        });
      } catch (error) {
        // console.log('error', error);
      }
    }

    console.log('currentLocations', currentLocations);
    setLocations(currentLocations);
    
    setIsLoadingLocations(false);
  };

  const showVehicleDetails = async(vehicle) => {
    setSelectedVehicle(vehicle);
    setVehicleDisplay(vehicle.vehicleModel)
    
    setDisplayView('vehicle');  
  };

  const showVehicleMapOrDetails = async(vehicle) => {
    try {
      let currentLocations = locations;

      const gpsQ = query(
        collection(db, "gps"),
        where("serialNumber", "==", vehicle.deviceSerial),
        orderBy("rawDate", "desc"),
        limit(1)
      )

      const results = await getDocs(gpsQ);

      results.forEach((gps) => {
        if(!currentLocations.some(s => s.serialNumber === gps.data().serialNumber)) {
          currentLocations.push(gps.data());
          setLocations(currentLocations);
        }

        setCenter({ lat: parseFloat(gps.data().lat), lng: parseFloat(gps.data().long) });
      });
    } catch (error) {
      // console.log('error', error);
    }

    var selectedGPS = locations.find(gps => gps.serialNumber === vehicle.deviceSerial);

    if(selectedGPS != null) {
      // set center
      setCenter({ lat: parseFloat(selectedGPS.lat), lng: parseFloat(selectedGPS.long) });
    } else {
      setSelectedVehicle(vehicle);
      setDisplayView('vehicle');  
    }
  };

  /* dates */
  
  const filter = () => {
    if(selectedVehicle == null) return;

    getTripLogs(startDate, endDate)
  }

  const getTripLogs = async (tripStart, tripEnd) => {
    // Get the timestamp in milliseconds
    const startTimestamp = tripStart.getTime();
    const endTimestamp = tripEnd.getTime();

    setTrips([]);
    setIsLoadingAlerts(true);
    
    const results = await getDocs(
      query(
        collection(db, 'ignition'),
        where('serialNumber', '==', selectedVehicle.deviceSerial),
        where('status', '==', 'on'),
        where('rawDate', '<', endTimestamp),
        where('rawDate', '>', startTimestamp),
        orderBy("rawDate", "desc")
      ))
  
      var logs = [];
      results.docs.forEach(v => {
        logs.push({
          displayDate: v.data().date,
          date: new Date(v.data().rawDate.integerValue),
          rawDate: v.data().rawDate
        })
      })
      
      setTrips(logs);
      setIsLoadingAlerts(false);
  }

  const onStartDateChange = (selectedDate) => {
    if (selectedDate) {
      setStartDate(selectedDate);

      filter();
    }
  }

  const onEndDateChange = (selectedDate) => {
    const currentDate = selectedDate || new Date();
    
    if (currentDate != null) {
      setEndDate(currentDate);
      
      filter();
    }
  }

  const handleSearchTextChange = (newText) => {
    setTimeout(() => {
      filterVehicles(newText.target.value);
    }, 500);
  };

  const filterVehicles = async(searchText) => {
    var currentVehicles = vehicles;

    if(searchText == null) searchText = '';

    var newVehicles = currentVehicles.filter(f => 
      (f.deviceSerial?.toLowerCase().indexOf(searchText) > -1) || 
      (f.vehiclePlate?.toLowerCase().indexOf(searchText) > -1) || 
      (f.vehicleModel?.toLowerCase().indexOf(searchText) > -1));

    setAlerts(newVehicles);
  }

  /* dates */

  /* trips */

  const showTrip = async (trip) => {
    console.log('show trip');
    var newDate = new Date(trip.rawDate.integerValue)
    const startTimestamp = newDate.getTime();

    setIsLoadingAlerts(true);
    setTripDate(trip.displayDate);
    setGpsLines([]);
    setGpsLogs([]);
    
    const ignitionResults = await getDocs(
      query(
        collection(db, 'ignition'),
        where('serialNumber', '==', selectedVehicle.deviceSerial),
        where('rawDate', '>', trip.rawDate),
        orderBy("rawDate", "asc"),
        limit(1)
      ))

    var nextOffs = [];
    ignitionResults.docs.forEach(v => {
      nextOffs.push(v.data())
    })

    if(nextOffs == null || nextOffs.length == 0) {
      setIsLoadingAlerts(false)
      return;
    }

    const nextOff = nextOffs[0]

    const gpsLogsResult = await getDocs(
      query(
        collection(db, 'gps'),
        where('serialNumber', '==', selectedVehicle.deviceSerial),
        where('rawDate', '>', trip.rawDate),
        where('rawDate', '<', nextOff.rawDate),
        orderBy('rawDate', 'asc')
      ))

    var logs = [];
    gpsLogsResult.docs.forEach(v => {
      if(v.data().lat != null && v.data().lat != '' && v.data().long != null && v.data().long != '') {
        logs.push({
          date: v.data().date,
          latitude: parseFloat(v.data().lat),
          longitude: parseFloat(v.data().long)
        })
      }
    })

    if(logs.length > 0) {
      var markers = [];

      const startIndex = 0;
      const endIndex = logs.length - 1;

      markers.push({
        lat: logs[startIndex].latitude,
        long: logs[startIndex].longitude
      });
      
      var endMarkers = [];
      // endMarkers.push(logs[logs.length - 1]);
      endMarkers.push({
        lat: logs[endIndex].latitude,
        long: logs[endIndex].longitude
      });

      console.log('markers', markers);
      var lines = [];
      for(var count = 1; count < logs.length; count++) {
        lines.push([logs[count-1], logs[count]]);
      }

      if(markers[0].lat != null && markers[0].lat != '') {
        console.log('set center');
        setCenter({ lat: parseFloat(markers[0].lat), lng: parseFloat(markers[0].long) });
        setGpsMarkerStart(markers);
      }
      setGpsMarkerEnd(endMarkers);
      // setGpsLogs(logs);
      // setGpsLines(lines);

      getAndSetStartAddress(logs[0]);
      getAndSetEndAddress(logs[logs.length-1]);

      var distanceTravelled = 0;
      var tempDistance = 0;

      for(var count = 0; count < logs.length - 1; count++) {
        tempDistance = await haversine(logs[count], logs[count + 1]);
        distanceTravelled += tempDistance;
      }

      setDistance(distanceTravelled.toFixed(2));
    }

    setDisplayView('trip');
    setIsLoadingAlerts(false);
  }

  const getAndSetStartAddress = async (location) => {
    fromLatLng(location.latitude, location.longitude)
      .then(({ results }) => {
        const { lat, lng } = results[0].geometry.location;

        if(results.length > 0) {
          setStartAddressDisplay(results[0].formatted_address);
        }

        return '';
      })
      .catch(({error}) => {
        // console.log('error in get address', error);
        return '';
      });
  }

  const getAndSetEndAddress = async (location) => {
    fromLatLng(location.latitude, location.longitude)
      .then(({ results }) => {
        const { lat, lng } = results[0].geometry.location;

        if(results.length > 0) {
          setEndAddressDisplay(results[0].formatted_address);
        }

        return '';
      })
      .catch(({error}) => {
        // console.log('error in get address', error);
        return '';
      });
  }

  const selectTrip = async (trip) => {
    if(trip.selected != true) {
      trip.selected = true;
    }
    else {
      trip.selected = false;
    }
  }
  
  const getAddress = async (inputGPSLog) => {
    fromLatLng(inputGPSLog.latitude, inputGPSLog.longitude)
      .then(({ results }) => {
        const { lat, lng } = results[0].geometry.location;

        if(results.length > 0) {
          return results[0].formatted_address;
        }

        return '';
      })
      .catch(({error}) => {
        // console.log('error in get address', error);
        return '';
      });
  };

  const formatAddress = async(inputLocation) => {
    if(inputLocation == null) return '';
    
    var streetNumber = inputLocation.streetNumber == null ? '' : (inputLocation.streetNumber + ' ');
    var street = inputLocation.street ?? '';
    var city = inputLocation.city == null ? '' : (', ' + inputLocation.city);

    var addressToReturn = `${streetNumber}${street}${city}`;
    return addressToReturn;
  }

  const haversine = async(locationOne, locationTwo) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (locationTwo.latitude - locationOne.latitude) * (Math.PI / 180); // Convert degrees to radians
    const dLon = (locationTwo.longitude - locationOne.longitude) * (Math.PI / 180); // Convert degrees to radians
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(locationOne.latitude * (Math.PI / 180)) *
        Math.cos(locationTwo.latitude * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }

  const addToSelectedTrips = async() => {
    var trips = selectedTrips;

    var newTrip = {
      deviceSerial: selectedVehicle.deviceSerial,
      vehicleModel: selectedVehicle.vehicleModel,
      vehiclePlate: selectedVehicle.vehiclePlate,
      distance: distance,
      tripDate: tripDate,
      startAddress: startAddressDisplay,
      endAddress: endAddressDisplay
    };

    var tripToAdd = trips.some(trip => 
      trip.deviceSerial === newTrip.deviceSerial && 
      trip.distance === newTrip.distance && 
      trip.tripDate === newTrip.tripDate);

    if(tripToAdd == false) {
      trips.push(newTrip);
      setSelectedTrips(trips);
      setSelectedTripsCount(trips.length);
    }
  }

  const downloadTrip = async() => {
    var allTrips = [];

    allTrips.push({
      tripDate: tripDate,
      deviceSerial: selectedVehicle.deviceSerial,
      vehicleModel: selectedVehicle.vehicleModel,
      vehiclePlate: selectedVehicle.vehiclePlate,
      startAddress: startAddressDisplay,
      endAddress: endAddressDisplay,
      distance: distance
    });
    
    downloadFile(allTrips);
  }

  const downloadTrips = async() => {
    var allTrips = [];

    for(var count = 0; count < selectedTrips.length; count++) {
      allTrips.push({
        tripDate: selectedTrips[count].tripDate,
        deviceSerial: selectedTrips[count].deviceSerial,
        vehicleModel: selectedTrips[count].vehicleModel,
        vehiclePlate: selectedTrips[count].vehiclePlate,
        startAddress: selectedTrips[count].startAddress,
        endAddress: selectedTrips[count].endAddress,
        distance: selectedTrips[count].distance
      });
    }
    
    downloadFile(allTrips);
  }

  const downloadFile = (data) => {
    // Convert data array to a semicolon-delimited CSV string
    const headers = 'Date;Device Serial;Vehicle;Plate;Start Address;End Address;Distance Travelled';
    const rows = data.map(row => Object.values(row).join(';')).join('\n');
    const csvContent = `${headers}\n${rows}`;

    // Create a blob from the CSV string
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // Create a link element and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'trips.csv');
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const removeSelectedTrip = (index) => {
    const trips = selectedTrips.filter((_, i) => i !== index);
    setSelectedTrips(trips);
  }

  const getDateNow = async() => {
    const currentDate = new Date();

    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Adding 1 because January is 0
    const day = String(currentDate.getDate()).padStart(2, '0');
    const hours = String(currentDate.getHours()).padStart(2, '0');
    const minutes = String(currentDate.getMinutes()).padStart(2, '0');

    const formattedDate = `${year}-${month}-${day}-${hours}-${minutes}`;

    return formattedDate;
  }

  /* trips */


  const showFleetGrid = () => {
    setDisplayView('');
  }

  const addCheckedTripsToSelected = () => {
    var items = trips.filter(item => item.selected);
    
    if(items != null && items.length > 0) {
      var selected = selectedTrips;

      // get log
      // add to list

      setSelectedTrips(selected);
    }
  }

  const showTripsGrid = () => {
    if(selectedVehicle != null) {
      setDisplayView('vehicle');
    }
    else {
      setDisplayView('');
    }
  }

  const showSelectedTripsGrid = () => {
    setDisplayView('trips');
  }

  const CustomDateInput = React.forwardRef(({ value, onClick }, ref) => (
    <Button onClick={onClick} ref={ref} width="100%">
      {value}
    </Button>
  ));

  if (isLoadingAlerts) {
    return (
      <Center>
        <Spinner color="teal.500" />
      </Center>
    );
  }

  if(displayView == '') {
    return (
      <>
        <Text fontWeight="bold" fontSize="2xl">
          My Fleets
        </Text>

        <Flex>
          <Box width={400}>
            <Grid templateColumns="repeat(1, 1fr)" gap={6}>
              <GridItem>
                <Card
                  direction={{ base: "column", sm: "row" }}
                overflow="hidden"
                  style={EkcoTheme.EkcoCard}>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Search Vehicles"
                      onChange={handleSearchTextChange}
                    />
                  </FormControl>
                </Card>
              </GridItem>
              {alerts.map((alert, idx) => (
                <GridItem key={idx} w="100%">
                  <Card
                    direction={{ base: "column", sm: "row" }}
                    overflow="hidden"
                    style={EkcoTheme.EkcoCard}
                  >
                    <Stack>
                      <CardBody>
                        <Heading size="md">{alert.vehicleModel}</Heading>
      
                        <Text py="2">
                          {alert.vehiclePlate}
                        </Text>
                        <Button onClick={() => showVehicleDetails(alert) } style={EkcoTheme.BlueButton}>
                          View Trips
                        </Button>

                        <Button ml={2} onClick={() => showVehicleMapOrDetails(alert) } style={EkcoTheme.BlueButton}>
                          View Location
                        </Button>
                      </CardBody>
                    </Stack>
                  </Card>
                </GridItem>
              ))}
            </Grid>
          </Box>
          <Box flex={1} style={EkcoTheme.EkcoMap}>
            <Text>Hello World</Text>
            {lat !== "" && (
              <GoogleMapReact
                bootstrapURLKeys={{ key: "AIzaSyARw_5tEnsh2wVgvnMyR4L3Lu2dHWn-mU4" }}
                center={center}
                defaultZoom={18}
                options={mapOptions}>
                <MyMarker lat={parseFloat(lat)} lng={parseFloat(long)} />

                {locations.map((location, idx) => (
                  <Marker key={'marker' + idx} lat={parseFloat(location.lat)} lng={parseFloat(location.long)} />
                ))}
              </GoogleMapReact>
            )}
          </Box>
        </Flex>
      </>
    );
  }

  if(displayView == 'vehicle') {
    return (
      <>
        <Text fontWeight="bold" fontSize="2xl">
          {selectedVehicle.vehicleModel} - {selectedVehicle.vehiclePlate}
        </Text>
        <Flex>
          <Box width={150}>
            <Flex flexDir="column" p={1}>
              <Text>&nbsp;</Text>
              <Button onClick={() => addCheckedTripsToSelected() } size="md" style={EkcoTheme.BlueButton}>
                <Icon as={IoCheckmark} fontSize="2xl" /> Add Selected
              </Button>
            </Flex>
          </Box>
          <Box width={150}>
            <Flex flexDir="column" p={1}>
              <Text>&nbsp;</Text>
              <Button onClick={() => showFleetGrid() } size="md" style={EkcoTheme.BlueButton}>
                <Icon as={IoArrowBack} fontSize="2xl" /> All Vehicles
              </Button>
            </Flex>
          </Box>
          <Box flex={1}>
            <Flex flexDir="column" p={1}>
              <Text textAlign="center">Start Date</Text>
              <DatePicker
                width="100%"
                selected={startDate}
                onChange={onStartDateChange}
                customInput={<CustomDateInput />}
              />
            </Flex>
          </Box>
          <Box flex={1}>
            <Flex flexDir="column" p={1}>
              <Text textAlign="center">End Date</Text>
              <DatePicker
                width="100%"
                selected={endDate}
                onChange={onEndDateChange}
                customInput={<CustomDateInput />}
              />
            </Flex>
          </Box>
          <Box width={250}>
            <Flex flexDir="column" p={1}>
              <Text>&nbsp;</Text>
              <Button onClick={() => showSelectedTripsGrid()} style={EkcoTheme.BlueButton}>Selected Trips ({selectedTripsCount})</Button>
            </Flex>
          </Box>
        </Flex>
        
        <Grid templateColumns="repeat(1, 1fr)" gap={2} pt={2}>
        {trips.map((trip, idx) => (
            <GridItem key={idx} w="100%">
              <Card
                direction={{ base: "column", sm: "row" }}
                overflow="hidden"
                variant="outline"
              >
                  <CardBody>
                    <Flex width="100%">
                      <Box width={50}>
                        <Checkbox isChecked={trip.selected} onChange={() => selectTrip(trip)}></Checkbox>
                      </Box>
                      <Box flex={1}>
                        <Text>
                          {trip.displayDate}
                        </Text>
                      </Box>
                      <Box width={200}>
                        <Button onClick={() => showTrip(trip)} width="100%" style={EkcoTheme.BlueButton} size="sm">
                          View Trip
                        </Button>
                      </Box>
                    </Flex>
                  </CardBody>
              </Card>
            </GridItem>
          ))}
        </Grid>
      </>
    );
  }

  if(displayView == 'trip') {
    return (
      <>
        <Text fontWeight="bold" fontSize="2xl">
          Trip Log
        </Text>
        <Flex>
          <Box width={150}>
            <Flex flexDir="column" p={1}>
              <Text>&nbsp;</Text>
              <Button onClick={() => showTripsGrid() } size="md" variant="solid" style={EkcoTheme.BlueButton}>
                <Icon as={IoArrowBack} fontSize="2xl" /> All Trips
              </Button>
            </Flex>
          </Box>
          <Box flex={1}>
            
          </Box>
          <Box width={250}>
            <Flex flexDir="column" p={1}>
              <Text>&nbsp;</Text>
              <Button onClick={() => showSelectedTripsGrid()} style={EkcoTheme.BlueButton}>Selected Trips ({selectedTripsCount})</Button>
            </Flex>
          </Box>
        </Flex>
        
        <Flex mt={2}>
          <Box width={400}>
            <Box>
              <FormLabel fontWeight="bold">Vehicle</FormLabel>
              <Text>{vehicleDisplay}</Text>
            </Box>
            <Box mt={2}>
              <FormLabel fontWeight="bold">Date</FormLabel>
              <Text>{tripDate}</Text>
            </Box>
            <Box mt={2}>
              <FormLabel fontWeight="bold">Start Address</FormLabel>
              <Text>{startAddressDisplay}</Text>
            </Box>
            <Box mt={2}>
              <FormLabel fontWeight="bold">End Address</FormLabel>
              <Text>{endAddressDisplay}</Text>
            </Box>
            <Box mt={2}>
              <FormLabel fontWeight="bold">Distance</FormLabel>
              <Text>{distance}</Text>
            </Box>
            <Box mt={2}>
              <Button style={EkcoTheme.BlueButton} onClick={() => addToSelectedTrips()}>Add To Selected</Button>
            </Box>
            <Box mt={2}>
              <Button style={EkcoTheme.BlueButton} onClick={() => downloadTrip()}>Download</Button>
            </Box>
          </Box>
          <Box flex={1}>
            {/* <GoogleMapReact
              bootstrapURLKeys={{ key: "AIzaSyARw_5tEnsh2wVgvnMyR4L3Lu2dHWn-mU4" }}
              center={center}
              defaultZoom={18}
              options={mapOptions}>
                {gpsMarkerStart.map((gpsMarker, idx) => (
                  <Marker key={'gps-' + idx} lat={parseFloat(gpsMarker.lat)} lng={parseFloat(gpsMarker.long)} />
                ))}
                {gpsMarkerEnd.map((gpsMarker, idx) => (
                  <Marker key={'gps-' + idx} lat={parseFloat(gpsMarker.lat)} lng={parseFloat(gpsMarker.long)} />
                ))}
                
                {gpsLines.map((item, index) => (
                  <Polyline key={'poly-' + index} coordinates={item} strokeColor="#F00" strokeWidth={5}></Polyline>
                ))}
            </GoogleMapReact> */}
          </Box>
        </Flex>

        {/* <TableContainer>
          <Table>
            <Thead>
              <Tr>
                <Td><Text fontWeight="bold">Date</Text></Td>
                <Td><Text fontWeight="bold">Start Address</Text></Td>
                <Td><Text fontWeight="bold">End Address</Text></Td>
                <Td><Text fontWeight="bold">Distance</Text></Td>
                <Td width="200px"></Td>
                <Td width="100px"></Td>
              </Tr>
            </Thead>
            <Tbody>
              <Tr>
              <Td>
                  <Text>{tripDate}</Text>
                </Td>
                <Td>
                  <Text>{startAddressDisplay}</Text>
                </Td>
                <Td>
                  <Text>{endAddressDisplay}</Text>
                </Td>
                <Td>
                  <Text>{distance}</Text>
                </Td>
                <Td>
                  <Button onClick={() => addToSelectedTrips()}>Add To Selected</Button>
                </Td>
                <Td>
                  <Button onClick={() => downloadTrip()}>Download</Button>
                </Td>
              </Tr>
              <Tr>
                <Td colSpan={6} style={{height : '400px'}}>
                <GoogleMapReact
                  bootstrapURLKeys={{ key: "AIzaSyARw_5tEnsh2wVgvnMyR4L3Lu2dHWn-mU4" }}
                  center={center}
                  defaultZoom={18}
                  options={mapOptions}>
                </GoogleMapReact>
                </Td>
              </Tr>
            </Tbody>
          </Table>
        </TableContainer> */}
      </>
    );
  }

  if(displayView == 'trips') {
    return (
      <>
        <Text fontWeight="bold" fontSize="2xl">
          Trip Log
        </Text>
        <Flex>
          <Box width={150}>
            <Flex flexDir="column" p={1}>
              <Text>&nbsp;</Text>
              <Button onClick={() => showFleetGrid() } size="md" variant="solid" style={EkcoTheme.BlueButton}>
                <Icon as={IoArrowBack} fontSize="2xl" /> All Vehicles
              </Button>
            </Flex>
          </Box>
          <Box flex={1}>
            
          </Box>
          <Box width={250}>
            <Flex flexDir="column" p={1}>
              <Text>&nbsp;</Text>
              <Button onClick={() => downloadTrips() } style={EkcoTheme.BlueButton}>Download</Button>
            </Flex>
          </Box>
        </Flex>

        <TableContainer>
          <Table>
            <Thead>
              <Tr>
                <Td width="40px"></Td>
                <Td><Text fontWeight="bold">Date</Text></Td>
                <Td><Text fontWeight="bold">Vehicle</Text></Td>
                <Td><Text fontWeight="bold">Start Address</Text></Td>
                <Td><Text fontWeight="bold">End Address</Text></Td>
                <Td><Text fontWeight="bold">Distance</Text></Td>
              </Tr>
            </Thead>
            <Tbody>
              {selectedTrips.map((trip, idx) => (
                <Tr key={idx}>
                  <Td>
                    <Button size="sm" onClick={() => removeSelectedTrip(idx)} style={EkcoTheme.RedButton}><Icon as={IoTrashBin} fontSize="2xl" /></Button>
                  </Td>
                  <Td>
                    <Text>{trip.tripDate}</Text>
                  </Td>
                  <Td>
                    <Text>{trip.vehicleModel}</Text>
                  </Td>
                  <Td>
                    <Text>{trip.startAddress}</Text>
                  </Td>
                  <Td>
                    <Text>{trip.endAddress}</Text>
                  </Td>
                  <Td>
                    <Text>{trip.distance}</Text>
                  </Td>
                  {/* <Td>
                    <Button onClick={() => viewTrip()}>View</Button>
                  </Td> */}
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </>
    );
  }
}

export default Fleet;
