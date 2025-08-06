import React, { useState, useEffect, useRef } from 'react';
import { IoMdClose } from "react-icons/io";
import './device-logs.css';

function DeviceLogs({ showDeviceLog, setShowDeviceLog, serialNumber  }) {
  const [logs, setLogs] = useState([]);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const eventSourceRef = useRef(null);
  // Use production or local API endpoint based on environment
  const apiUrl =  'https://fleetsmicroservices.onrender.com:3002/api/logs';

  useEffect(() => {
    setVisible(true);
    setLoading(true);
    setError(null);
    setLogs([]);

    if (isPaused) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    // Open SSE connection to backend
    const streamUrl = `${apiUrl}/${serialNumber}/retrieve/stream`;
    console.log('Connecting to SSE:', streamUrl);
    const eventSource = new EventSource(streamUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE connection opened');
    };

    eventSource.onmessage = (event) => {
      setLoading(false);
      console.log('SSE message received:', event.data);
      try {
        const log = JSON.parse(event.data);
        setLogs(prevLogs => [...prevLogs, log]);
      } catch (e) {
        // fallback if not JSON
        setLogs(prevLogs => [...prevLogs, event.data]);
      }
    };

    eventSource.addEventListener('end', () => {
      setLogs(prevLogs => [...prevLogs, '[Stream stopped by server]']);
      eventSource.close();
      console.log('SSE stream ended by server');
    });

    eventSource.onerror = (err) => {
      setError('Stream error or closed');
      setLoading(false);
      setLogs(prevLogs => [...prevLogs, '[Stream error or closed]']);
      eventSource.close();
      console.error('SSE connection error:', err);
    };

    // Cleanup on unmount or close
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, [serialNumber, apiUrl, isPaused]);

  const handleClose = () => {
   setVisible(false);
    setTimeout(() => {
     setShowDeviceLog(false);
      // Optionally, stop the stream on the backend
      fetch(`${apiUrl}/${serialNumber}/retrieve/stream/stop`, { method: 'POST' });
    }, 300); // match the CSS transition duration
  };

  return (
    <div className={`device-logs-overlay${visible ? ' visible' : ''}`}>
      <div className={`device-logs-main${visible ? ' visible' : ''}`}>
        <div className='device-logs-header'>
          <h1>Device {serialNumber}</h1>
          <div className='device-logs-inner-header'>
            <button
              className='btn-pause-streaming'
              onClick={() => setIsPaused((prev) => !prev)}
              style={{ marginRight: 12 }}
            >
              {isPaused ? 'Resume Stream' : 'Pause Stream'}
            </button>
            <IoMdClose className='close-button' size={20} onClick={handleClose} />
          </div>
        </div>
        <div className='device-logs-content'>
          {loading && !isPaused && <p className='device-log'>Loading logs...</p>}
          {error && <p className='device-log' style={{ color: 'red' }}>{error}</p>}

          {isPaused && <p className='device-log'>Logs are paused</p> }
          {logs.map((log, idx) => {
            // Helper to strip ANSI color codes
            const stripAnsi = (str) => str.replace(/\u001b\[[0-9;]*m/g, '');
            // Helper to decode escaped newlines
            const decodeEscaped = (str) => str.replace(/\\n/g, '\n');
            if (typeof log === 'object' && log.topic && log.payload) {
              const cleanPayload = stripAnsi(decodeEscaped(log.payload));
              return (
                <div className='device-log' key={idx} style={{whiteSpace: 'pre-wrap'}}>
                  <div> {log.topic}</div>
                {/*   <div><strong>Topic:</strong> {log.topic}</div> */}
                 {/*  <div><strong>Payload:</strong></div> */}
                 <br></br>
                  <div>{cleanPayload}</div>
                </div>
              );
            } else if (typeof log === 'object') {
              return (
                <pre className='device-log' key={idx}>{JSON.stringify(log, null, 2)}</pre>
              );
            } else {
              return (
                <p className='device-log' key={idx}>{log}</p>
              );
            }
          })}
        </div>
      </div>
    </div>
  );
}

export default DeviceLogs;