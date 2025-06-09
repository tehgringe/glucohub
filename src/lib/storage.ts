import { Meal } from '../types/meal';

export function saveMeal(meal: Meal): void {
  const meals = getMeals();
  meals.push(meal);
  localStorage.setItem('meals', JSON.stringify(meals));
}

export function getMeals(): Meal[] {
  const mealsJson = localStorage.getItem('meals');
  return mealsJson ? JSON.parse(mealsJson) : [];
}

export function updateMealSyncStatus(mealId: string, synced: boolean, nightscoutId?: string): void {
  const meals = getMeals();
  const updatedMeals = meals.map(meal => 
    meal.id === mealId 
      ? { ...meal, synced, nightscoutId: nightscoutId || meal.nightscoutId }
      : meal
  );
  localStorage.setItem('meals', JSON.stringify(updatedMeals));
}

export const clearMeals = (): void => {
  localStorage.removeItem('meals');
}; 