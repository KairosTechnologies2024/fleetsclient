import React, { useState, useEffect } from "react";
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
  Center,
  Spinner,
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
    limit
  } from "firebase/firestore";
  import { db } from "lib/firebase";

import remote from "assets/remote.png";
import chain from "assets/chain.png";
import door from "assets/car-door.png";
import { useAuth } from "hooks/auth";

function CriticalAlerts({serial}) {
  const [display, changeDisplay] = useState("hide");
  const { user, isLoading } = useAuth()
  const [alerts, setAlerts] = useState([])
  const [isLoadingAlerts, setIsLoadingAlerts ] = useState(false)
  
  useEffect(() => {
    if(user){
        getAlerts(user.userId)
    }
  }, [user]);

  const getAlerts = async (userId) => {
    setIsLoadingAlerts(true)
    try{
        const q =  query(
            collection(db, "alerts"),
            orderBy("rawDate", "desc"),
            where("serialNumber", "==", serial),
            where("alertType", "in", [
                "Remote jamming detected !",
                "Doors opened: Possible break in !",
                "Smash and grab detected !"

            ]),
            limit(200)
          )

        const results = await getDocs(q)
        const res = []
        results.forEach(alert => {
            res.push(alert.data())
        })
        setAlerts(res)
    }catch(error){
        console.log(error)
    }
    setIsLoadingAlerts(false)
  }

  if(isLoadingAlerts){
    return (
        <Center>
          <Spinner color="teal.500" />
        </Center>
      );
  }

  return (
    <>
    
      <Flex justifyContent="space-between" mt={8}>
        <Flex align="flex-end">
          <Heading as="h2" size="lg" letterSpacing="tight">
            Critical Alerts
          </Heading>
          <Text fontSize="small" color="gray" ml={4}>
            Last Top 200
          </Text>
        </Flex>
      </Flex>
      <Flex flexDir="column">
        <Flex overflow="auto">
          <Table variant="unstyled" mt={4}>
            <Thead>
              <Tr color="gray">
                <Th>Alert Type</Th>
              </Tr>
            </Thead>
            <Tbody>

            {alerts.map((alert, idx)=> {
                let icon = null

                if(alert.alertType === "Remote jamming detected !"){
                    icon = remote
                }else if(alert.alertType === "Doors opened: Possible break in !"){
                    icon = chain
                }else{
                    icon = door
                }
                return (
                  <Tr key={idx}>
                    <Td>
                      <Flex align="center">
                        <Avatar size="sm" mr={2} src={icon} />
                        <Flex flexDir="column">
                          <Heading size="sm" letterSpacing="tight">
                            {alert.alertType}
                          </Heading>
                          <Text fontSize="sm" color="gray">
                            {alert.date}
                          </Text>
                        </Flex>
                      </Flex>
                    </Td>
                  </Tr>
                );
            })}

            </Tbody>
          </Table>
        </Flex>
      </Flex>
    </>
  );
}

export default CriticalAlerts;
