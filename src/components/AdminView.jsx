import React, { useState } from 'react';
import { Settings, Plus, Copy, Check, Home, Edit, Trash2, Droplet } from 'lucide-react';
import { generateResidentLink, calculateConsumption } from '../utils/storage';
import './AdminView.css';

function AdminView({ residents, updateResidents }) {
  const [showNewResident, setShowNewResident] = useState(false);
  const [newResident, setNewResident] = useState({
    name: '',
    apartment: '',
    email: '',
    meters: 1
  });
  const [showEditResident, setShowEditResident] = useState(false);
  const [editingResident, setEditingResident] = useState(null);
  const [showAddReading, setShowAddReading] = useState(false);
  const [addingResidentId, setAddingResidentId] = useState(null);
  const [showEditReading, setShowEditReading] = useState(false);
  const [editingReading, setEditingReading] = useState(null);
  const [editingResidentId, setEditingResidentId] = useState(null);
  const [expandedHistories, setExpandedHistories] = useState({});
  const [newReading, setNewReading] = useState({
    meters: {},
    date: new Date().toISOString().split('T')[0]
  });
  const [copiedId, setCopiedId] = useState(null);

  const copyLink = (residentId) => {
    const link = generateResidentLink(residentId);
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(residentId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const editResident = (resident) => {
    setEditingResident({
      id: resident.id,
      name: resident.name,
      apartment: resident.apartment,
      email: resident.email,
      meters: resident.meters
    });
    setShowEditResident(true);
  };

  const updateResident = () => {
    if (!editingResident.name.trim() || !editingResident.apartment.trim()) {
      alert('Lūdzu, aizpildiet visus laukus');
      return;
    }

    const updated = residents.map(r => 
      r.id === editingResident.id 
        ? { ...r, name: editingResident.name, apartment: editingResident.apartment, email: editingResident.email, meters: parseInt(editingResident.meters) || 1 }
        : r
    );
    updateResidents(updated);
    setShowEditResident(false);
    setEditingResident(null);
  };

  const deleteResident = (residentId) => {
    if (window.confirm('Vai tiešām vēlaties dzēst šo iedzīvotāju?')) {
      const updated = residents.filter(r => r.id !== residentId);
      updateResidents(updated);
    }
  };

  const openAddReading = (residentId) => {
    const resident = residents.find(r => r.id === residentId);
    const initialMeters = {};
    for (let i = 1; i <= resident.meters; i++) {
      initialMeters[i] = '';
    }
    setNewReading({ 
      meters: initialMeters, 
      date: new Date().toISOString().split('T')[0] 
    });
    setAddingResidentId(residentId);
    setShowAddReading(true);
  };

  const addReading = () => {
    const resident = residents.find(r => r.id === addingResidentId);
    // Check if all meter readings are filled
    for (let i = 1; i <= resident.meters; i++) {
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

    for (let i = 1; i <= resident.meters; i++) {
      reading.meters[i] = parseFloat(newReading.meters[i]);
    }

    const updated = residents.map(r => {
      if (r.id === addingResidentId) {
        const readings = [...r.readings, reading].sort((a, b) => new Date(b.date) - new Date(a.date));
        return { ...r, readings };
      }
      return r;
    });

    updateResidents(updated);
    setNewReading({ meters: {}, date: new Date().toISOString().split('T')[0] });
    setShowAddReading(false);
    setAddingResidentId(null);
  };

  const openEditReading = (residentId, reading) => {
    setEditingReading({
      id: reading.id,
      date: reading.date,
      meters: { ...reading.meters }
    });
    setEditingResidentId(residentId);
    setShowEditReading(true);
  };

  const editReading = () => {
    const resident = residents.find(r => r.id === editingResidentId);
    // Check if all meter readings are filled
    for (let i = 1; i <= resident.meters; i++) {
      if (!editingReading.meters[i] || editingReading.meters[i] === '') {
        alert('Lūdzu, ievadiet visus skaitītāju rādījumus');
        return;
      }
    }

    const updatedReading = {
      ...editingReading,
      meters: {},
      timestamp: Date.now()
    };

    for (let i = 1; i <= resident.meters; i++) {
      updatedReading.meters[i] = parseFloat(editingReading.meters[i]);
    }

    const updated = residents.map(r => {
      if (r.id === editingResidentId) {
        const readings = r.readings.map(rd => 
          rd.id === editingReading.id ? updatedReading : rd
        ).sort((a, b) => new Date(b.date) - new Date(a.date));
        return { ...r, readings };
      }
      return r;
    });

    updateResidents(updated);
    setShowEditReading(false);
    setEditingReading(null);
    setEditingResidentId(null);
  };

  const deleteReading = (residentId, readingId) => {
    if (window.confirm('Vai tiešām vēlaties dzēst šo rādījumu?')) {
      const updated = residents.map(r => {
        if (r.id === residentId) {
          const readings = r.readings.filter(rd => rd.id !== readingId);
          return { ...r, readings };
        }
        return r;
      });
      updateResidents(updated);
    }
  };

  const toggleHistory = (residentId) => {
    setExpandedHistories(prev => ({
      ...prev,
      [residentId]: !prev[residentId]
    }));
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
                  ? calculateConsumption(resident.readings, resident.meters) 
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
                      <div className="resident-actions">
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
                        <button 
                          className="btn btn-edit"
                          onClick={() => editResident(resident)}
                        >
                          <Edit size={16} />
                          Rediģēt
                        </button>
                        <button 
                          className="btn btn-delete"
                          onClick={() => deleteResident(resident.id)}
                        >
                          <Trash2 size={16} />
                          Dzēst
                        </button>
                        <button 
                          className="btn btn-add-reading"
                          onClick={() => openAddReading(resident.id)}
                        >
                          <Droplet size={16} />
                          Pievienot rādījumus
                        </button>
                      </div>
                    </div>

                    {resident.readings.length > 0 ? (
                      <>
                        <div className="resident-stats">
                          <div className="stat-item">
                            <div className="stat-label">Pēdējie rādījumi</div>
                            <div className="stat-value">
                              {lastReading ? new Date(lastReading.date).toLocaleDateString('lv-LV') : '—'}
                            </div>
                          </div>
                          {lastReading && Object.keys(lastReading.meters).sort().map(meterNum => (
                            <div key={meterNum} className="stat-item">
                              <div className="stat-label">Skaitītājs {meterNum}{resident.meterIds?.[meterNum - 1] ? ` (${resident.meterIds[meterNum - 1]})` : ''}</div>
                              <div className="stat-value meter">{lastReading.meters[meterNum]} m³</div>
                            </div>
                          ))}
                        </div>

                        <div className="readings-history">
                          <div className="history-header">
                            <h4>Rādījumu vēsture</h4>
                            <button 
                              className="btn btn-toggle"
                              onClick={() => toggleHistory(resident.id)}
                            >
                              {expandedHistories[resident.id] ? 'Paslēpt' : 'Parādīt'}
                            </button>
                          </div>
                          {expandedHistories[resident.id] && (
                            <div className="readings-list">
                              {resident.readings.map((reading, idx) => {
                                const prevReading = resident.readings[idx + 1];
                                const diff = prevReading ? {} : null;
                                
                                if (diff) {
                                  for (let i = 1; i <= resident.meters; i++) {
                                    diff[i] = reading.meters[i] - prevReading.meters[i];
                                  }
                                }

                                return (
                                  <div key={reading.id} className="reading-item">
                                    <div className="reading-header">
                                      <div className="reading-date">
                                        {new Date(reading.date).toLocaleDateString('lv-LV', {
                                          day: 'numeric',
                                          month: 'long',
                                          year: 'numeric'
                                        })}
                                      </div>
                                      <div className="reading-actions">
                                        <button 
                                          className="btn btn-edit-small"
                                          onClick={() => openEditReading(resident.id, reading)}
                                        >
                                          <Edit size={14} />
                                        </button>
                                        <button 
                                          className="btn btn-delete-small"
                                          onClick={() => deleteReading(resident.id, reading.id)}
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="reading-meters">
                                      {Object.keys(reading.meters).sort().map(meterNum => (
                                        <div key={meterNum} className="meter-reading">
                                          <span className="meter-label">Skaitītājs {meterNum}{resident.meterIds?.[meterNum - 1] ? ` (${resident.meterIds[meterNum - 1]})` : ''}:</span>
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
                      </>
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
                      const cons = r.readings.length >= 2 ? calculateConsumption(r.readings, r.meters) : null;
                      return sum + (cons ? cons.total : 0);
                    }, 0).toFixed(2)}
                  </div>
                  <div className="stat-box-label">m³ kopā</div>
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

      {showEditResident && editingResident && (
        <div className="modal-overlay">
          <div className="card modal-card">
            <h3>REDIĢĒT IEDZĪVOTĀJU</h3>
            <div className="form-group">
              <label>Vārds</label>
              <input
                type="text"
                className="input"
                value={editingResident.name}
                onChange={(e) => setEditingResident({...editingResident, name: e.target.value})}
                placeholder="Jānis Bērziņš"
              />
            </div>
            <div className="form-group">
              <label>Dzīvokļa numurs</label>
              <input
                type="text"
                className="input"
                value={editingResident.apartment}
                onChange={(e) => setEditingResident({...editingResident, apartment: e.target.value})}
                placeholder="7-12"
              />
            </div>
            <div className="form-group">
              <label>E-pasts (neobligāts)</label>
              <input
                type="email"
                className="input"
                value={editingResident.email}
                onChange={(e) => setEditingResident({...editingResident, email: e.target.value})}
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
                value={editingResident.meters}
                onChange={(e) => setEditingResident({...editingResident, meters: parseInt(e.target.value) || 1})}
              />
            </div>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowEditResident(false);
                  setEditingResident(null);
                }}
              >
                Atcelt
              </button>
              <button 
                className="btn btn-primary"
                onClick={updateResident}
              >
                Saglabāt
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddReading && addingResidentId && (
        <div className="modal-overlay">
          <div className="card modal-card">
            <h3>PIEVIENOT RĀDĪJUMUS</h3>
            <div className="form-group">
              <label>Datums</label>
              <input
                type="date"
                className="input"
                value={newReading.date}
                onChange={(e) => setNewReading({...newReading, date: e.target.value})}
              />
            </div>
            {Array.from({ length: residents.find(r => r.id === addingResidentId).meters }, (_, i) => i + 1).map(meterNum => {
              const resident = residents.find(r => r.id === addingResidentId);
              const meterId = resident.meterIds?.[meterNum - 1];
              return (
              <div key={meterNum} className="form-group">
                <label className="meter-label">Skaitītājs {meterNum}{meterId ? ` (${meterId})` : ''} (m³)</label>
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
            );
            })}
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowAddReading(false);
                  setAddingResidentId(null);
                  setNewReading({ meters: {}, date: new Date().toISOString().split('T')[0] });
                }}
              >
                Atcelt
              </button>
              <button 
                className="btn btn-primary"
                onClick={addReading}
              >
                Saglabāt
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditReading && editingReading && editingResidentId && (
        <div className="modal-overlay">
          <div className="card modal-card">
            <h3>REDIĢĒT RĀDĪJUMUS</h3>
            <div className="form-group">
              <label>Datums</label>
              <input
                type="date"
                className="input"
                value={editingReading.date}
                onChange={(e) => setEditingReading({...editingReading, date: e.target.value})}
              />
            </div>
            {Array.from({ length: residents.find(r => r.id === editingResidentId).meters }, (_, i) => i + 1).map(meterNum => {
              const resident = residents.find(r => r.id === editingResidentId);
              const meterId = resident.meterIds?.[meterNum - 1];
              return (
              <div key={meterNum} className="form-group">
                <label className="meter-label">Skaitītājs {meterNum}{meterId ? ` (${meterId})` : ''} (m³)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={editingReading.meters[meterNum] || ''}
                  onChange={(e) => setEditingReading({
                    ...editingReading, 
                    meters: { ...editingReading.meters, [meterNum]: e.target.value }
                  })}
                  placeholder="123.45"
                />
              </div>
            );
            })}
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowEditReading(false);
                  setEditingReading(null);
                  setEditingResidentId(null);
                }}
              >
                Atcelt
              </button>
              <button 
                className="btn btn-primary"
                onClick={editReading}
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

export default AdminView;
