export interface Meal {
  id?: string;
  name: string;
  carbs: number;
  protein: number;
  fat: number;
  notes?: string;
  timestamp: number;
  foodItems: string[];
  synced?: boolean;
  nightscoutId?: string;
}

export interface MealFormData {
  foodItems: string;
  carbs: number;
  protein: number;
  fat: number;
  notes?: string;
} 