import React, { useState, useEffect } from 'react';
import AdminView from './components/AdminView';
import ResidentView from './components/ResidentView';
import { loadData, saveData, initializeResidents } from './utils/storage';

function App() {
  const [residents, setResidents] = useState([]);
  const [currentView, setCurrentView] = useState('admin');
  const [loading, setLoading] = useState(true);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return localStorage.getItem('adminAuthenticated') === 'true';
  });

  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin';

  useEffect(() => {
    const initializeApp = async () => {
      const params = new URLSearchParams(window.location.search);
      const residentId = params.get('resident');
      
      const loadedData = await loadData();
      if (residentId) {
        setCurrentView(residentId);
      }
      
      if (!loadedData || loadedData.length === 0) {
        const initialized = initializeResidents();
        setResidents(initialized);
        await saveData(initialized);
      } else {
        setResidents(loadedData);
      }
      setLoading(false);
    };

    initializeApp();
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

  if (!isAdminAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #2c5f7c 0%, #1a3a4d 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Roboto Condensed", sans-serif',
        padding: '2rem'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.98)',
          borderRadius: '16px',
          padding: '2.5rem',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          width: '100%',
          maxWidth: '420px'
        }}>
          <h2 style={{
            margin: '0 0 0.75rem 0',
            color: '#1a3a4d',
            textAlign: 'center',
            fontFamily: 'Oswald, sans-serif',
            letterSpacing: '1px'
          }}>ADMIN PIESLĒGŠANĀS</h2>
          <p style={{
            margin: '0 0 1.5rem 0',
            textAlign: 'center',
            color: '#555'
          }}>Ievadiet paroli, lai piekļūtu administrēšanai</p>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (adminPassword === ADMIN_PASSWORD) {
              setIsAdminAuthenticated(true);
              setAdminError('');
              setAdminPassword('');
              localStorage.setItem('adminAuthenticated', 'true');
            } else {
              setAdminError('Nepareiza parole');
            }
          }}>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Parole"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '2px solid #ddd',
                fontSize: '1rem',
                marginBottom: '1rem',
                boxSizing: 'border-box'
              }}
            />
            {adminError && (
              <div style={{
                color: '#b00020',
                fontSize: '0.9rem',
                marginBottom: '1rem',
                textAlign: 'center'
              }}>{adminError}</div>
            )}
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: '#2c5f7c',
                color: 'white',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              Pieslēgties
            </button>
          </form>
        </div>
      </div>
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
