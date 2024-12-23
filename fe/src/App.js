import React, { useState, useEffect, useRef } from 'react';
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ReactiveDataTable />
    </QueryClientProvider>
  );
}

export default App;

function ReactiveDataTable() {
  const [lastUpdate, setLastUpdate] = useState(null);
  const [blinkDot, setBlinkDot] = useState(false);
  const [blinkCount, setBlinkCount] = useState(0);
  const [highlightedRows, setHighlightedRows] = useState([]);
  const prevDataRef = useRef([]); // store the previous records for diffing

  // Fetcher for React Query
  async function fetchData() {
    const res = await fetch('http://localhost:5000/data');
    if (!res.ok) {
      throw new Error('Network response was not ok');
    }
    return res.json();
  }

  // Use React Query (v5) to fetch data every 5 seconds
  const { data: records = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['records'],
    queryFn: fetchData,
    refetchInterval: 5000,
    // onSuccess won't always fire if the data is considered the same by the query cache
  });

  /**
   * Compare new data to old data whenever `records` changes
   * If anything changed, blink the red dot and highlight changed rows.
   * Also unconditionally update the "last updated" timestamp.
   */
  useEffect(() => {
    if (!isLoading && !isError) {
      // Always update lastUpdate whenever fresh data is set (even if the data might be identical)
      setLastUpdate(new Date());

      // Diff new vs. old records
      const changedIds = findChangedOrNewRecords(prevDataRef.current, records);
      console.log('Detected changed/new IDs:', changedIds);

      if (changedIds.length > 0) {
        setBlinkCount(5); // triggers red dot blink
        setHighlightedRows(changedIds); // highlight changed rows
      }

      // Store the current data as old data for next comparison
      prevDataRef.current = records;
    }
  }, [records, isLoading, isError]);

  // Blink dot logic
  useEffect(() => {
    if (blinkCount > 0) {
      setBlinkDot(true);
      const blinkInterval = setInterval(() => {
        setBlinkDot(prev => !prev);
        setBlinkCount(prevCount => prevCount - 1);
      }, 500); // toggle dot every 0.5s

      return () => clearInterval(blinkInterval);
    } else {
      setBlinkDot(false);
    }
  }, [blinkCount]);

  // Remove row highlight after 3s
  useEffect(() => {
    if (highlightedRows.length > 0) {
      const timer = setTimeout(() => setHighlightedRows([]), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedRows]);

  // Manual refresh
  const handleManualRefresh = () => {
    console.log('Manual refresh triggered');
    refetch();
  };

  // Utility to find changed/new records
  function findChangedOrNewRecords(oldRecords, newRecords) {
    const oldMap = {};
    oldRecords.forEach(rec => {
      oldMap[rec.id] = rec;
    });

    const changedIds = [];
    newRecords.forEach(newRec => {
      const oldRec = oldMap[newRec.id];
      if (!oldRec) {
        // brand new record
        changedIds.push(newRec.id);
      } else {
        // check if fields changed
        if (JSON.stringify(oldRec) !== JSON.stringify(newRec)) {
          changedIds.push(newRec.id);
        }
      }
    });
    return changedIds;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2>Data Records (ReactQuery)</h2>

        <div style={{ position: 'relative' }}>
          {/* Red dot (positioned top-right corner) */}
          <div
            style={{
              ...styles.redDot,
              opacity: blinkDot ? 1 : 0,
            }}
          />
        </div>

        <div>
          <strong>Last Updated:</strong>{' '}
          {lastUpdate ? lastUpdate.toLocaleString() : '—'}
        </div>

        <div>
          <strong>Record Count:</strong> {records.length}
        </div>

        <button onClick={handleManualRefresh}>Refresh Manually</button>
      </div>

      {/* Loading / Error states */}
      {isLoading && <p>Loading data...</p>}
      {isError && <p style={{ color: 'red' }}>Error fetching data</p>}

      {/* Main Table */}
      {!isLoading && !isError && (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.tableHeader}>ID</th>
              <th style={styles.tableHeader}>Name</th>
              <th style={styles.tableHeader}>Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map((rec) => {
              const isHighlighted = highlightedRows.includes(rec.id);
              return (
                <tr
                  key={rec.id}
                  style={{
                    ...styles.tableRow,
                    ...(isHighlighted ? styles.highlight : {}),
                  }}
                >
                  <td>{rec.id}</td>
                  <td>{rec.name}</td>
                  <td>{rec.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Inline styles
const styles = {
  container: {
    width: '80%',
    margin: '0 auto',
    marginTop: '2rem',
    fontFamily: 'Arial, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    position: 'relative',
  },
  redDot: {
    position: 'absolute',
    top: '-10px',
    right: '-10px',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: 'red',
    transition: 'opacity 0.2s ease-in-out',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  tableHeader: {
    borderBottom: '1px solid #ccc',
    padding: '8px',
  },
  tableRow: {
    borderBottom: '1px solid #ccc',
    padding: '8px',
    transition: 'background-color 0.5s ease-in-out',
  },
  highlight: {
    backgroundColor: 'rgba(255, 255, 0, 0.3)', // pale yellow
  },
};

