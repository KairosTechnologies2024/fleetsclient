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
        display: true,
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
      display: true,
    },
  },
};

const Chart = () => {
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
            where("userId", "==", userId),
            where("alertType", "==", "Remote jamming detected !"),
            limit(1000)
          )

          const q2 =  query(
            collection(db, "alerts"),
            orderBy("rawDate", "desc"),
            where("userId", "==", userId),
            where("alertType", "==", "Smash and grab detected !"),
            limit(1000)
          )

          const q3 =  query(
            collection(db, "alerts"),
            orderBy("rawDate", "desc"),
            where("userId", "==", userId),
            where("alertType", "==", "Doors opened: Possible break in !"),
            limit(1000)
          )

          const q4 =  query(
            collection(db, "alerts"),
            orderBy("rawDate", "desc"),
            where("userId", "==", userId),
            where("alertType", "==", "Car battery disconnected"),
            limit(1000)
          )

        const results = await getDocs(q)
        const results2 = await getDocs(q2)
        const results3 = await getDocs(q3)
        const results4 = await getDocs(q4)
        const labels = []
        const data = []
        const data2 = []
        const data3 = []
        const data4 = []
        
        results.forEach(alert => {
            const label = alert.data().date.substring(alert.data().date.indexOf(',') + 1).trim().split(' ')[0] + " " + alert.data().date.substring(alert.data().date.indexOf(',') + 1).trim().split(' ')[2].replace(',','')
            if(labels.indexOf(label) === -1){
                labels.push(label)
                data.push(1)
            }else{
                const prev = data[labels.indexOf(label)]
                data[labels.indexOf(label)] = prev + 1
            }
        })

        results2.forEach(alert => {
          const label = alert.data().date.substring(alert.data().date.indexOf(',') + 1).trim().split(' ')[0] + " " + alert.data().date.substring(alert.data().date.indexOf(',') + 1).trim().split(' ')[2].replace(',','')
          if(labels.indexOf(label) === -1){
              labels.push(label)
              data2.push(1)
          }else{
              let prev = data2[labels.indexOf(label)]
              if(isNaN(prev)){
                prev = 1
              }
              data2[labels.indexOf(label)] = prev + 1
          }
      })

      results3.forEach(alert => {
        const label = alert.data().date.substring(alert.data().date.indexOf(',') + 1).trim().split(' ')[0] + " " + alert.data().date.substring(alert.data().date.indexOf(',') + 1).trim().split(' ')[2].replace(',','')
        if(labels.indexOf(label) === -1){
            labels.push(label)
            data3.push(1)
        }else{
            let prev = data3[labels.indexOf(label)]
            if(isNaN(prev)){
              prev = 1
            }
            data3[labels.indexOf(label)] = prev + 1
        }
    })

    results4.forEach(alert => {
      const label = alert.data().date.substring(alert.data().date.indexOf(',') + 1).trim().split(' ')[0] + " " + alert.data().date.substring(alert.data().date.indexOf(',') + 1).trim().split(' ')[2].replace(',','')
      if(labels.indexOf(label) === -1){
          labels.push(label)
          data4.push(1)
      }else{
          let prev = data4[labels.indexOf(label)]
          if(isNaN(prev)){
            prev = 1
          }
          data4[labels.indexOf(label)] = prev + 1
      }
  })

        labels.reverse()
        data.reverse()
        data2.reverse()
        data3.reverse()
        data4.reverse()

        // labels.forEach((label, i) =>{
        //     labels[i] = label.substring(label.indexOf(',') + 1).trim()
        // })

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
              {
                label: "Smash and Grabs",
                fill: false,
                lineTension: 0.5,
                backgroundColor: "#2c3e50",
                borderColor: "#2c3e50",
                borderCapStyle: "butt",
                borderDashOffset: 0.0,
                borderJoinStyle: "#2c3e50",
                pointBorderColor: "#2c3e50",
                pointBackgroundColor: "#2c3e50",
                pointBorderWidth: 1,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: "#2c3e50",
                pointHoverBorderColor: "#2c3e50",
                pointHoverBorderWidth: 2,
                pointRadius: 1,
                pointHitRadius: 10,
                data: data2,
              },
              {
                label: "Possible Intrusions",
                fill: false,
                lineTension: 0.5,
                backgroundColor: "#c0392b",
                borderColor: "#c0392b",
                borderCapStyle: "butt",
                borderDashOffset: 0.0,
                borderJoinStyle: "#c0392b",
                pointBorderColor: "#c0392b",
                pointBackgroundColor: "#c0392b",
                pointBorderWidth: 1,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: "#c0392b",
                pointHoverBorderColor: "#c0392b",
                pointHoverBorderWidth: 2,
                pointRadius: 1,
                pointHitRadius: 10,
                data: data3,
              },
              {
                label: "Battery Disconnects",
                fill: false,
                lineTension: 0.5,
                backgroundColor: "#f39c12",
                borderColor: "#f39c12",
                borderCapStyle: "butt",
                borderDashOffset: 0.0,
                borderJoinStyle: "#f39c12",
                pointBorderColor: "#f39c12",
                pointBackgroundColor: "#f39c12",
                pointBorderWidth: 1,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: "#f39c12",
                pointHoverBorderColor: "#f39c12",
                pointHoverBorderWidth: 2,
                pointRadius: 1,
                pointHitRadius: 10,
                data: data4,
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

export default Chart;
