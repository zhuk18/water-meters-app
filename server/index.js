import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { 
  getResidents, 
  addResident, 
  updateResident, 
  deleteResident,
  getReadings,
  addReading,
  updateReading,
  deleteReading,
  initializeSheets
} from './google-sheets.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize Google Sheets connection on startup
let sheetsInitialized = false;
let initError = null;

(async () => {
  try {
    await initializeSheets();
    sheetsInitialized = true;
    console.log('✓ Google Sheets API initialized successfully');
  } catch (error) {
    initError = error;
    console.error('✗ Failed to initialize Google Sheets:', error.message);
  }
})();

// Middleware to check if Sheets is initialized
const requireSheets = (req, res, next) => {
  if (!sheetsInitialized) {
    return res.status(503).json({ 
      error: 'Google Sheets not initialized',
      details: initError?.message || 'Initialization in progress'
    });
  }
  next();
};

// GET /api/residents - Get all residents with their readings
app.get('/api/residents', requireSheets, async (req, res) => {
  try {
    const residents = await getResidents();
    res.json(residents);
  } catch (error) {
    console.error('Error fetching residents:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/residents - Add a new resident
app.post('/api/residents', requireSheets, async (req, res) => {
  try {
    const resident = await addResident(req.body);
    res.status(201).json(resident);
  } catch (error) {
    console.error('Error adding resident:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/residents/:id - Update a resident
app.put('/api/residents/:id', requireSheets, async (req, res) => {
  try {
    const updated = await updateResident(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Resident not found' });
    }
    res.json(updated);
  } catch (error) {
    console.error('Error updating resident:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/residents/:id - Delete a resident
app.delete('/api/residents/:id', requireSheets, async (req, res) => {
  try {
    const deleted = await deleteResident(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Resident not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting resident:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/residents/:residentId/readings - Add a reading for a resident
app.post('/api/residents/:residentId/readings', requireSheets, async (req, res) => {
  try {
    const reading = await addReading(req.params.residentId, req.body);
    res.status(201).json(reading);
  } catch (error) {
    console.error('Error adding reading:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/residents/:residentId/readings/:readingId - Update a reading
app.put('/api/residents/:residentId/readings/:readingId', requireSheets, async (req, res) => {
  try {
    const updated = await updateReading(req.params.residentId, req.params.readingId, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Reading not found' });
    }
    res.json(updated);
  } catch (error) {
    console.error('Error updating reading:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/residents/:residentId/readings/:readingId - Delete a reading
app.delete('/api/residents/:residentId/readings/:readingId', requireSheets, async (req, res) => {
  try {
    const deleted = await deleteReading(req.params.residentId, req.params.readingId);
    if (!deleted) {
      return res.status(404).json({ error: 'Reading not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting reading:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: sheetsInitialized ? 'healthy' : 'initializing',
    sheets: sheetsInitialized,
    error: initError?.message
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('All data stored in Google Sheets');
});
