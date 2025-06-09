import { FoodEntry, Meal, BloodGlucoseReading, NightscoutConfig } from '../types/nightscout';

export class NightscoutClient {
  private baseUrl: string;
  private apiSecret: string;
  private jwtToken: string | null = null;
  private jwtTokenExpiry: number | null = null;

  constructor(config: NightscoutConfig) {
    this.baseUrl = config.nightscoutUrl.replace(/\/$/, '');
    this.apiSecret = config.nightscoutApiSecret;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getApiSecret(): string {
    return this.apiSecret;
  }

  async getJwtToken(): Promise<string> {
    if (this.jwtToken && this.jwtTokenExpiry && Date.now() < this.jwtTokenExpiry) {
      return this.jwtToken;
    }

    const response = await fetch(
      `${this.baseUrl}/api/v2/authorization/request/${this.apiSecret}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get JWT token');
    }

    const data = await response.json();
    if (!data.token || typeof data.token !== 'string') {
      throw new Error('Invalid JWT token received');
    }
    
    const token: string = data.token;
    this.jwtToken = token;
    // Set token expiry to 50 minutes (giving 10-minute buffer)
    this.jwtTokenExpiry = Date.now() + 50 * 60 * 1000;
    return token;
  }

  private async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const url = endpoint.startsWith('http')
      ? new URL(endpoint)
      : new URL(endpoint, this.baseUrl);
    
    url.searchParams.append('token', this.apiSecret);

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
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

    try {
      const response = await fetch(url.toString(), {
        ...options,
        headers,
        mode: 'cors'
      });

      // Enhanced response debugging
      console.log('=== Nightscout API Response ===');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        console.error('API Error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        throw new Error(`Nightscout API error: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
      console.log('===========================');
      return data;
    } catch (error) {
      console.error('=== Nightscout API Error ===');
      console.error('Error:', error);
      console.error('===========================');
      throw error;
    }
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
      // Add timestamp to prevent caching
      const url = new URL(`${this.baseUrl}/api/v1/treatments`);
      url.searchParams.append('_t', Date.now().toString());
      
      console.log('Fetching meals from:', url.toString());
      const treatments = await this.fetchWithAuth(url.toString());
      console.log('Raw treatments:', treatments);
      
      // Filter for meal entries and map to Meal objects
      const meals = treatments
        .filter((treatment: any) => treatment.eventType === 'Meal' && treatment.carbs !== undefined)
        .map((treatment: any) => ({
          id: treatment._id,
          name: treatment.notes || 'Meal',
          carbs: treatment.carbs,
          protein: treatment.protein || 0,
          fat: treatment.fat || 0,
          notes: treatment.notes,
          timestamp: treatment.date / 1000, // Convert from milliseconds to seconds
          synced: true,
          foodItems: treatment.foodItems || [],
          nightscoutId: treatment._id
        }));
      
      console.log('Processed meals:', meals);
      return meals;
    } catch (error) {
      console.error('Error fetching meal entries:', error);
      return [];
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
      foodItems: meal.foodItems // Include foodItems in the treatment
    };

    console.log('Creating treatment:', treatment);
    const result = await this.fetchWithAuth('/api/v1/treatments', {
      method: 'POST',
      body: JSON.stringify(treatment),
    });

    console.log('Create meal response:', result);

    // Handle array response
    const createdTreatment = Array.isArray(result) ? result[0] : result;
    if (!createdTreatment || !createdTreatment._id) {
      throw new Error('Failed to create meal: Invalid response from server');
    }

    return {
      ...meal,
      id: createdTreatment._id,
      timestamp: meal.timestamp,
      synced: true,
      nightscoutId: createdTreatment._id
    };
  }

  async updateMeal(meal: Meal): Promise<Meal> {
    if (!meal.nightscoutId) {
      throw new Error('Cannot update meal: Missing Nightscout ID');
    }

    console.log('Updating meal:', meal);
    
    // First delete the existing meal
    console.log('Deleting existing meal with ID:', meal.nightscoutId);
    await this.deleteMeal(meal.nightscoutId);
    
    // Then create a new meal with the updated data
    const treatment = {
      eventType: 'Meal',
      carbs: meal.carbs,
      protein: meal.protein,
      fat: meal.fat,
      notes: meal.name,
      date: meal.timestamp * 1000, // Convert to milliseconds
      foodItems: meal.foodItems
    };

    console.log('Creating new meal with data:', treatment);
    const result = await this.fetchWithAuth('/api/v1/treatments', {
      method: 'POST',
      body: JSON.stringify(treatment),
    });

    console.log('Create meal response:', result);

    // Handle array response
    const createdTreatment = Array.isArray(result) ? result[0] : result;
    if (!createdTreatment || !createdTreatment._id) {
      throw new Error('Failed to create meal: Invalid response from server');
    }

    return {
      ...meal,
      id: createdTreatment._id,
      timestamp: meal.timestamp,
      synced: true,
      nightscoutId: createdTreatment._id
    };
  }

  async deleteMeal(id: string): Promise<void> {
    console.log('Deleting meal with ID:', id);
    const response = await this.fetchWithAuth(`/api/v1/treatments/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    console.log('Delete response:', response);
    
    if (!response || !response.ok) {
      throw new Error('Failed to delete meal');
    }
  }

  async syncMeal(meal: Meal): Promise<Meal> {
    return this.fetchWithAuth(`/api/v1/entries/${meal.id}/sync`, {
      method: 'POST',
    });
  }

  async getBloodGlucoseReadings(): Promise<BloodGlucoseReading[]> {
    console.log('Fetching manual blood glucose readings...');
    const timestamp = Date.now();
    const entries = await this.fetchWithAuth(`/api/v1/entries/mbg?count=1000&find[date][$gte]=0&_=${timestamp}`);
    console.log('Raw mbg entries from Nightscout:', JSON.stringify(entries, null, 2));
    
    const mappedEntries = entries.map((entry: any) => {
      console.log('Processing entry:', JSON.stringify(entry, null, 2));
      const mapped = {
        id: entry._id,
        nightscoutId: entry._id,
        date: entry.date,
        mbg: entry.mbg,
        device: entry.device || 'Manual Entry',
        type: 'mbg',
        value: entry.mbg,
        dateString: entry.dateString,
        direction: entry.direction,
        customFields: entry.customFields // Include custom fields in the mapping
      };
      console.log('Mapped entry with custom fields:', JSON.stringify(mapped, null, 2));
      return mapped;
    });

    console.log('All mapped entries:', JSON.stringify(mappedEntries, null, 2));
    
    const sortedEntries = mappedEntries.sort((a: BloodGlucoseReading, b: BloodGlucoseReading) => b.date - a.date);
    console.log('Final sorted entries:', JSON.stringify(sortedEntries, null, 2));
    
    return sortedEntries;
  }

  async createBloodGlucoseEntry(reading: Omit<BloodGlucoseReading, 'id'>): Promise<BloodGlucoseReading> {
    console.log('Creating manual blood glucose entry:', reading);
    
    // Calculate UTC offset in minutes
    const utcOffset = new Date().getTimezoneOffset();
    
    const entry = {
      type: 'mbg',
      dateString: new Date(reading.date).toISOString(),
      date: reading.date,
      mbg: reading.mbg,
      device: 'unknown', // Keep as unknown for Nightscout compatibility
      utcOffset: utcOffset,
      sysTime: new Date(reading.date).toISOString(),
      // Add new fields
      source: 'glucohub',
      device_source: reading.device_source,
      test: reading.test,
      // Add custom fields
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
    const result = await this.fetchWithAuth('/api/v1/entries', {
      method: 'POST',
      body: JSON.stringify([entry]), // API expects an array
    });

    console.log('Create mbg response:', JSON.stringify(result, null, 2));

    // Handle array response
    const createdEntry = Array.isArray(result) ? result[0] : result;
    if (!createdEntry) {
      throw new Error('Failed to create manual blood glucose entry: Invalid response from server');
    }

    // Wait a moment for the entry to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Query for the entry we just created with a cache-busting timestamp
    const timestamp = Date.now();
    const entries = await this.fetchWithAuth(`/api/v1/entries/mbg?count=10&find[date][$gte]=${reading.date - 1000}&find[date][$lte]=${reading.date + 1000}&_=${timestamp}`);
    console.log('Verification query results:', JSON.stringify(entries, null, 2));

    // Find the entry by matching the date and mbg value
    const savedEntry = entries.find((e: any) => {
      const match = Math.abs(e.date - reading.date) < 1000 && e.mbg === reading.mbg;
      console.log('Comparing entry:', {
        entry: e,
        reading,
        match,
        entryDate: new Date(e.date).toISOString(),
        readingDate: new Date(reading.date).toISOString(),
        dateDiff: Math.abs(e.date - reading.date)
      });
      return match;
    });

    if (!savedEntry) {
      console.error('Could not find created entry in verification query');
      console.error('Created entry:', entry);
      console.error('Verification results:', entries);
      // Instead of throwing an error, return the created entry
      return {
        ...reading,
        id: createdEntry._id || 'temp-' + Date.now(),
        nightscoutId: createdEntry._id || 'temp-' + Date.now()
      };
    }

    return {
      ...reading,
      id: savedEntry._id,
      nightscoutId: savedEntry._id
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
    const result = await this.fetchWithAuth('/api/v1/entries', {
      method: 'POST',
      body: JSON.stringify([entry]), // API expects an array
    });

    console.log('Create mbg response:', result);

    // Handle array response
    const createdEntry = Array.isArray(result) ? result[0] : result;
    if (!createdEntry || !createdEntry._id) {
      throw new Error('Failed to create manual blood glucose entry: Invalid response from server');
    }

    return {
      ...reading,
      id: createdEntry._id,
      nightscoutId: createdEntry._id
    };
  }

  async deleteBloodGlucoseEntry(id: string): Promise<void> {
    console.log('Deleting blood glucose entry with ID:', id);
    const response = await this.fetchWithAuth(`/api/v1/entries/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    console.log('Delete response:', response);
    
    if (!response || !response.ok) {
      throw new Error('Failed to delete blood glucose entry');
    }
  }

  async getSensorGlucoseReadings(): Promise<BloodGlucoseReading[]> {
    console.log('Fetching sensor glucose readings...');
    const entries = await this.fetchWithAuth('/api/v1/entries/sgv?count=1000');
    console.log('Raw sgv entries:', entries);
    
    return entries.map((entry: any) => ({
      id: entry._id,
      nightscoutId: entry._id,
      date: entry.date,
      sgv: entry.sgv,
      device: entry.device || 'CGM',
      type: 'sgv',
      value: entry.sgv,
      dateString: entry.dateString
    }));
  }

  async createSensorGlucoseEntry(reading: Omit<BloodGlucoseReading, 'id'>): Promise<BloodGlucoseReading> {
    console.log('Creating sensor glucose entry:', reading);
    
    // Calculate UTC offset in minutes
    const utcOffset = new Date().getTimezoneOffset();
    
    const entry = {
      type: 'sgv',
      dateString: new Date(reading.date).toISOString(),
      date: reading.date,
      sgv: reading.sgv,
      device: reading.device || 'CGM',
      utcOffset: utcOffset,
      sysTime: new Date(reading.date).toISOString(),
      direction: reading.direction,
      // Add new fields
      source: 'glucohub',
      device_source: reading.device_source,
      test: reading.test,
      // Add custom fields
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
    const result = await this.fetchWithAuth('/api/v1/entries', {
      method: 'POST',
      body: JSON.stringify([entry]), // API expects an array
    });

    console.log('Create sgv response:', JSON.stringify(result, null, 2));

    // Handle array response
    const createdEntry = Array.isArray(result) ? result[0] : result;
    if (!createdEntry) {
      throw new Error('Failed to create sensor glucose entry: Invalid response from server');
    }

    // Wait a moment for the entry to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Query for the entry we just created with a cache-busting timestamp
    const timestamp = Date.now();
    const entries = await this.fetchWithAuth(`/api/v1/entries/sgv?count=10&find[date][$gte]=${reading.date - 1000}&find[date][$lte]=${reading.date + 1000}&_=${timestamp}`);
    console.log('Verification query results:', JSON.stringify(entries, null, 2));

    // Find the entry by matching the date and sgv value
    const savedEntry = entries.find((e: any) => {
      const match = Math.abs(e.date - reading.date) < 1000 && e.sgv === reading.sgv;
      console.log('Comparing entry:', {
        entry: e,
        reading,
        match,
        entryDate: new Date(e.date).toISOString(),
        readingDate: new Date(reading.date).toISOString(),
        dateDiff: Math.abs(e.date - reading.date)
      });
      return match;
    });

    if (!savedEntry) {
      console.error('Could not find created entry in verification query');
      console.error('Created entry:', entry);
      console.error('Verification results:', entries);
      // Instead of throwing an error, return the created entry
      return {
        ...reading,
        id: createdEntry._id || 'temp-' + Date.now(),
        nightscoutId: createdEntry._id || 'temp-' + Date.now()
      };
    }

    return {
      ...reading,
      id: savedEntry._id,
      nightscoutId: savedEntry._id
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
    const result = await this.fetchWithAuth('/api/v1/entries', {
      method: 'POST',
      body: JSON.stringify([entry]), // API expects an array
    });

    console.log('Create sgv response:', result);

    // Handle array response
    const createdEntry = Array.isArray(result) ? result[0] : result;
    if (!createdEntry || !createdEntry._id) {
      throw new Error('Failed to create sensor glucose entry: Invalid response from server');
    }

    return {
      ...reading,
      id: createdEntry._id,
      nightscoutId: createdEntry._id
    };
  }

  async deleteSensorGlucoseEntry(id: string): Promise<void> {
    console.log('Deleting sensor glucose entry with ID:', id);
    const response = await this.fetchWithAuth(`/api/v1/entries/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    console.log('Delete response:', response);
    
    if (!response || !response.ok) {
      throw new Error('Failed to delete sensor glucose entry');
    }
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
    const timestamp = Date.now();
    const entries = await this.fetchWithAuth(
      `/api/v1/entries/mbg?count=1000&find[date][$gte]=${startDate}&find[date][$lte]=${endDate}&_=${timestamp}`
    );
    console.log('Raw mbg entries from Nightscout:', JSON.stringify(entries, null, 2));
    
    const mappedEntries = entries.map((entry: any) => {
      console.log('Processing entry:', JSON.stringify(entry, null, 2));
      const mapped = {
        id: entry._id,
        nightscoutId: entry._id,
        date: entry.date,
        mbg: entry.mbg,
        device: entry.device || 'Manual Entry',
        type: 'mbg',
        value: entry.mbg,
        dateString: entry.dateString,
        direction: entry.direction,
        customFields: entry.customFields
      };
      console.log('Mapped entry with custom fields:', JSON.stringify(mapped, null, 2));
      return mapped;
    });

    console.log('All mapped entries:', JSON.stringify(mappedEntries, null, 2));
    
    const sortedEntries = mappedEntries.sort((a: BloodGlucoseReading, b: BloodGlucoseReading) => b.date - a.date);
    console.log('Final sorted entries:', JSON.stringify(sortedEntries, null, 2));
    
    return sortedEntries;
  }

  async verifyEntryExists(reading: BloodGlucoseReading): Promise<boolean> {
    console.log('Verifying entry exists:', reading);
    const timestamp = Date.now();
    // Query for entries within a 1-second window of the reading's date
    const entries = await this.fetchWithAuth(
      `/api/v1/entries/mbg?count=10&find[date][$gte]=${reading.date - 1000}&find[date][$lte]=${reading.date + 1000}&_=${timestamp}`
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
    const timestamp = Date.now();
    const entries = await this.fetchWithAuth(
      `/api/v1/entries/sgv?count=1000&find[date][$gte]=${startDate}&find[date][$lte]=${endDate}&_=${timestamp}`
    );
    console.log('Raw sgv entries from Nightscout:', JSON.stringify(entries, null, 2));
    
    const mappedEntries = entries.map((entry: any) => ({
      id: entry._id,
      nightscoutId: entry._id,
      date: entry.date,
      sgv: entry.sgv,
      device: entry.device || 'CGM',
      type: 'sgv',
      value: entry.sgv,
      dateString: entry.dateString,
      direction: entry.direction,
      customFields: entry.customFields
    }));

    console.log('All mapped entries:', JSON.stringify(mappedEntries, null, 2));
    
    const sortedEntries = mappedEntries.sort((a: BloodGlucoseReading, b: BloodGlucoseReading) => b.date - a.date);
    console.log('Final sorted entries:', JSON.stringify(sortedEntries, null, 2));
    
    return sortedEntries;
  }

  async getMealEntriesInRange(startDate: number, endDate: number): Promise<Meal[]> {
    console.log('Fetching meals in range...');
    const timestamp = Date.now();
    const treatments = await this.fetchWithAuth(
      `/api/v1/treatments?find[date][$gte]=${startDate}&find[date][$lte]=${endDate}&_=${timestamp}`
    );
    console.log('Raw treatments:', treatments);
    
    // Filter for meal entries and map to Meal objects
    const meals = treatments
      .filter((treatment: any) => treatment.eventType === 'Meal' && treatment.carbs !== undefined)
      .map((treatment: any) => ({
        id: treatment._id,
        name: treatment.notes || 'Meal',
        carbs: treatment.carbs,
        protein: treatment.protein || 0,
        fat: treatment.fat || 0,
        notes: treatment.notes,
        timestamp: treatment.date / 1000, // Convert from milliseconds to seconds
        synced: true,
        foodItems: treatment.foodItems || [],
        nightscoutId: treatment._id
      }));
    
    console.log('Processed meals:', meals);
    return meals;
  }
} 