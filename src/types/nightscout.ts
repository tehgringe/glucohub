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
  foodItems: FoodEntry[];
  synced: boolean;
  nightscoutId?: string;
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
} 