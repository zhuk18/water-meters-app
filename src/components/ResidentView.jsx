import React, { useState } from 'react';
import { Droplet, Calendar, TrendingUp, Plus, Lock } from 'lucide-react';
import { calculateConsumption } from '../utils/storage';
import './ResidentView.css';

function ResidentView({ residentId, residents, updateResidents }) {
  const [showNewReading, setShowNewReading] = useState(false);
  const [newReading, setNewReading] = useState({
    meters: {},
    date: new Date().toISOString().split('T')[0]
  });

  const residentData = residents.find(r => r.id === residentId);

  if (!residentData) {
    return (
      <div className="resident-view not-found">
        <div className="card centered">
          <Lock size={64} />
          <h2>Piekļuve nav atrasta</h2>
          <p>Pārbaudiet saites pareizību</p>
        </div>
      </div>
    );
  }

  const readings = residentData.readings || [];
  const meterCount = Number(residentData.meters) || 0;

  const consumption = readings.length >= 2
    ? calculateConsumption(readings, meterCount)
    : null;

  const handleAddReading = () => {
    // Check if all meter readings are filled
    for (let i = 1; i <= meterCount; i++) {
      if (!newReading.meters[i] || newReading.meters[i] === '') {
        alert('Lūdzu, ievadiet visus skaitītāju rādījumus');
        return;
      }
    }

    const reading = {
      id: Date.now().toString(),
      date: newReading.date,
      meters: {},
      timestamp: Date.now()
    };

    for (let i = 1; i <= meterCount; i++) {
      reading.meters[i] = parseFloat(newReading.meters[i]);
    }

    const updated = residents.map(r => {
      if (r.id === residentId) {
        const readings = [...r.readings, reading].sort((a, b) => new Date(b.date) - new Date(a.date));
        return { ...r, readings };
      }
      return r;
    });

    updateResidents(updated);
    setNewReading({ meters: {}, date: new Date().toISOString().split('T')[0] });
    setShowNewReading(false);
  };

  const openAddReading = () => {
    const initialMeters = {};
    for (let i = 1; i <= meterCount; i++) {
      initialMeters[i] = '';
    }
    setNewReading({ 
      meters: initialMeters, 
      date: new Date().toISOString().split('T')[0] 
    });
    setShowNewReading(true);
  };

  return (
    <div className="resident-view">
      <div className="container">
        <div className="header">
          <h1>
            <Droplet size={40} />
            DZĪVOKLIS {residentData.apartment}
          </h1>
          <p>{residentData.name}</p>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>MANI RĀDĪJUMI</h2>
            <button className="btn btn-primary" onClick={openAddReading}>
              <Plus size={20} />
              Pievienot rādījumus
            </button>
          </div>

          {consumption && (
            <div className="consumption-box">
              <h3>
                <TrendingUp size={24} />
                PAŠREIZĒJAIS PERIODS
              </h3>
              <div className="consumption-grid">
                {Object.keys(consumption.meters).map(meterNum => (
                  <div key={meterNum} className="consumption-stat">
                    <div className="consumption-value">{consumption.meters[meterNum].toFixed(2)}</div>
                    <div className="consumption-label">m³ (Skaitītājs {meterNum})</div>
                  </div>
                ))}
                <div className="consumption-stat total">
                  <div className="consumption-value">{consumption.total.toFixed(2)}</div>
                  <div className="consumption-label">m³ kopā</div>
                </div>
              </div>
            </div>
          )}

          <div className="readings-section">
            <h3>
              <Calendar size={24} />
              RĀDĪJUMU VĒSTURE
            </h3>
            {readings.length === 0 ? (
              <div className="no-readings">
                <Droplet size={64} />
                <p>Rādījumi vēl nav pievienoti</p>
              </div>
            ) : (
              <div className="readings-list">
                {readings.map((reading, idx) => {
                  const prevReading = readings[idx + 1];
                  const diff = prevReading ? {} : null;

                  if (diff) {
                    for (let i = 1; i <= meterCount; i++) {
                      diff[i] = reading.meters[i] - prevReading.meters[i];
                    }
                  }

                  return (
                    <div key={reading.id} className="reading-card">
                      <div className="reading-date">
                        {new Date(reading.date).toLocaleDateString('lv-LV', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="reading-meters">
                        {Object.keys(reading.meters).sort().map(meterNum => (
                          <div key={meterNum} className="meter-reading">
                            <span className="meter-label">Skaitītājs {meterNum}:</span>
                            <span className="meter-value">{reading.meters[meterNum]} m³</span>
                            {diff && diff[meterNum] !== undefined && (
                              <span className="meter-diff">(+{diff[meterNum].toFixed(2)})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showNewReading && (
        <div className="modal-overlay">
          <div className="card modal-card">
            <h3>JAUNI RĀDĪJUMI</h3>
            <div className="form-group">
              <label>Datums</label>
              <input
                type="date"
                className="input"
                value={newReading.date}
                onChange={(e) => setNewReading({...newReading, date: e.target.value})}
              />
            </div>
            {Array.from({ length: residentData.meters }, (_, i) => i + 1).map(meterNum => (
              <div key={meterNum} className="form-group">
                <label className="meter-label">Skaitītājs {meterNum} (m³)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={newReading.meters[meterNum] || ''}
                  onChange={(e) => setNewReading({
                    ...newReading, 
                    meters: { ...newReading.meters, [meterNum]: e.target.value }
                  })}
                  placeholder="123.45"
                />
              </div>
            ))}
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowNewReading(false);
                  setNewReading({ meters: {}, date: new Date().toISOString().split('T')[0] });
                }}
              >
                Atcelt
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleAddReading}
              >
                Saglabāt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResidentView;
