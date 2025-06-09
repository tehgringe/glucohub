export interface FoodEntry {
  _id: string;
  name: string;
  carbs: number;
  protein?: number;
  fat?: number;
  notes?: string;
} 