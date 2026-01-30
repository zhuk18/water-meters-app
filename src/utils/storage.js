import { INITIAL_RESIDENTS } from '../data/residents';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabaseFetch = async (path, options = {}) => {
  if (!SUPABASE_URL) {
    throw new Error('Missing VITE_SUPABASE_URL');
  }
  if (!SUPABASE_ANON_KEY) {
    throw new Error('Missing VITE_SUPABASE_ANON_KEY');
  }

  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers
  };

  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers
  });
};

export const loadData = async () => {
  try {
    const residentsResponse = await supabaseFetch('/residents?select=*');
    if (!residentsResponse.ok) {
      throw new Error('Failed to load residents from Supabase');
    }
    const residents = await residentsResponse.json();
    if (!residents || residents.length === 0) return null;

    const readingsResponse = await supabaseFetch('/readings?select=*');
    if (!readingsResponse.ok) {
      throw new Error('Failed to load readings from Supabase');
    }
    const readings = await readingsResponse.json();

    const readingsByResident = readings.reduce((acc, reading) => {
      const residentId = reading.resident_id;
      if (!acc[residentId]) acc[residentId] = [];
      acc[residentId].push({
        id: reading.id,
        date: reading.date,
        meters: reading.meters,
        timestamp: reading.timestamp
      });
      return acc;
    }, {});

    return residents.map(resident => ({
      ...resident,
      meterIds: resident.meterIds ?? resident.meterids ?? [],
      readings: (readingsByResident[resident.id] || [])
        .sort((a, b) => new Date(b.date) - new Date(a.date))
    }));
  } catch (error) {
    console.error('Error loading residents from Supabase:', error);
    return null;
  }
};

export const saveData = async (data) => {
  try {
    if (!data || data.length === 0) {
      const deleteReadingsResponse = await supabaseFetch('/readings?resident_id=not.is.null', {
        method: 'DELETE'
      });
      if (!deleteReadingsResponse.ok) {
        throw new Error('Failed to clear readings in Supabase');
      }

      const deleteResidentsResponse = await supabaseFetch('/residents?id=not.is.null', {
        method: 'DELETE'
      });
      if (!deleteResidentsResponse.ok) {
        throw new Error('Failed to clear residents in Supabase');
      }

      return true;
    }

    const residentsPayload = data.map(resident => ({
      id: resident.id,
      name: resident.name,
      apartment: resident.apartment,
      email: resident.email,
      meters: resident.meters,
      meterids: resident.meterIds ?? resident.meterids ?? []
    }));

    const upsertResidentsResponse = await supabaseFetch('/residents?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(residentsPayload)
    });
    if (!upsertResidentsResponse.ok) {
      throw new Error('Failed to save residents to Supabase');
    }

    const residentIds = data.map(resident => resident.id).filter(Boolean);
    if (residentIds.length > 0) {
      const deleteRemovedResponse = await supabaseFetch(`/residents?id=not.in.(${residentIds.join(',')})`, {
        method: 'DELETE'
      });
      if (!deleteRemovedResponse.ok) {
        throw new Error('Failed to delete removed residents in Supabase');
      }
    }

    const deleteReadingsResponse = await supabaseFetch('/readings?resident_id=not.is.null', {
      method: 'DELETE'
    });
    if (!deleteReadingsResponse.ok) {
      throw new Error('Failed to clear readings in Supabase');
    }

    const readingsPayload = data.flatMap(resident =>
      (resident.readings || []).map(reading => ({
        id: reading.id,
        resident_id: resident.id,
        date: reading.date,
        meters: reading.meters,
        timestamp: reading.timestamp
      }))
    );

    if (readingsPayload.length > 0) {
      const insertReadingsResponse = await supabaseFetch('/readings?on_conflict=id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify(readingsPayload)
      });
      if (!insertReadingsResponse.ok) {
        throw new Error('Failed to save readings to Supabase');
      }
    }

    return true;
  } catch (error) {
    console.error('Error saving residents to Supabase:', error);
    return false;
  }
};

export const initializeResidents = () => {
  return INITIAL_RESIDENTS.map(r => ({
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    name: r.name,
    apartment: r.apartment,
    email: r.email,
    meters: r.meters,
    meterIds: r.meterIds,
    readings: []
  }));
};

export const addResident = async (resident) => {
  try {
    const response = await supabaseFetch('/residents', {
      method: 'POST',
      body: JSON.stringify({
        ...resident,
        meterids: resident.meterIds ?? resident.meterids ?? []
      })
    });
    if (!response.ok) {
      throw new Error('Failed to add resident to Supabase');
    }
    return await response.json();
  } catch (error) {
    console.error('Error adding resident:', error);
    return null;
  }
};

export const updateResident = async (id, resident) => {
  try {
    const response = await supabaseFetch(`/residents?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...resident,
        meterids: resident.meterIds ?? resident.meterids ?? []
      })
    });
    if (!response.ok) {
      throw new Error('Failed to update resident in Supabase');
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating resident:', error);
    return null;
  }
};

export const deleteResident = async (id) => {
  try {
    const response = await supabaseFetch(`/residents?id=eq.${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      throw new Error('Failed to delete resident from Supabase');
    }
    return true;
  } catch (error) {
    console.error('Error deleting resident:', error);
    return false;
  }
};

export const addReading = async (residentId, reading) => {
  try {
    const response = await supabaseFetch('/readings', {
      method: 'POST',
      body: JSON.stringify({ ...reading, resident_id: residentId })
    });
    if (!response.ok) {
      throw new Error('Failed to add reading to Supabase');
    }
    return await response.json();
  } catch (error) {
    console.error('Error adding reading:', error);
    return null;
  }
};

export const updateReading = async (residentId, readingId, reading) => {
  try {
    const response = await supabaseFetch(`/readings?id=eq.${readingId}&resident_id=eq.${residentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...reading, resident_id: residentId })
    });
    if (!response.ok) {
      throw new Error('Failed to update reading in Supabase');
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating reading:', error);
    return null;
  }
};

export const deleteReading = async (residentId, readingId) => {
  try {
    const response = await supabaseFetch(`/readings?id=eq.${readingId}&resident_id=eq.${residentId}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      throw new Error('Failed to delete reading from Supabase');
    }
    return true;
  } catch (error) {
    console.error('Error deleting reading:', error);
    return false;
  }
};

export const generateResidentLink = (residentId) => {
  const baseUrl = window.location.href.split('?')[0];
  return `${baseUrl}?resident=${residentId}`;
};

export const calculateConsumption = (readings, meterCount) => {
  if (readings.length < 2) return null;

  const latest = readings[0];
  const previous = readings[1];

  let totalConsumption = 0;
  const meterConsumption = {};

  for (let i = 1; i <= meterCount; i++) {
    const consumption = latest.meters[i] - previous.meters[i];
    meterConsumption[i] = consumption;
    totalConsumption += consumption;
  }

  return {
    meters: meterConsumption,
    total: totalConsumption
  };
};

export const sendReminderEmails = async (residents, subject = 'Lūdzu nodot ūdens skaitītāju rādījumus', message = 'Lūdzu ievadiet jūsu mājokļa ūdens skaitītāju rādījumus. Tas aizņem tikai dažas minūtes.') => {
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
    const functionUrl = `${SUPABASE_URL}/functions/v1/send-reminder-emails`;

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        residents: residents.map(r => ({
          id: r.id,
          name: r.name,
          email: r.email,
        })),
        subject,
        message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to send reminder emails');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error sending reminder emails:', error);
    throw error;
  }
};

export const uploadInvoice = async (residentId, file) => {
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
    const timestamp = Date.now();
    const fileName = `${residentId}-${timestamp}-${file.name}`;
    const filePath = `invoices/${fileName}`;

    // Upload file to Supabase Storage
    const uploadResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/invoices/${fileName}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(errorText || 'Failed to upload invoice file');
    }

    // Generate public URL
    const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/invoices/${fileName}`;

    // Save invoice metadata to database
    const invoiceRecord = {
      resident_id: residentId,
      file_name: file.name,
      file_path: filePath,
      file_url: fileUrl,
      file_size: file.size,
      file_type: file.type,
      uploaded_at: new Date().toISOString()
    };

    const dbResponse = await supabaseFetch('/invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceRecord)
    });

    if (!dbResponse.ok) {
      const errorText = await dbResponse.text();
      throw new Error(errorText || 'Failed to save invoice metadata');
    }

    return { success: true, fileName, filePath, fileUrl };
  } catch (error) {
    console.error('Error uploading invoice:', error);
    throw error;
  }
};

export const listResidentInvoices = async (residentId) => {
  try {
    const response = await supabaseFetch(`/invoices?resident_id=eq.${residentId}&order=uploaded_at.desc`);

    if (!response.ok) {
      throw new Error('Failed to list invoices');
    }

    const invoices = await response.json();
    return invoices || [];
  } catch (error) {
    console.error('Error listing invoices:', error);
    return [];
  }
};

export const downloadInvoice = async (fileUrl) => {
  try {
    const response = await fetch(fileUrl);

    if (!response.ok) {
      throw new Error('Failed to download invoice');
    }

    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('Error downloading invoice:', error);
    throw error;
  }
};

export const deleteInvoice = async (invoiceId) => {
  try {
    const response = await supabaseFetch(`/invoices?id=eq.${invoiceId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete invoice');
    }

    return true;
  } catch (error) {
    console.error('Error deleting invoice:', error);
    throw error;
  }
};

export const sendInvoiceNotification = async (resident, invoice) => {
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
    const functionUrl = `${SUPABASE_URL}/functions/v1/send-invoice-notification`;

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        resident: {
          id: resident.id,
          name: resident.name,
          email: resident.email,
          apartment: resident.apartment,
        },
        invoice: {
          file_name: invoice.file_name,
          file_url: invoice.file_url,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to send invoice notification');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error sending invoice notification:', error);
    throw error;
  }
};
