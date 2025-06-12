import React, { useState, useEffect } from 'react';
import { useNightscout } from '../contexts/NightscoutContext';
import { Meal, FoodEntry } from '../types/nightscout';
import { MealForm } from './MealForm';
import { MealEditForm } from './MealEditForm';
import { TimePicker } from './TimePicker';
import { ResponsiveMainContent } from './ResponsiveMainContent';

export const MealLogger: React.FC = () => {
  const { nightscout } = useNightscout();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [foods, setFoods] = useState<FoodEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [selectedFood, setSelectedFood] = useState<FoodEntry | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showMealForm, setShowMealForm] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showFoodEntries, setShowFoodEntries] = useState(false);
  const [loadingFood, setLoadingFood] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [entryMode, setEntryMode] = useState<'manual' | 'food'>('manual');
  const [initialMealData, setInitialMealData] = useState<Omit<Meal, 'id' | 'nightscoutId' | 'synced'> | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (nightscout) {
      loadMeals();
      loadFoods();
    }
  }, [nightscout]);

  const loadMeals = async () => {
    if (!nightscout) {
      setError('Nightscout client not initialized');
      return;
    }

    try {
      setLoading(true);
      console.log('Loading meals from Nightscout...');
      const entries = await nightscout.getMealEntries();
      console.log('Received meals:', entries);
      setMeals(entries);
      setLoading(false);
    } catch (error) {
      console.error('Error loading meals:', error);
      setError(error instanceof Error ? error.message : 'Failed to load meals');
      setLoading(false);
    }
  };

  const loadFoods = async () => {
    if (!nightscout) {
      setError('Nightscout client not initialized');
      return;
    }

    try {
      setLoading(true);
      const entries = await nightscout.getFoodEntries();
      setFoods(entries);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load foods');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncMeal = async (meal: Meal) => {
    if (!nightscout) {
      setSyncError('Nightscout client not initialized');
      return;
    }

    try {
      await nightscout.syncMeal(meal);
      setMeals(prev => prev.map(m => m.id === meal.id ? { ...m, synced: true } : m));
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Failed to sync meal');
    }
  };

  const handleCreateMeal = async (meal: Omit<Meal, 'id'>) => {
    if (!nightscout) {
      setError('Nightscout client not initialized');
      return;
    }

    try {
      const newMeal: Meal = {
        ...meal,
        id: Date.now().toString(),
        timestamp: Math.floor(Date.now() / 1000),
        synced: false,
        foodItems: meal.foodItems || [],
      };
      await nightscout.createMeal(newMeal);
      await loadMeals();
      setSelectedFood(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create meal');
    }
  };

  const handleUpdateMeal = async (meal: Meal) => {
    if (!nightscout) {
      setError('Nightscout client not initialized');
      return;
    }

    try {
      await nightscout.updateMeal(meal);
      await loadMeals();
      setEditingMeal(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update meal');
    }
  };

  const handleDeleteMeal = async (id: string) => {
    if (!nightscout) {
      setError('Nightscout client not initialized');
      return;
    }

    const meal = meals.find(m => m.id === id);
    if (!meal || !meal.nightscoutId) {
      setError('Cannot delete meal: Missing Nightscout ID');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this meal?')) {
      return;
    }

    try {
      setLoading(true);
      console.log('Attempting to delete meal with Nightscout ID:', meal.nightscoutId);
      await nightscout.deleteMeal(meal.nightscoutId);
      console.log('Meal deleted successfully');
      
      // Force a complete refresh of the meals list
      setMeals([]); // Clear the current list
      await loadMeals(); // Reload from Nightscout
      
      // Also update the foods list to ensure everything is in sync
      await loadFoods();
    } catch (error) {
      console.error('Error deleting meal:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete meal');
    } finally {
      setLoading(false);
    }
  };

  const handleExploreFood = async () => {
    if (!nightscout) {
      setSyncError('Nightscout client not initialized');
      return;
    }

    try {
      setLoadingFood(true);
      const entries = await nightscout.getFoodEntries();
      setFoods(entries);
      setShowFoodEntries(true);
    } catch (error) {
      console.error('Error fetching food entries:', error);
      setSyncError(error instanceof Error ? error.message : 'Failed to fetch food entries');
    } finally {
      setLoadingFood(false);
    }
  };

  const handleSelectFood = async (food: FoodEntry) => {
    setSelectedFood(food);
    setShowTimePicker(true);
  };

  const handleFoodSelect = (food: FoodEntry) => {
    setSelectedFood(food);
    setShowTimePicker(true);
  };

  const handleQuickPost = async (food: FoodEntry, timestamp?: number) => {
    if (!food || !nightscout) {
      setSyncError('Nightscout client not initialized');
      return;
    }
    try {
      const newMeal: Omit<Meal, 'id'> = {
        name: food.name,
        carbs: food.carbs,
        protein: food.protein || 0,
        fat: food.fat || 0,
        notes: food.notes || '',
        foodItems: [food.id],
        synced: false,
        timestamp: timestamp || Math.floor(Date.now() / 1000),
      };
      await nightscout.createMeal(newMeal);
      await loadMeals();
      setSelectedFood(null);
      setShowTimePicker(false);
    } catch (error) {
      setSyncError('Failed to create meal. Please try again.');
    }
  };

  const handleBackdate = (food: FoodEntry) => {
    setSelectedFood(food);
    setShowTimePicker(true);
  };

  const handleCancel = () => {
    setSelectedFood(null);
    setShowTimePicker(false);
  };

  const filteredFoods = foods.filter(food =>
    food.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
  }

  return (
    <ResponsiveMainContent>
      <div key="meal-logger-root" className="space-y-6">
        <div key="meal-logger-container" className="bg-white shadow rounded-lg p-6">
          <div key="meal-logger-header" className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Log Meal</h2>
            <button
              key="toggle-food-entries"
              onClick={() => setShowFoodEntries(!showFoodEntries)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {showFoodEntries ? 'Hide Food Entries' : 'Show Food Entries'}
            </button>
          </div>

          {showFoodEntries && (
            <div key="food-entries-section" className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Meal Plans</h3>
                <div className="w-64">
                  <input
                    type="text"
                    placeholder="Search meal plans..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div key="food-entries-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto p-2">
                {filteredFoods.map((food) => (
                  <div
                    key={food.id}
                    className="border rounded p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleFoodSelect(food)}
                  >
                    <h4 className="font-medium">{food.name}</h4>
                    <p className="text-sm text-gray-600">
                      Carbs: {food.carbs}g | Protein: {food.protein}g | Fat: {food.fat}g
                    </p>
                    {food.notes && (
                      <div className="text-sm text-gray-500 mt-2">
                        {food.notes.split(', ').map((note, i) => (
                          <div key={i} className="text-xs">{note}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {showTimePicker && selectedFood && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <TimePicker
                  key={`time-picker-${selectedFood.id}`}
                  food={selectedFood}
                  onConfirm={handleQuickPost}
                  onCancel={handleCancel}
                />
              </div>
            </div>
          )}

          <div key="recent-meals-section" className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Recent Meals</h3>
            {loading ? (
              <div className="text-center py-4">Loading meals...</div>
            ) : (
              <div className="space-y-4">
                {meals.map((meal) => (
                  <div key={meal.id} className="border rounded p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{meal.name}</h4>
                        <p className="text-sm text-gray-600">
                          Carbs: {meal.carbs}g | Protein: {meal.protein}g | Fat: {meal.fat}g
                        </p>
                        {meal.notes && meal.notes !== meal.name && (
                          <p className="text-sm text-gray-500 mt-2">{meal.notes}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            console.log('Edit button clicked for meal:', meal);
                            setEditingMeal(meal);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteMeal(meal.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                        {!meal.synced && (
                          <button
                            onClick={() => handleSyncMeal(meal)}
                            className="text-green-600 hover:text-green-800"
                          >
                            Sync
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {editingMeal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Edit Meal</h3>
              <MealEditForm
                meal={editingMeal}
                onSubmit={handleUpdateMeal}
                onCancel={() => {
                  console.log('Canceling edit for meal:', editingMeal);
                  setEditingMeal(null);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </ResponsiveMainContent>
  );
};