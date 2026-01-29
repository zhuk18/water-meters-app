import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
const RESIDENTS_SHEET = 'Residents';
const READINGS_SHEET = 'Readings';

let sheets = null;
let auth = null;

// In-memory cache with TTL to reduce API quota usage
let residentsCache = null;
let residentsCacheTime = 0;
let readingsCache = null;
let readingsCacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

// Exponential backoff retry logic for rate limiting
async function retryWithBackoff(fn, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const status = error?.response?.status || error?.code;
      
      // Only retry on rate limit (429) or server errors (5xx)
      if (status === 429 || (status >= 500 && status < 600)) {
        if (attempt === maxRetries - 1) throw error;
        
        // Exponential backoff with jitter
        const baseDelay = 300; // 300ms base
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 100;
        console.log(`Rate limited, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Don't retry on other errors
      throw error;
    }
  }
}

export async function initializeSheets() {
  try {
    // Support both service account JSON file and individual environment variables
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      // Option 1: JSON file path
      const serviceAccount = JSON.parse(
        await import('fs').then(fs => 
          fs.promises.readFile(process.env.GOOGLE_SERVICE_ACCOUNT_JSON, 'utf8')
        )
      );
      
      auth = new google.auth.GoogleAuth({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    } else if (process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_CLIENT_EMAIL) {
      // Option 2: Environment variables (better for deployment)
      auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          project_id: process.env.GOOGLE_PROJECT_ID,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    } else {
      throw new Error(
        'Google credentials not found. Set either GOOGLE_SERVICE_ACCOUNT_JSON ' +
        'or GOOGLE_PRIVATE_KEY + GOOGLE_CLIENT_EMAIL environment variables'
      );
    }

    if (!SPREADSHEET_ID) {
      throw new Error('GOOGLE_SHEETS_ID environment variable is required');
    }

    sheets = google.sheets({ version: 'v4', auth });
    
    // Test connection and ensure sheets exist
    await ensureSheetsExist();
    
    return sheets;
  } catch (error) {
    console.error('Failed to initialize Google Sheets:', error);
    throw error;
  }
}

async function ensureSheetsExist() {
  try {
    const response = await retryWithBackoff(() =>
      sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
      })
    );

    const sheetNames = response.data.sheets.map(s => s.properties.title);
    const requests = [];

    if (!sheetNames.includes(RESIDENTS_SHEET)) {
      requests.push({
        addSheet: {
          properties: { title: RESIDENTS_SHEET }
        }
      });
    }

    if (!sheetNames.includes(READINGS_SHEET)) {
      requests.push({
        addSheet: {
          properties: { title: READINGS_SHEET }
        }
      });
    }

    if (requests.length > 0) {
      await retryWithBackoff(() =>
        sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          resource: { requests }
        })
      );
      console.log('Created missing sheets');
    }

    // Initialize headers if sheets are empty
    await initializeHeaders();
  } catch (error) {
    console.error('Error ensuring sheets exist:', error);
    throw error;
  }
}

async function initializeHeaders() {
  try {
    // Check and set Residents headers
    const residentsData = await retryWithBackoff(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${RESIDENTS_SHEET}!A1:G1`,
      })
    );

    if (!residentsData.data.values || residentsData.data.values.length === 0) {
      await retryWithBackoff(() =>
        sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${RESIDENTS_SHEET}!A1:G1`,
          valueInputOption: 'RAW',
          resource: {
            values: [['ID', 'Name', 'Apartment', 'Email', 'Meters', 'MeterIDs', 'CreatedAt']]
          }
        })
      );
    }

    // Check and set Readings headers
    const readingsData = await retryWithBackoff(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${READINGS_SHEET}!A1:F1`,
      })
    );

    if (!readingsData.data.values || readingsData.data.values.length === 0) {
      await retryWithBackoff(() =>
        sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${READINGS_SHEET}!A1:F1`,
          valueInputOption: 'RAW',
          resource: {
            values: [['ID', 'ResidentID', 'Date', 'Meters', 'Notes', 'CreatedAt']]
          }
        })
      );
    }
  } catch (error) {
    console.error('Error initializing headers:', error);
  }
}

function invalidateCache() {
  residentsCache = null;
  residentsCacheTime = 0;
  readingsCache = null;
  readingsCacheTime = 0;
}

export async function getResidents() {
  try {
    // Return cached data if fresh
    const now = Date.now();
    if (residentsCache && (now - residentsCacheTime) < CACHE_TTL) {
      console.log('Using cached residents');
      return residentsCache;
    }

    const response = await retryWithBackoff(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${RESIDENTS_SHEET}!A2:G`,
      })
    );

    const rows = response.data.values || [];
    const readings = await getAllReadings();

    const residents = rows.map(row => {
      const id = row[0];
      return {
        id,
        name: row[1] || '',
        apartment: row[2] || '',
        email: row[3] || '',
        meters: parseInt(row[4]) || 0,
        meterIds: row[5] ? JSON.parse(row[5]) : [],
        readings: readings.filter(r => r.residentId === id)
      };
    });

    // Cache the result
    residentsCache = residents;
    residentsCacheTime = now;

    return residents;
  } catch (error) {
    console.error('Error getting residents from Google Sheets:', error);
    throw error;
  }
}

async function getAllReadings() {
  try {
    const now = Date.now();
    if (readingsCache && (now - readingsCacheTime) < CACHE_TTL) {
      return readingsCache;
    }

    const response = await retryWithBackoff(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${READINGS_SHEET}!A2:F`,
      })
    );

    const rows = response.data.values || [];
    const readings = rows.map(row => ({
      id: row[0],
      residentId: row[1],
      date: row[2],
      meters: row[3] ? JSON.parse(row[3]) : {},
      notes: row[4] || '',
      createdAt: row[5]
    }));

    readingsCache = readings;
    readingsCacheTime = now;

    return readings;
  } catch (error) {
    console.error('Error getting readings from Google Sheets:', error);
    throw error;
  }
}

export async function addResident(resident) {
  try {
    invalidateCache();
    
    const id = resident.id || Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const createdAt = new Date().toISOString();
    
    await retryWithBackoff(() =>
      sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${RESIDENTS_SHEET}!A:G`,
        valueInputOption: 'RAW',
        resource: {
          values: [[
            id,
            resident.name,
            resident.apartment,
            resident.email,
            resident.meters,
            JSON.stringify(resident.meterIds || []),
            createdAt
          ]]
        }
      })
    );

    return { ...resident, id, readings: [] };
  } catch (error) {
    console.error('Error adding resident:', error);
    throw error;
  }
}

export async function updateResident(id, updates) {
  try {
    invalidateCache();
    
    // Find row index
    const response = await retryWithBackoff(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${RESIDENTS_SHEET}!A:A`,
      })
    );

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === id);
    
    if (rowIndex === -1) return null;

    const range = `${RESIDENTS_SHEET}!A${rowIndex + 1}:G${rowIndex + 1}`;
    const existingData = await retryWithBackoff(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range,
      })
    );

    const existing = existingData.data.values[0];
    
    await retryWithBackoff(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range,
        valueInputOption: 'RAW',
        resource: {
          values: [[
            id,
            updates.name ?? existing[1],
            updates.apartment ?? existing[2],
            updates.email ?? existing[3],
            updates.meters ?? existing[4],
            updates.meterIds ? JSON.stringify(updates.meterIds) : existing[5],
            existing[6] // keep original createdAt
          ]]
        }
      })
    );

    const readings = await getAllReadings();
    return {
      id,
      name: updates.name ?? existing[1],
      apartment: updates.apartment ?? existing[2],
      email: updates.email ?? existing[3],
      meters: updates.meters ?? existing[4],
      meterIds: updates.meterIds ?? JSON.parse(existing[5] || '[]'),
      readings: readings.filter(r => r.residentId === id)
    };
  } catch (error) {
    console.error('Error updating resident:', error);
    throw error;
  }
}

export async function deleteResident(id) {
  try {
    invalidateCache();
    
    const response = await retryWithBackoff(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${RESIDENTS_SHEET}!A:A`,
      })
    );

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === id);
    
    if (rowIndex === -1) return false;

    await retryWithBackoff(() =>
      sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: 0, // Assumes Residents is first sheet
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1
              }
            }
          }]
        }
      })
    );

    return true;
  } catch (error) {
    console.error('Error deleting resident:', error);
    throw error;
  }
}

export async function addReading(residentId, reading) {
  try {
    invalidateCache();
    
    const id = reading.id || Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const createdAt = new Date().toISOString();
    
    await retryWithBackoff(() =>
      sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${READINGS_SHEET}!A:F`,
        valueInputOption: 'RAW',
        resource: {
          values: [[
            id,
            residentId,
            reading.date,
            JSON.stringify(reading.meters),
            reading.notes || '',
            createdAt
          ]]
        }
      })
    );

    return { ...reading, id, residentId };
  } catch (error) {
    console.error('Error adding reading:', error);
    throw error;
  }
}

export async function updateReading(residentId, readingId, updates) {
  try {
    invalidateCache();
    
    const response = await retryWithBackoff(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${READINGS_SHEET}!A:A`,
      })
    );

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === readingId);
    
    if (rowIndex === -1) return null;

    const range = `${READINGS_SHEET}!A${rowIndex + 1}:F${rowIndex + 1}`;
    const existingData = await retryWithBackoff(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range,
      })
    );

    const existing = existingData.data.values[0];
    
    await retryWithBackoff(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range,
        valueInputOption: 'RAW',
        resource: {
          values: [[
            readingId,
            residentId,
            updates.date ?? existing[2],
            updates.meters ? JSON.stringify(updates.meters) : existing[3],
            updates.notes ?? existing[4],
            existing[5] // keep original createdAt
          ]]
        }
      })
    );

    return {
      id: readingId,
      residentId,
      date: updates.date ?? existing[2],
      meters: updates.meters ?? JSON.parse(existing[3] || '{}'),
      notes: updates.notes ?? existing[4]
    };
  } catch (error) {
    console.error('Error updating reading:', error);
    throw error;
  }
}

export async function deleteReading(residentId, readingId) {
  try {
    invalidateCache();
    
    const response = await retryWithBackoff(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${READINGS_SHEET}!A:A`,
      })
    );

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === readingId);
    
    if (rowIndex === -1) return false;

    await retryWithBackoff(() =>
      sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: 1, // Assumes Readings is second sheet
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1
              }
            }
          }]
        }
      })
    );

    return true;
  } catch (error) {
    console.error('Error deleting reading:', error);
    throw error;
  }
}
