import React, { useState, useEffect } from 'react';
import AdminView from './components/AdminView';
import ResidentView from './components/ResidentView';
import { loadData, saveData, initializeResidents } from './utils/storage';

function App() {
  const [residents, setResidents] = useState([]);
  const [currentView, setCurrentView] = useState('admin');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const residentId = params.get('resident');
    
    loadData().then((loadedData) => {
      if (residentId) {
        setCurrentView(residentId);
      }
      
      if (!loadedData || loadedData.length === 0) {
        const initialized = initializeResidents();
        setResidents(initialized);
        saveData(initialized);
      } else {
        setResidents(loadedData);
      }
      setLoading(false);
    });
  }, []);

  const updateResidents = async (newResidents) => {
    setResidents(newResidents);
    await saveData(newResidents);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #2c5f7c 0%, #1a3a4d 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Roboto Condensed", sans-serif'
      }}>
        <div style={{ color: 'white', fontSize: '1.5rem' }}>Ielādē...</div>
      </div>
    );
  }

  if (currentView !== 'admin') {
    return (
      <ResidentView
        residentId={currentView}
        residents={residents}
        updateResidents={updateResidents}
      />
    );
  }

  return (
    <AdminView
      residents={residents}
      updateResidents={updateResidents}
    />
  );
}

export default App;
