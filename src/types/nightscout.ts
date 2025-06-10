export interface FoodEntry {
  id: string;
  name: string;
  carbs: number;
  protein: number;
  fat: number;
  notes?: string;
}

export interface Meal {
  id: string;
  name: string;
  carbs: number;
  protein: number;
  fat: number;
  notes?: string;
  timestamp: number;
  foodItems: (FoodEntry | string)[];
  synced: boolean;
  nightscoutId?: string;
  created_at?: string;
}

export interface BloodGlucoseReading {
  id?: string;
  nightscoutId?: string;
  date: number;
  mbg?: number;
  sgv?: number;
  device: string;
  type: 'mbg' | 'sgv';
  value: number;
  dateString?: string;
  direction?: string;
  source: string;
  device_source: string;
  test: boolean;
  utcOffset?: number;
  sysTime?: string;
  customFields?: {
    source?: string;
    version?: string;
    metadata?: {
      createdBy?: string;
      timestamp?: number;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

export interface NightscoutConfig {
  baseUrl: string;
  apiSecret: string;
  accessToken: string;
  enabled: boolean;
  timezone?: {
    // The user's timezone (e.g., 'America/New_York')
    name: string;
    // Whether to use the browser's timezone
    useBrowserTimezone: boolean;
    // Manual offset in minutes (only used if useBrowserTimezone is false)
    manualOffset?: number;
  };
} 