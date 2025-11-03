import React from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { Flex, Grid, GridItem, Heading, Text } from '@chakra-ui/react'
import JammingChart from './JammingChart'
import BreakinsChart from './BreakinsChart'
import CriticalAlerts from './CriticalAlerts'
import OverviewChart from './OverviewChart'

function Vehicle() {
    let { id } = useParams()
    const location = useLocation();
  return (
    <>
    <Flex justifyContent="space-between" mt={8} mb={8}>
        <Flex align="flex-end">
          <Heading as="h2" size="lg" letterSpacing="tight">
            {location.state.vehicleModel} ({location.state.vehiclePlate})
          </Heading>
          <Text fontSize="small" color="gray" ml={4}>
            Based on Last 200 Alerts
          </Text>
        </Flex>
      </Flex>

<Grid templateColumns='repeat(2, 1fr)' gap={6}>
  <GridItem w='100%'>
    <Text color="gray" fontSize="sm">Remote Jammings</Text>
    <JammingChart serial={id} />
  </GridItem>
  <GridItem w='100%'>
    <Text color="gray" fontSize="sm">Possible Intrusions</Text>
    <BreakinsChart serial={id} />
  </GridItem>

  <GridItem w='100%'>
    <CriticalAlerts serial={id} />
  </GridItem>
  <GridItem w='100%'>
    <OverviewChart serial={id} />
  </GridItem>
</Grid>
    </>
  )
}

export default Vehicle