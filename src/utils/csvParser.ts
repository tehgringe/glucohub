import Papa from 'papaparse';

export interface BloodGlucoseCSVRow {
  'Item Type': string;
  'Date and Time': string;
  'Value': string;
  'Unit'?: string;
  'Device'?: string;
  'Notes'?: string;
  // New columns in onetouchdata.csv
  'Recommended Dose'?: string;
  'Manual'?: string;
  'Additional Value'?: string;
  'Data Source'?: string;
}

export interface ParsedBloodGlucose {
  date: number;
  dateString: string;
  mbg: number;
  device: string;
  notes?: string;
}

export function parseBloodGlucoseCSV(csvContent: string): ParsedBloodGlucose[] {
  // Remove BOM if present
  const cleanedContent = csvContent.replace(/^\uFEFF|^ï»¿/, '');
  const { data } = Papa.parse(cleanedContent, {
    header: true,
    skipEmptyLines: true,
    // transformHeader is not supported in all versions, so we skip it
    // transform: value => (typeof value === 'string' ? value.trim() : value)
  });

  return (data as any[])
    .filter(row => {
      // Normalize key in case BOM is present
      const itemType = row['Item Type'] || row['ï»¿Item Type'];
      return itemType && itemType.trim() === 'Blood Glucose Reading';
    })
    .map(row => {
      // Handle possible encoding issues in date
      const date = new Date((row['Date and Time'] || '').replace(/â€¯/g, ' ').replace(/"/g, '').trim());
      // Combine Notes and Additional Value if present, and trim
      let notes = '';
      if (row['Notes']) notes += row['Notes'].trim();
      if (row['Additional Value']) notes += (notes ? ' ' : '') + row['Additional Value'].trim();
      return {
        date: date.getTime(),
        dateString: date.toISOString(),
        mbg: parseInt(row['Value'], 10),
        device: row['Device'] || 'OneTouch',
        notes: notes || undefined
      };
    })
    .filter(r => !isNaN(r.mbg) && !isNaN(r.date))
    .sort((a, b) => b.date - a.date); // Sort by date descending
}

export interface SimulatedStepsRow {
  start: Date;
  end: Date;
  steps: number;
  duration: number; // in minutes
}

export function parseSimulatedStepsCSV(csvContent: string): SimulatedStepsRow[] {
  const cleanedContent = csvContent.replace(/^ FEFF|^ï»¿/, '');
  const lines = cleanedContent.trim().split(/\r?\n/);
  const rows: SimulatedStepsRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // Format: startdatetime, steps, enddatetime
    // e.g. June 8 2025, 19:00:00,6500,June 8 2025, 20:00:00
    const parts = line.split(',');
    if (parts.length < 5) continue;
    const startStr = `${parts[0].trim()},${parts[1].trim()}`;
    const steps = parseInt(parts[2].trim(), 10);
    const endStr = `${parts[3].trim()},${parts[4].trim()}`;
    const start = new Date(startStr);
    const end = new Date(endStr);
    const duration = Math.round((end.getTime() - start.getTime()) / 60000); // in minutes
    if (!isNaN(steps) && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
      rows.push({ start, end, steps, duration });
    }
  }
  return rows;
}

export interface SimulatedHeartRateRow {
  datetime: Date;
  heartrate: number;
}

export function parseSimulatedHeartRateCSV(csvContent: string): SimulatedHeartRateRow[] {
  const cleanedContent = csvContent.replace(/^\uFEFF|^ï»¿/, '');
  const lines = cleanedContent.trim().split(/\r?\n/);
  const rows: SimulatedHeartRateRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    if (parts.length < 3) continue;
    const datetimeStr = `${parts[0].trim()},${parts[1].trim()}`;
    const heartrate = parseInt(parts[2].trim(), 10);
    const datetime = new Date(datetimeStr);
    if (!isNaN(heartrate) && !isNaN(datetime.getTime())) {
      rows.push({ datetime, heartrate });
    }
  }
  return rows;
}

export function parseRealHeartRateCSV(csvContent: string): SimulatedHeartRateRow[] {
  const cleanedContent = csvContent.replace(/^\uFEFF|^ï»¿/, '');
  const lines = cleanedContent.trim().split(/\r?\n/);
  const rows: SimulatedHeartRateRow[] = [];
  if (lines.length < 2) return rows;
  const header = lines[0].split(',');
  const bpmIdx = header.indexOf('bpm');
  const tsIdx = header.indexOf('timestamp');
  if (bpmIdx === -1 || tsIdx === -1) return rows;
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length <= Math.max(bpmIdx, tsIdx)) continue;
    const heartrate = parseInt(parts[bpmIdx], 10);
    const timestamp = parseInt(parts[tsIdx], 10);
    if (!isNaN(heartrate) && !isNaN(timestamp)) {
      rows.push({ datetime: new Date(timestamp), heartrate });
    }
  }
  return rows;
}

export interface FoodCSVRow {
  name: string;
  carbs: number;
  protein: number;
  fat: number;
  notes?: string;
  type: 'food';
  category?: string;
  subcategory?: string;
  gi?: number;
  energy?: number;
}

export interface RawFoodCSVRow {
  name: string;
  carbs: string;
  protein: string;
  fat: string;
  notes?: string;
  category?: string;
  subcategory?: string;
  gi?: string;
  energy?: string;
}

export function parseFoodCSV(csvContent: string): FoodCSVRow[] {
  // Remove BOM if present
  const cleanedContent = csvContent.replace(/^\uFEFF|^ï»¿/, '');
  const { data } = Papa.parse(cleanedContent, {
    header: true,
    skipEmptyLines: true,
  });

  return (data as any[])
    .map(row => ({
      name: row.name?.trim() || '',
      carbs: row.carbs?.trim() || '0',
      protein: row.protein?.trim() || '0',
      fat: row.fat?.trim() || '0',
      notes: row.notes?.trim(),
      category: row.category?.trim(),
      subcategory: row.subcategory?.trim(),
      gi: row.gi?.trim(),
      energy: row.energy?.trim()
    } as RawFoodCSVRow))
    .filter(row => row.name && !isNaN(Number(row.carbs)) && !isNaN(Number(row.protein)) && !isNaN(Number(row.fat)))
    .map(row => ({
      name: row.name,
      carbs: Number(row.carbs),
      protein: Number(row.protein),
      fat: Number(row.fat),
      type: 'food' as const,
      notes: row.notes || (row.category || row.subcategory || row.gi || row.energy) ? 
        `Category: ${row.category || ''}, Subcategory: ${row.subcategory || ''}, GI: ${row.gi || ''}, Energy: ${row.energy ? row.energy + 'kJ' : ''}`.trim() : 
        undefined
    } as FoodCSVRow));
} 