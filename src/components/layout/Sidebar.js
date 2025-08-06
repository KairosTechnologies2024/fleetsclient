import React, { useEffect, useState } from "react";
import { Link as ReachLink, useNavigate } from "react-router-dom";
import {
  Flex,
  Heading,
  Avatar,
  AvatarGroup,
  Text,
  Icon,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Divider,
  Link,
  Box,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
} from "@chakra-ui/react";
import { IoStatsChartSharp, IoCarSportSharp, IoAlbumsSharp, IoBusiness, IoHeartHalfSharp } from "react-icons/io5";
import { useAuth } from "hooks/auth";
import EkcoTheme from 'const/ekco-theme';
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "lib/firebase";

function Sidebar() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate()
  const [isFleetCustomer, setIsFleetCustomer] = useState(false);

  useEffect(() => {
    const checkFleetCustomer = async () => {
      if (!user) return;

      const fleetRef = collection(db, "fleetCustomers");
      const q = query(fleetRef, where("email", "==", user.email));
      const querySnapshot = await getDocs(q);

      setIsFleetCustomer(!querySnapshot.empty);
    };

    checkFleetCustomer();
  }, [user]);

  return (
    <Flex
      w={["100%", "100%", "10%", "15%", "15%"]}
      flexDir="column"
      alignItems="center"
      backgroundColor={EkcoTheme.blue}
      color="#fff"
    >
      <Flex flexDir="column" h={[null, null, "100vh"]} justifyContent="space-between">
        <Flex flexDir="column" as="nav">
          <Heading mt={50} mb={[25, 50, 100]} fontSize={["4xl", "4xl", "2xl", "3xl", "4xl"]} alignSelf="center" letterSpacing="tight">
            Ekco
            <Text fontSize={"small"}>Business Fleet</Text>
          </Heading>

          <Flex flexDir={["row", "row", "column", "column", "column"]} align={["center", "center", "center", "flex-start", "flex-start"]} wrap={["wrap", "wrap", "nowrap", "nowrap", "nowrap"]} justifyContent="center">
            <Flex className="sidebar-items" mr={[2, 6, 0, 0, 0]}>
              <Link display={["none", "none", "flex", "flex", "flex"]}>
                <Icon className="active-icon" as={IoAlbumsSharp} fontSize="2xl" />
              </Link>
              <Link as={ReachLink} to="/protected/fleet" _hover={{ textDecor: "none" }} display={["flex", "flex", "none", "flex", "flex"]}>
                <Text className="active">My Fleets</Text>
              </Link>
            </Flex>

            <Flex className="sidebar-items" mr={[2, 6, 0, 0, 0]}>
              <Link display={["none", "none", "flex", "flex", "flex"]}>
                <Icon className="active-icon" as={IoCarSportSharp} fontSize="2xl" />
              </Link>
              <Link as={ReachLink} to="/protected/vehicles" _hover={{ textDecor: "none" }} display={["flex", "flex", "none", "flex", "flex"]}>
                <Text className="active">My Vehicles</Text>
              </Link>
            </Flex>

            {/* Conditionally Render Fleet Manager Menu */}
            {isFleetCustomer && (
              <Flex className="sidebar-items" mr={[2, 6, 0, 0, 0]}>
                <Link display={["none", "none", "flex", "flex", "flex"]}>
                  <Icon className="active-icon" as={IoBusiness} fontSize="2xl" />
                </Link>
                <Link as={ReachLink} to="/protected/manager" _hover={{ textDecor: "none" }} display={["flex", "flex", "none", "flex", "flex"]}>
                  <Text className="active">Fleet Manager</Text>
                </Link>
              </Flex>
            )}

            <Flex className="sidebar-items" mr={[2, 6, 0, 0, 0]}>
              <Link display={["none", "none", "flex", "flex", "flex"]}>
                <Icon as={IoStatsChartSharp} fontSize="2xl" className="active-icon" />
              </Link>
              <Link as={ReachLink} to="/protected/dashboard" _hover={{ textDecor: "none" }} display={["flex", "flex", "none", "flex", "flex"]}>
                <Text className="active">Alerts</Text>
              </Link>
            </Flex>

            <Flex className="sidebar-items" mr={[2, 6, 0, 0, 0]}>
              <Link display={["none", "none", "flex", "flex", "flex"]}>
                <Icon as={IoHeartHalfSharp} fontSize="2xl" className="active-icon" />
              </Link>
              <Link as={ReachLink} to="/protected/deviceHealth" _hover={{ textDecor: "none" }} display={["flex", "flex", "none", "flex", "flex"]}>
                <Text className="active">Device Health</Text>
              </Link>
            </Flex>
          </Flex>
        </Flex>

        {user && (
          <Flex flexDir="column" alignItems="center" mb={10} mt={5}>
            <Avatar my={2} src={user.profilePicture} />
            <Text textAlign="center">{user.firstName} {user.lastName}</Text>
            <Button mt="4" style={EkcoTheme.WhiteButton} size="md" w="full" onClick={() => navigate('/')}>
              Logout
            </Button>
          </Flex>
        )}
      </Flex>
    </Flex>
  );
}

export default Sidebar;
