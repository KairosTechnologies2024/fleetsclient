import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import { useAuth } from "hooks/auth";
import { Center, Spinner, Text } from "@chakra-ui/react";
import { useRemoteJammings } from "hooks/alerts";
import {
    useCollectionData,
    useDocumentData,
  } from "react-firebase-hooks/firestore";
  import { useToast } from "@chakra-ui/react";
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



const options = {
  maintainAspectRatio: true,
  scales: {
    x: {
      grid: {
        display: false,
      },
    },
    y: {
      grid: {
        borderDash: [3, 3],
      },
      // beginAtZero: true, // this works
    },
  },
  plugins: {
    legend: {
      display: false,
    },
  },
};

const JammingChart = ({serial}) => {
  const { user, isLoading } = useAuth();
  const [isLoadingAlerts, setIsLoadingAlerts ] = useState(false)
  const [chartData, setChartData] = useState(null)
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
            where("alertType", "==", "Remote jamming detected !"),
            limit(200)
          )

        const results = await getDocs(q)
        const labels = []
        const data = []
        
        results.forEach(alert => {
            const label = alert.data().date.substring(0, alert.data().date.lastIndexOf(','))

            if(labels.indexOf(label) === -1){
                labels.push(label)
                data.push(1)
            }else{
                const prev = data[labels.indexOf(label)]
                data[labels.indexOf(label)] = prev + 1
            }
        })

        labels.reverse()
        data.reverse()

        labels.forEach((label, i) =>{
            labels[i] = label.substring(label.indexOf(',') + 1).trim()
        })

        setChartData({
            labels: labels,
            datasets: [
              {
                label: "Remote Jammings",
                fill: false,
                lineTension: 0.5,
                backgroundColor: "#16a085",
                borderColor: "#16a085",
                borderCapStyle: "butt",
                borderDashOffset: 0.0,
                borderJoinStyle: "#16a085",
                pointBorderColor: "#16a085",
                pointBackgroundColor: "#16a085",
                pointBorderWidth: 1,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: "#16a085",
                pointHoverBorderColor: "#16a085",
                pointHoverBorderWidth: 2,
                pointRadius: 1,
                pointHitRadius: 10,
                data: data,
              },
            ],
          })
    }catch(error){
        console.log(error)
    }
    setIsLoadingAlerts(false)
  }


  if (isLoading || isLoadingAlerts || chartData === null) {
    return (
      <Center>
        <Spinner color="teal.500" />
      </Center>
    );
  }

  return (
    <>
    
    <Line data={chartData} options={options} />
    </>
    
  );
};

export default JammingChart;
