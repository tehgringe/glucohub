import { FoodEntry, Meal, BloodGlucoseReading, NightscoutConfig } from '../types/nightscout';
import { getLocalDateString } from './dateUtils';

interface JwtTokenResponse {
  token: string;
}

export class NightscoutClient {
  private baseUrl: string;
  private apiSecret: string;
  private accessToken: string;
  private jwtToken: string | null = null;
  private jwtTokenExpiry: number | null = null;

  constructor(baseUrl: string, apiSecret: string, accessToken: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.apiSecret = apiSecret;
    this.accessToken = accessToken;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getApiSecret(): string {
    return this.apiSecret;
  }

  private async getJwtToken(): Promise<string> {
    // Check if we have a valid token
    if (this.jwtToken && this.jwtTokenExpiry && Date.now() < this.jwtTokenExpiry) {
      return this.jwtToken;
    }

    // Request new JWT token using accessToken
    const url = new URL('/api/v2/authorization/request/' + this.accessToken, this.baseUrl);
    
    // All debug logging suppressed as per request
    // console.log('=== Requesting JWT Token ===');
    // console.log('URL:', url.toString());
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      // console.error('JWT token request failed:', {
      //   status: response.status,
      //   statusText: response.statusText,
      //   response: errorText
      // });
      throw new Error(`Failed to get JWT token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as JwtTokenResponse;
    if (!data.token) {
      throw new Error('Invalid JWT token received from server');
    }
    
    this.jwtToken = data.token;
    // Set token expiry to 50 minutes (giving 10-minute buffer before 1-hour expiry)
    this.jwtTokenExpiry = Date.now() + (50 * 60 * 1000);
    
    // All debug logging suppressed as per request
    // console.log('=== JWT Token Received ===');
    // console.log('Token expiry:', new Date(this.jwtTokenExpiry).toISOString());
    
    return this.jwtToken;
  }

  private async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const url = endpoint.startsWith('http')
      ? new URL(endpoint)
      : new URL(endpoint, this.baseUrl);
    
    // Get JWT token for all API v3 requests
    const jwtToken = await this.getJwtToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${jwtToken}`,
      ...(options.headers as Record<string, string> || {}),
    };

    // Enhanced request debugging
    // All debug logging suppressed as per request
    // console.log('=== Nightscout API Request ===');
    // console.log('Endpoint:', url.toString());
    // console.log('Method:', options.method || 'GET');
    // console.log('Headers:', headers);
    if (options.body) {
      try {
        const bodyObj = JSON.parse(options.body as string);
        // All debug logging suppressed as per request
        // console.log('Request body:', JSON.stringify(bodyObj, null, 2));
      } catch (e) {
        // All debug logging suppressed as per request
        // console.log('Request body:', options.body);
      }
    }
    // All debug logging suppressed as per request
    // console.log('===========================');

    const response = await fetch(url.toString(), {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      // All debug logging suppressed as per request
      // console.error('=== Nightscout API Error ===');
      // console.error('Error:', new Error(`Nightscout API error: ${response.status} - ${errorText}`));
      // console.error('===========================');
      throw new Error(`Nightscout API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.result || data;
  }

  async getFoodEntries(): Promise<FoodEntry[]> {
    // All debug logging suppressed as per request
    // console.log('Fetching food entries...');
    const response = await this.fetchWithAuth('/api/v3/food');
    
    // The response is already parsed JSON from fetchWithAuth
    if (!response || !Array.isArray(response)) {
      throw new Error('Invalid response from server');
    }
    
    return response.map((food: any) => ({
      id: food.identifier,
      name: food.name,
      carbs: food.carbs,
      protein: food.protein || 0,
      fat: food.fat || 0,
      notes: food.notes
    }));
  }

  async createFoodEntry(food: Omit<FoodEntry, 'id'>): Promise<FoodEntry> {
    console.log('[NS DEBUG] Payload to /api/v3/food:', food);
    const response = await this.fetchWithAuth('/api/v3/food', {
      method: 'POST',
      body: JSON.stringify(food)
    });

    if (!response || !response.identifier) {
      throw new Error('Failed to create food entry: Invalid response from server');
    }

    return {
      id: response.identifier,
      name: response.name,
      carbs: response.carbs,
      protein: response.protein || 0,
      fat: response.fat || 0,
      notes: response.notes
    };
  }

  async updateFoodEntry(id: string, food: Partial<FoodEntry>): Promise<void> {
    await this.fetchWithAuth(`/api/v1/food/${id}`, {
      method: 'PUT',
      body: JSON.stringify(food),
    });
  }

  async deleteFoodEntry(id: string): Promise<void> {
    // All debug logging suppressed as per request
    // console.log('Deleting food entry with ID:', id);
    await this.fetchWithAuth(`/api/v3/treatments/${id}`, {
      method: 'DELETE',
    });
  }

  async getMealEntries(): Promise<Meal[]> {
    try {
      const treatments = await this.fetchWithAuth('/api/v3/treatments?eventType$eq=Meal');
      // All debug logging suppressed as per request
      // console.log('Raw treatments:', treatments);
      
      // Filter for meal entries and map to Meal objects
      const meals = treatments
        .filter((treatment: any) => treatment.carbs !== undefined)
        .map((treatment: any) => ({
          id: treatment.identifier,
          name: treatment.notes || 'Meal',
          carbs: treatment.carbs,
          protein: treatment.protein || 0,
          fat: treatment.fat || 0,
          notes: treatment.notes,
          timestamp: treatment.date / 1000, // Convert from milliseconds to seconds
          synced: true,
          foodItems: treatment.foodItems || [],
          nightscoutId: treatment.identifier
        }));
      
      // All debug logging suppressed as per request
      // console.log('Processed meals:', meals);
      return meals;
    } catch (error) {
      // All debug logging suppressed as per request
      // console.error('Error fetching meal entries:', error);
      throw error;
    }
  }

  async createMeal(meal: Omit<Meal, 'id'>): Promise<Meal> {
    const treatment = {
      eventType: 'Meal',
      carbs: meal.carbs,
      protein: meal.protein,
      fat: meal.fat,
      notes: meal.name,
      date: meal.timestamp * 1000, // Convert to milliseconds
      created_at: new Date().toISOString(),
      foodItems: meal.foodItems,
      app: 'glucohub', // Required field for API v3
      device: 'glucohub', // Add device field for better tracking
      source: 'glucohub' // Add source field for better tracking
    };

    // All debug logging suppressed as per request
    // console.log('Creating treatment:', treatment);
    const result = await this.fetchWithAuth('/api/v3/treatments', {
      method: 'POST',
      body: JSON.stringify(treatment),
    });

    // All debug logging suppressed as per request
    // console.log('Create meal response:', result);

    if (!result || !result.identifier) {
      throw new Error('Failed to create meal: Invalid response from server');
    }

    return {
      ...meal,
      id: result.identifier,
      timestamp: meal.timestamp,
      synced: true,
      nightscoutId: result.identifier
    };
  }

  async updateMeal(meal: Meal): Promise<Meal> {
    if (!meal.nightscoutId) {
      throw new Error('Cannot update meal: Missing Nightscout ID');
    }

    // Step 1: Delete the existing treatment
    try {
      console.debug('[Nightscout] updateMeal: Deleting old treatment', meal.nightscoutId);
      await this.fetchWithAuth(`/api/v3/treatments/${meal.nightscoutId}`, {
        method: 'DELETE',
      });
      console.debug('[Nightscout] updateMeal: Old treatment deleted');
    } catch (deleteError) {
      console.error('[Nightscout] updateMeal: Error deleting old treatment', deleteError);
      throw deleteError;
    }

    // Step 2: Create a new treatment with updated data
    const treatment = {
      eventType: 'Meal',
      carbs: meal.carbs,
      protein: meal.protein,
      fat: meal.fat,
      notes: meal.name,
      date: meal.timestamp * 1000, // Convert to milliseconds
      foodItems: meal.foodItems,
      app: 'glucohub', // Required field for API v3
      device: 'glucohub', // Add device field for better tracking
      source: 'glucohub' // Add source field for better tracking
    };

    console.debug('[Nightscout] updateMeal: Creating new treatment', treatment);
    try {
      const result = await this.fetchWithAuth('/api/v3/treatments', {
        method: 'POST',
        body: JSON.stringify(treatment),
      });
      console.debug('[Nightscout] updateMeal: New treatment created', result);
      if (!result || !result.identifier) {
        throw new Error('Failed to create updated meal: Invalid response from server');
      }
      return {
        ...meal,
        id: result.identifier,
        timestamp: meal.timestamp,
        synced: true,
        nightscoutId: result.identifier
      };
    } catch (createError) {
      console.error('[Nightscout] updateMeal: Error creating new treatment', createError);
      throw createError;
    }
  }

  async deleteMeal(id: string): Promise<void> {
    // All debug logging suppressed as per request
    // console.log('Deleting meal with ID:', id);
    await this.fetchWithAuth(`/api/v3/treatments/${id}`, {
      method: 'DELETE',
    });
  }

  async syncMeal(meal: Meal): Promise<Meal> {
    return this.fetchWithAuth(`/api/v1/entries/${meal.id}/sync`, {
      method: 'POST',
    });
  }

  async getBloodGlucoseReadings(): Promise<BloodGlucoseReading[]> {
    // All debug logging suppressed as per request
    // console.log('Fetching manual blood glucose readings...');
    const entries = await this.fetchWithAuth('/api/v3/entries?type$eq=mbg');
    // All debug logging suppressed as per request
    // console.log('Raw mbg entries:', entries);
    
    return entries.map((entry: any) => ({
      id: entry.identifier,
      nightscoutId: entry.identifier,
      date: entry.date,
      mbg: entry.mbg,
      device: entry.device || 'Manual Entry',
      type: 'mbg',
      value: entry.mbg,
      dateString: entry.dateString,
      direction: entry.direction,
      customFields: entry.customFields
    }));
  }

  async createBloodGlucoseEntry(reading: Omit<BloodGlucoseReading, 'id'>): Promise<BloodGlucoseReading> {
    // All debug logging suppressed as per request
    // console.log('Creating manual blood glucose entry:', reading);
    
    const entry = {
      type: 'mbg',
      dateString: new Date(reading.date).toISOString(),
      date: reading.date,
      mbg: reading.mbg,
      device: reading.device || 'Manual Entry',
      utcOffset: new Date().getTimezoneOffset(),
      sysTime: new Date(reading.date).toISOString(),
      direction: reading.direction,
      source: 'glucohub',
      device_source: reading.device_source,
      test: reading.test,
      app: 'glucohub', // Required field for API v3
      customFields: {
        source: 'glucohub',
        version: '1.0.0',
        metadata: {
          createdBy: 'manual-entry',
          timestamp: Date.now(),
          deviceSource: reading.device_source,
          isTest: reading.test
        }
      }
    };

    // All debug logging suppressed as per request
    // console.log('Creating entry with data:', entry);
    const result = await this.fetchWithAuth('/api/v3/entries', {
      method: 'POST',
      body: JSON.stringify(entry),
    });

    // All debug logging suppressed as per request
    // console.log('Create mbg response:', result);

    if (!result || !result.identifier) {
      throw new Error('Failed to create manual blood glucose entry: Invalid response from server');
    }

    return {
      ...reading,
      id: result.identifier,
      nightscoutId: result.identifier
    };
  }

  async updateBloodGlucoseEntry(reading: BloodGlucoseReading): Promise<BloodGlucoseReading> {
    if (!reading.nightscoutId) {
      throw new Error('Cannot update manual blood glucose entry: Missing Nightscout ID');
    }

    // All debug logging suppressed as per request
    // console.log('Updating manual blood glucose entry:', reading);
    
    // First delete the existing entry
    // All debug logging suppressed as per request
    // console.log('Deleting existing entry with ID:', reading.nightscoutId);
    await this.deleteBloodGlucoseEntry(reading.nightscoutId);
    
    // Then create a new entry with the updated data
    const entry = {
      type: 'mbg',
      dateString: new Date(reading.date).toISOString(),
      date: reading.date,
      mbg: reading.mbg,
      device: reading.device || 'Manual Entry'
    };

    // All debug logging suppressed as per request
    // console.log('Creating new entry with data:', entry);
    const result = await this.fetchWithAuth('/api/v3/entries', {
      method: 'POST',
      body: JSON.stringify([entry]), // API expects an array
    });

    // All debug logging suppressed as per request
    // console.log('Create mbg response:', result);

    // Handle array response
    const createdEntry = Array.isArray(result) ? result[0] : result;
    if (!createdEntry || !createdEntry.identifier) {
      throw new Error('Failed to create manual blood glucose entry: Invalid response from server');
    }

    return {
      ...reading,
      id: createdEntry.identifier,
      nightscoutId: createdEntry.identifier
    };
  }

  async deleteBloodGlucoseEntry(id: string): Promise<void> {
    // All debug logging suppressed as per request
    // console.log('Deleting blood glucose entry with ID:', id);
    await this.fetchWithAuth(`/api/v3/entries/${id}`, {
      method: 'DELETE',
    });
  }

  async getSensorGlucoseReadings(): Promise<BloodGlucoseReading[]> {
    // All debug logging suppressed as per request
    // console.log('Fetching sensor glucose readings...');
    const entries = await this.fetchWithAuth('/api/v3/entries?type$eq=sgv');
    // All debug logging suppressed as per request
    // console.log('Raw sgv entries:', entries);
    
    return entries.map((entry: any) => ({
      id: entry.identifier,
      nightscoutId: entry.identifier,
      date: entry.date,
      sgv: entry.sgv,
      device: entry.device || 'CGM',
      type: 'sgv',
      value: entry.sgv,
      dateString: entry.dateString,
      direction: entry.direction,
      customFields: entry.customFields
    }));
  }

  async createSensorGlucoseEntry(reading: Omit<BloodGlucoseReading, 'id'>): Promise<BloodGlucoseReading> {
    // All debug logging suppressed as per request
    // console.log('Creating sensor glucose entry:', reading);
    
    const entry = {
      type: 'sgv',
      dateString: new Date(reading.date).toISOString(),
      date: reading.date,
      sgv: reading.sgv,
      device: reading.device || 'CGM',
      utcOffset: new Date().getTimezoneOffset(),
      sysTime: new Date(reading.date).toISOString(),
      direction: reading.direction,
      source: 'glucohub',
      device_source: reading.device_source,
      test: reading.test,
      app: 'glucohub', // Required field for API v3
      customFields: {
        source: 'glucohub',
        version: '1.0.0',
        metadata: {
          createdBy: 'manual-entry',
          timestamp: Date.now(),
          deviceSource: reading.device_source,
          isTest: reading.test
        }
      }
    };

    // All debug logging suppressed as per request
    // console.log('Creating entry with data:', entry);
    const result = await this.fetchWithAuth('/api/v3/entries', {
      method: 'POST',
      body: JSON.stringify(entry),
    });

    // All debug logging suppressed as per request
    // console.log('Create sgv response:', result);

    if (!result || !result.identifier) {
      throw new Error('Failed to create sensor glucose entry: Invalid response from server');
    }

    return {
      ...reading,
      id: result.identifier,
      nightscoutId: result.identifier
    };
  }

  async updateSensorGlucoseEntry(reading: BloodGlucoseReading): Promise<BloodGlucoseReading> {
    if (!reading.nightscoutId) {
      throw new Error('Cannot update sensor glucose entry: Missing Nightscout ID');
    }

    // All debug logging suppressed as per request
    // console.log('Updating sensor glucose entry:', reading);
    
    // First delete the existing entry
    // All debug logging suppressed as per request
    // console.log('Deleting existing entry with ID:', reading.nightscoutId);
    await this.deleteSensorGlucoseEntry(reading.nightscoutId);
    
    // Then create a new entry with the updated data
    const entry = {
      type: 'sgv',
      dateString: new Date(reading.date).toISOString(),
      date: reading.date,
      sgv: reading.sgv,
      device: reading.device || 'CGM'
    };

    // All debug logging suppressed as per request
    // console.log('Creating new entry with data:', entry);
    const result = await this.fetchWithAuth('/api/v3/entries', {
      method: 'POST',
      body: JSON.stringify([entry]), // API expects an array
    });

    // All debug logging suppressed as per request
    // console.log('Create sgv response:', result);

    // Handle array response
    const createdEntry = Array.isArray(result) ? result[0] : result;
    if (!createdEntry || !createdEntry.identifier) {
      throw new Error('Failed to create sensor glucose entry: Invalid response from server');
    }

    return {
      ...reading,
      id: createdEntry.identifier,
      nightscoutId: createdEntry.identifier
    };
  }

  async deleteSensorGlucoseEntry(id: string): Promise<void> {
    // All debug logging suppressed as per request
    // console.log('Deleting sensor glucose entry with ID:', id);
    await this.fetchWithAuth(`/api/v3/entries/${id}`, {
      method: 'DELETE',
    });
  }

  async uploadEntries(entries: any[]): Promise<void> {
    if (!this.apiSecret) {
      throw new Error('API secret not configured');
    }

    const response = await fetch(`${this.baseUrl}/api/v3/entries`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.jwtToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(entries)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to upload entries: ${response.status}`);
    }
  }

  async getBloodGlucoseReadingsInRange(startDate: number, endDate: number, localDateString?: string): Promise<BloodGlucoseReading[]> {
    // All debug logging suppressed as per request
    // console.log('Fetching manual blood glucose readings in range...');
    // Use the provided localDateString for filtering if available
    const startDateStr = localDateString || getLocalDateString(new Date(startDate));
    const endDateStr = localDateString || getLocalDateString(new Date(endDate));
    
    // Use dateString$re for reliable date filtering
    const entries = await this.fetchWithAuth(
      `/api/v3/entries?type$eq=mbg&dateString$re=^${startDateStr}|^${endDateStr}`
    );
    // All debug logging suppressed as per request
    // console.log('Raw mbg entries:', entries);
    
    // Filter entries to ensure they're within the exact time range
    const filteredEntries = entries.filter((entry: any) => 
      entry.date >= startDate && entry.date <= endDate
    );
    
    return filteredEntries.map((entry: any) => ({
      id: entry.identifier,
      nightscoutId: entry.identifier,
      date: entry.date,
      mbg: entry.mbg,
      device: entry.device || 'Manual Entry',
      type: 'mbg',
      value: entry.mbg,
      dateString: entry.dateString,
      direction: entry.direction,
      customFields: entry.customFields
    }));
  }

  async verifyEntryExists(reading: BloodGlucoseReading): Promise<boolean> {
    // All debug logging suppressed as per request
    // console.log('Verifying entry exists:', reading);
    const dateStr = new Date(reading.date).toISOString().split('T')[0];
    
    // Use dateString$re for reliable date filtering
    const entries = await this.fetchWithAuth(
      `/api/v3/entries?type$eq=mbg&dateString$re=^${dateStr}`
    );
    
    // Check if any entry matches the reading's date and value
    const exists = entries.some((entry: any) => 
      Math.abs(entry.date - reading.date) < 1000 && entry.mbg === reading.mbg
    );
    
    // All debug logging suppressed as per request
    // console.log('Entry verification result:', exists);
    return exists;
  }

  async getSensorGlucoseReadingsInRange(startDate: number, endDate: number, localDateString?: string, timezoneOffsetMinutes?: number): Promise<BloodGlucoseReading[]> {
    // Get UTC date strings for the API query
    const startDateUTC = new Date(startDate);
    const endDateUTC = new Date(endDate);
    const startDateStr = startDateUTC.toISOString().split('T')[0];  // YYYY-MM-DD in UTC
    const endDateStr = endDateUTC.toISOString().split('T')[0];      // YYYY-MM-DD in UTC
    
    // Use dateString$re with UTC date strings for reliable date filtering
    const entries = await this.fetchWithAuth(
      `/api/v3/entries?type$eq=sgv&dateString$re=^${startDateStr}|^${endDateStr}`
    );
    
    // Get the local date string for the selected day (e.g., '2025-06-10')
    const selectedLocalDateStr = localDateString || new Date(startDate).toISOString().split('T')[0];
    
    // Filter entries: use new Date(entry.date) to get local time, format as YYYY-MM-DD, compare to selectedLocalDateStr
    const filteredEntries = entries.filter((entry: any) => {
      const localDate = new Date(entry.date);
      const localDateStr = localDate.getFullYear() + '-' +
        String(localDate.getMonth() + 1).padStart(2, '0') + '-' +
        String(localDate.getDate()).padStart(2, '0');
      return localDateStr === selectedLocalDateStr;
    });
    
    return filteredEntries.map((entry: any) => ({
      id: entry.identifier,
      nightscoutId: entry.identifier,
      date: entry.date,
      sgv: entry.sgv,
      device: entry.device || 'CGM',
      type: 'sgv',
      value: entry.sgv,
      dateString: entry.dateString,
      direction: entry.direction,
      customFields: entry.customFields
    }));
  }

  async getMealEntriesInRange(startDate: number, endDate: number, localDateString?: string): Promise<Meal[]> {
    // All debug logging suppressed as per request
    // console.log('Fetching meals in range...');
    const startDateStr = localDateString || getLocalDateString(new Date(startDate));
    const endDateStr = localDateString || getLocalDateString(new Date(endDate));
    
    // Use created_at$re for treatments (meals)
    const treatments = await this.fetchWithAuth(
      `/api/v3/treatments?eventType$eq=Meal&created_at$re=^${startDateStr}|^${endDateStr}`
    );
    // All debug logging suppressed as per request
    // console.log('Raw treatments:', treatments);
    
    // Filter treatments to ensure they're within the exact time range
    const filteredTreatments = treatments.filter((treatment: any) => 
      treatment.date >= startDate && treatment.date <= endDate
    );
    
    // Filter for meal entries and map to Meal objects
    const meals = filteredTreatments
      .filter((treatment: any) => treatment.carbs !== undefined)
      .map((treatment: any) => ({
        id: treatment.identifier,
        name: treatment.notes || 'Meal',
        carbs: treatment.carbs,
        protein: treatment.protein || 0,
        fat: treatment.fat || 0,
        notes: treatment.notes,
        created_at: treatment.created_at, // <-- Use for plotting
        synced: true,
        foodItems: treatment.foodItems || [],
        nightscoutId: treatment.identifier
      }));
    
    // All debug logging suppressed as per request
    // console.log('Processed meals:', meals);
    return meals;
  }
}

export async function testNightscoutApiV3Status(baseUrl: string, accessToken: string): Promise<any> {
  // Step 1: Get JWT
  const jwtUrl = baseUrl.replace(/\/$/, '') + '/api/v2/authorization/request/' + accessToken;
  const jwtResp = await fetch(jwtUrl, { method: 'GET', headers: { 'Accept': 'application/json' } });
  if (!jwtResp.ok) throw new Error('Failed to get JWT: ' + jwtResp.statusText);
  const jwtData = await jwtResp.json();
  if (!jwtData.token) throw new Error('No JWT token received');
  const jwt = jwtData.token;

  // Step 2: Use JWT for API v3 status
  const url = baseUrl.replace(/\/$/, '') + '/api/v3/status';
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to fetch status');
  return data;
} 