import React, { useState } from 'react';
import { Settings, Plus, Copy, Check, Home } from 'lucide-react';
import { generateResidentLink, calculateConsumption } from '../utils/storage';
import { WATER_RATE } from '../data/residents';
import './AdminView.css';

function AdminView({ residents, updateResidents }) {
  const [showNewResident, setShowNewResident] = useState(false);
  const [newResident, setNewResident] = useState({
    name: '',
    apartment: '',
    email: '',
    meters: 1
  });
  const [copiedId, setCopiedId] = useState(null);

  const copyLink = (residentId) => {
    const link = generateResidentLink(residentId);
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(residentId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const addResident = () => {
    if (!newResident.name.trim() || !newResident.apartment.trim()) {
      alert('Lūdzu, aizpildiet visus laukus');
      return;
    }

    const resident = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: newResident.name,
      apartment: newResident.apartment,
      email: newResident.email,
      meters: parseInt(newResident.meters) || 1,
      readings: []
    };

    updateResidents([...residents, resident]);
    setNewResident({ name: '', apartment: '', email: '', meters: 1 });
    setShowNewResident(false);
  };

  const sortedResidents = [...residents].sort((a, b) => {
    const numA = parseFloat(a.apartment.split('-')[1]);
    const numB = parseFloat(b.apartment.split('-')[1]);
    return numA - numB;
  });

  return (
    <div className="admin-view">
      <div className="container">
        <div className="header">
          <h1>
            <Settings size={48} />
            ADMIN PANELIS
          </h1>
          <p>Iedzīvotāju un rādījumu pārvaldība</p>
        </div>

        {residents.length === 0 ? (
          <div className="card empty-state">
            <Home size={80} />
            <h2>SĀCIET DARBU</h2>
            <p>Pievienojiet pirmo iedzīvotāju, lai sāktu rādījumu uzskaiti</p>
            <button className="btn btn-primary" onClick={() => setShowNewResident(true)}>
              <Plus size={20} />
              Pievienot iedzīvotāju
            </button>
          </div>
        ) : (
          <>
            <div className="card">
              <div className="card-header">
                <h2>IEDZĪVOTĀJI ({residents.length})</h2>
                <button className="btn btn-primary" onClick={() => setShowNewResident(true)}>
                  <Plus size={20} />
                  Pievienot iedzīvotāju
                </button>
              </div>

              {sortedResidents.map(resident => {
                const consumption = resident.readings.length >= 2 
                  ? calculateConsumption(resident.readings, resident.meters, WATER_RATE) 
                  : null;
                const lastReading = resident.readings[0];

                return (
                  <div key={resident.id} className="resident-card">
                    <div className="resident-header">
                      <div>
                        <h3>DZĪVOKLIS {resident.apartment}</h3>
                        <p className="resident-name">{resident.name}</p>
                        {resident.email && (
                          <p className="resident-email">{resident.email}</p>
                        )}
                        <p className="resident-meters">Skaitītāji: {resident.meters}</p>
                      </div>
                      <button 
                        className={`btn btn-copy ${copiedId === resident.id ? 'copied' : ''}`}
                        onClick={() => copyLink(resident.id)}
                      >
                        {copiedId === resident.id ? (
                          <>
                            <Check size={16} />
                            Nokopēts!
                          </>
                        ) : (
                          <>
                            <Copy size={16} />
                            Kopēt saiti
                          </>
                        )}
                      </button>
                    </div>

                    {resident.readings.length > 0 ? (
                      <div className="resident-stats">
                        <div className="stat-item">
                          <div className="stat-label">Pēdējie rādījumi</div>
                          <div className="stat-value">
                            {lastReading ? new Date(lastReading.date).toLocaleDateString('lv-LV') : '—'}
                          </div>
                        </div>
                        {lastReading && Object.keys(lastReading.meters).sort().map(meterNum => (
                          <div key={meterNum} className="stat-item">
                            <div className="stat-label">Skaitītājs {meterNum}</div>
                            <div className="stat-value meter">{lastReading.meters[meterNum]} m³</div>
                          </div>
                        ))}
                        {consumption && (
                          <div className="stat-item">
                            <div className="stat-label">Maksājams</div>
                            <div className="stat-value cost">€{consumption.cost.toFixed(2)}</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="no-readings">Rādījumi nav pievienoti</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="card">
              <h2>KOPĒJĀ STATISTIKA</h2>
              <div className="stats-grid">
                <div className="stat-box total">
                  <div className="stat-box-value">
                    {residents.reduce((sum, r) => {
                      const cons = r.readings.length >= 2 ? calculateConsumption(r.readings, r.meters, WATER_RATE) : null;
                      return sum + (cons ? cons.total : 0);
                    }, 0).toFixed(2)}
                  </div>
                  <div className="stat-box-label">m³ kopā</div>
                </div>
                <div className="stat-box amount">
                  <div className="stat-box-value">
                    €{residents.reduce((sum, r) => {
                      const cons = r.readings.length >= 2 ? calculateConsumption(r.readings, r.meters, WATER_RATE) : null;
                      return sum + (cons ? cons.cost : 0);
                    }, 0).toFixed(2)}
                  </div>
                  <div className="stat-box-label">Kopējā summa</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {showNewResident && (
        <div className="modal-overlay">
          <div className="card modal-card">
            <h3>JAUNS IEDZĪVOTĀJS</h3>
            <div className="form-group">
              <label>Vārds</label>
              <input
                type="text"
                className="input"
                value={newResident.name}
                onChange={(e) => setNewResident({...newResident, name: e.target.value})}
                placeholder="Jānis Bērziņš"
              />
            </div>
            <div className="form-group">
              <label>Dzīvokļa numurs</label>
              <input
                type="text"
                className="input"
                value={newResident.apartment}
                onChange={(e) => setNewResident({...newResident, apartment: e.target.value})}
                placeholder="7-12"
              />
            </div>
            <div className="form-group">
              <label>E-pasts (neobligāts)</label>
              <input
                type="email"
                className="input"
                value={newResident.email}
                onChange={(e) => setNewResident({...newResident, email: e.target.value})}
                placeholder="janis@example.com"
              />
            </div>
            <div className="form-group">
              <label>Skaitītāju skaits</label>
              <input
                type="number"
                min="1"
                max="5"
                className="input"
                value={newResident.meters}
                onChange={(e) => setNewResident({...newResident, meters: parseInt(e.target.value) || 1})}
              />
            </div>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowNewResident(false);
                  setNewResident({ name: '', apartment: '', email: '', meters: 1 });
                }}
              >
                Atcelt
              </button>
              <button 
                className="btn btn-primary"
                onClick={addResident}
              >
                Pievienot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminView;
