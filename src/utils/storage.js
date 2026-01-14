import { INITIAL_RESIDENTS } from '../data/residents';

export const loadData = () => {
  try {
    const data = localStorage.getItem('residents-data');
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.log('Nav esošu datu, sāk no jauna');
  }
  return null;
};

export const saveData = (data) => {
  try {
    localStorage.setItem('residents-data', JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Kļūda saglabājot datus:', error);
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
    readings: []
  }));
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
