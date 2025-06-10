import { FoodEntry, Meal, BloodGlucoseReading, NightscoutConfig } from '../types/nightscout';

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
    
    console.log('=== Requesting JWT Token ===');
    console.log('URL:', url.toString());
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('JWT token request failed:', {
        status: response.status,
        statusText: response.statusText,
        response: errorText
      });
      throw new Error(`Failed to get JWT token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as JwtTokenResponse;
    if (!data.token) {
      throw new Error('Invalid JWT token received from server');
    }
    
    this.jwtToken = data.token;
    // Set token expiry to 50 minutes (giving 10-minute buffer before 1-hour expiry)
    this.jwtTokenExpiry = Date.now() + (50 * 60 * 1000);
    
    console.log('=== JWT Token Received ===');
    console.log('Token expiry:', new Date(this.jwtTokenExpiry).toISOString());
    
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
    console.log('=== Nightscout API Request ===');
    console.log('Endpoint:', url.toString());
    console.log('Method:', options.method || 'GET');
    console.log('Headers:', headers);
    if (options.body) {
      try {
        const bodyObj = JSON.parse(options.body as string);
        console.log('Request body:', JSON.stringify(bodyObj, null, 2));
      } catch (e) {
        console.log('Request body:', options.body);
      }
    }
    console.log('===========================');

    const response = await fetch(url.toString(), {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('=== Nightscout API Error ===');
      console.error('Error:', new Error(`Nightscout API error: ${response.status} - ${errorText}`));
      console.error('===========================');
      throw new Error(`Nightscout API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.result || data;
  }

  async getFoodEntries(): Promise<FoodEntry[]> {
    return this.fetchWithAuth('/api/v1/food');
  }

  async createFoodEntry(food: Omit<FoodEntry, 'id'>): Promise<FoodEntry> {
    return this.fetchWithAuth('/api/v1/food', {
      method: 'POST',
      body: JSON.stringify(food),
    });
  }

  async updateFoodEntry(id: string, food: Partial<FoodEntry>): Promise<void> {
    await this.fetchWithAuth(`/api/v1/food/${id}`, {
      method: 'PUT',
      body: JSON.stringify(food),
    });
  }

  async deleteFoodEntry(id: string): Promise<void> {
    await this.fetchWithAuth(`/api/v1/food/${id}`, {
      method: 'DELETE',
    });
  }

  async getMealEntries(): Promise<Meal[]> {
    try {
      const treatments = await this.fetchWithAuth('/api/v3/treatments?eventType$eq=Meal');
      console.log('Raw treatments:', treatments);
      
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
      
      console.log('Processed meals:', meals);
      return meals;
    } catch (error) {
      console.error('Error fetching meal entries:', error);
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
      foodItems: meal.foodItems
    };

    console.log('Creating treatment:', treatment);
    const result = await this.fetchWithAuth('/api/v3/treatments', {
      method: 'POST',
      body: JSON.stringify(treatment),
    });

    console.log('Create meal response:', result);

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

    console.log('Updating meal:', meal);
    
    const treatment = {
      eventType: 'Meal',
      carbs: meal.carbs,
      protein: meal.protein,
      fat: meal.fat,
      notes: meal.name,
      date: meal.timestamp * 1000, // Convert to milliseconds
      foodItems: meal.foodItems
    };

    console.log('Updating meal with data:', treatment);
    const result = await this.fetchWithAuth(`/api/v3/treatments/${meal.nightscoutId}`, {
      method: 'PUT',
      body: JSON.stringify(treatment),
    });

    console.log('Update meal response:', result);

    if (!result || !result.identifier) {
      throw new Error('Failed to update meal: Invalid response from server');
    }

    return {
      ...meal,
      id: result.identifier,
      timestamp: meal.timestamp,
      synced: true,
      nightscoutId: result.identifier
    };
  }

  async deleteMeal(id: string): Promise<void> {
    console.log('Deleting meal with ID:', id);
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
    console.log('Fetching manual blood glucose readings...');
    const entries = await this.fetchWithAuth('/api/v3/entries?type$eq=mbg');
    console.log('Raw mbg entries:', entries);
    
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
    console.log('Creating manual blood glucose entry:', reading);
    
    const entry = {
      type: 'mbg',
      dateString: new Date(reading.date).toISOString(),
      date: reading.date,
      mbg: reading.mbg,
      device: reading.device || 'Manual Entry',
      utcOffset: new Date().getTimezoneOffset(),
      sysTime: new Date(reading.date).toISOString(),
      source: 'glucohub',
      device_source: reading.device_source,
      test: reading.test,
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

    console.log('Creating entry with data:', entry);
    const result = await this.fetchWithAuth('/api/v3/entries', {
      method: 'POST',
      body: JSON.stringify(entry),
    });

    console.log('Create mbg response:', result);

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

    console.log('Updating manual blood glucose entry:', reading);
    
    // First delete the existing entry
    console.log('Deleting existing entry with ID:', reading.nightscoutId);
    await this.deleteBloodGlucoseEntry(reading.nightscoutId);
    
    // Then create a new entry with the updated data
    const entry = {
      type: 'mbg',
      dateString: new Date(reading.date).toISOString(),
      date: reading.date,
      mbg: reading.mbg,
      device: reading.device || 'Manual Entry'
    };

    console.log('Creating new entry with data:', entry);
    const result = await this.fetchWithAuth('/api/v3/entries', {
      method: 'POST',
      body: JSON.stringify([entry]), // API expects an array
    });

    console.log('Create mbg response:', result);

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
    console.log('Deleting blood glucose entry with ID:', id);
    await this.fetchWithAuth(`/api/v3/entries/${id}`, {
      method: 'DELETE',
    });
  }

  async getSensorGlucoseReadings(): Promise<BloodGlucoseReading[]> {
    console.log('Fetching sensor glucose readings...');
    const entries = await this.fetchWithAuth('/api/v3/entries?type$eq=sgv');
    console.log('Raw sgv entries:', entries);
    
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
    console.log('Creating sensor glucose entry:', reading);
    
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

    console.log('Creating entry with data:', entry);
    const result = await this.fetchWithAuth('/api/v3/entries', {
      method: 'POST',
      body: JSON.stringify(entry),
    });

    console.log('Create sgv response:', result);

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

    console.log('Updating sensor glucose entry:', reading);
    
    // First delete the existing entry
    console.log('Deleting existing entry with ID:', reading.nightscoutId);
    await this.deleteSensorGlucoseEntry(reading.nightscoutId);
    
    // Then create a new entry with the updated data
    const entry = {
      type: 'sgv',
      dateString: new Date(reading.date).toISOString(),
      date: reading.date,
      sgv: reading.sgv,
      device: reading.device || 'CGM'
    };

    console.log('Creating new entry with data:', entry);
    const result = await this.fetchWithAuth('/api/v3/entries', {
      method: 'POST',
      body: JSON.stringify([entry]), // API expects an array
    });

    console.log('Create sgv response:', result);

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
    console.log('Deleting sensor glucose entry with ID:', id);
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

  async getBloodGlucoseReadingsInRange(startDate: number, endDate: number): Promise<BloodGlucoseReading[]> {
    console.log('Fetching manual blood glucose readings in range...');
    const startDateStr = new Date(startDate).toISOString().split('T')[0];
    const endDateStr = new Date(endDate).toISOString().split('T')[0];
    
    const entries = await this.fetchWithAuth(
      `/api/v3/entries?type$eq=mbg&dateString$re=^${startDateStr}|^${endDateStr}`
    );
    console.log('Raw mbg entries:', entries);
    
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

  async verifyEntryExists(reading: BloodGlucoseReading): Promise<boolean> {
    console.log('Verifying entry exists:', reading);
    const timestamp = Date.now();
    // Query for entries within a 1-second window of the reading's date
    const entries = await this.fetchWithAuth(
      `/api/v3/entries?type$eq=mbg&dateString$re=^${new Date(reading.date).toISOString().split('T')[0]}|^${new Date(reading.date).toISOString().split('T')[0]}`
    );
    
    // Check if any entry matches the reading's date and value
    const exists = entries.some((entry: any) => 
      Math.abs(entry.date - reading.date) < 1000 && entry.mbg === reading.mbg
    );
    
    console.log('Entry verification result:', exists);
    return exists;
  }

  async getSensorGlucoseReadingsInRange(startDate: number, endDate: number): Promise<BloodGlucoseReading[]> {
    console.log('Fetching sensor glucose readings in range...');
    const startDateStr = new Date(startDate).toISOString().split('T')[0];
    const endDateStr = new Date(endDate).toISOString().split('T')[0];
    
    const entries = await this.fetchWithAuth(
      `/api/v3/entries?type$eq=sgv&dateString$re=^${startDateStr}|^${endDateStr}`
    );
    console.log('Raw sgv entries:', entries);
    
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

  async getMealEntriesInRange(startDate: number, endDate: number): Promise<Meal[]> {
    console.log('Fetching meals in range...');
    const startDateStr = new Date(startDate).toISOString().split('T')[0];
    const endDateStr = new Date(endDate).toISOString().split('T')[0];
    
    const treatments = await this.fetchWithAuth(
      `/api/v3/treatments?eventType$eq=Meal&created_at$re=^${startDateStr}|^${endDateStr}`
    );
    console.log('Raw treatments:', treatments);
    
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
    
    console.log('Processed meals:', meals);
    return meals;
  }
} 