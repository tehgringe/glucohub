import React, { useState, useEffect } from 'react';
import { useNightscout } from '../contexts/NightscoutContext';
import { FoodEntry, Meal } from '../types/nightscout';
import Papa from 'papaparse';
import { parseFoodCSV } from '../utils/csvParser';
import { MealForm } from './MealForm';
import { ResponsiveMainContent } from './ResponsiveMainContent';

interface CSVFoodEntry {
  name: string;
  carbs: number;
  protein: number;
  fat: number;
  notes?: string;
}

const REQUIRED_CSV_COLUMNS = ['name', 'carbs', 'protein', 'fat'];
const OPTIONAL_CSV_COLUMNS = ['notes', 'category', 'subcategory', 'gi', 'energy'];

const CSV_EXAMPLE = `name,carbs,protein,fat,notes,category,subcategory,gi,energy
W1D1 | Breakfast,45,20,15,Category: Meal, Subcategory: Breakfast, GI: 2, Energy: 1895kJ
W1D1 | Lunch,60,30,25,Category: Meal, Subcategory: Lunch, GI: 3, Energy: 2500kJ
W1D1 | Dinner,55,35,20,Category: Meal, Subcategory: Dinner, GI: 2, Energy: 2200kJ`;

const validateCSVHeaders = (headers: string[]): { valid: boolean; missing: string[] } => {
  const missing = REQUIRED_CSV_COLUMNS.filter(col => !headers.includes(col));
  return {
    valid: missing.length === 0,
    missing
  };
};

export const MealPlans: React.FC = () => {
  const { nightscout } = useNightscout();
  const [foods, setFoods] = useState<FoodEntry[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingFood, setEditingFood] = useState<FoodEntry | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'foods' | 'meals'>('foods');
  const [showAddMealDialog, setShowAddMealDialog] = useState(false);
  const exampleMeal = {
    name: 'Example Meal',
    carbs: 50,
    protein: 20,
    fat: 15,
    notes: 'Chicken, rice, and veggies',
    timestamp: Math.floor(Date.now() / 1000),
    synced: false,
    foodItems: []
  };
  const exampleFood = {
    name: 'Example Meal Plan Entry',
    carbs: 50,
    protein: 20,
    fat: 15,
    notes: 'Chicken, rice, and veggies'
  };

  useEffect(() => {
    if (nightscout) {
      loadFoods();
      loadMeals();
    }
  }, [nightscout]);

  const loadFoods = async () => {
    if (!nightscout) {
      setError('Nightscout client not initialized');
      return;
    }

    try {
      setLoading(true);
      const entries = await nightscout.getFoodEntries();
      console.log('Loaded food entries:', entries);
      setFoods(entries);
    } catch (error) {
      console.error('Error loading foods:', error);
      setError(error instanceof Error ? error.message : 'Failed to load foods');
    } finally {
      setLoading(false);
    }
  };

  const loadMeals = async () => {
    if (!nightscout) {
      setError('Nightscout client not initialized');
      return;
    }

    try {
      setLoading(true);
      const entries = await nightscout.getMealEntries();
      console.log('Loaded meal entries:', entries);
      setMeals(entries);
    } catch (error) {
      console.error('Error loading meals:', error);
      setError(error instanceof Error ? error.message : 'Failed to load meals');
    } finally {
      setLoading(false);
    }
  };

  const handleCSVUpload = async (file: File) => {
    if (!nightscout) {
      setError('Nightscout client not initialized');
      return;
    }

    try {
      setLoading(true);
      
      // Read the file content
      const text = await file.text();
      
      // Parse headers first to validate
      const { data, meta } = Papa.parse<string[]>(text, {
        header: false,
        skipEmptyLines: true,
        preview: 1 // Only read the first row to get headers
      });

      // Get headers from first row
      const headers = data[0] || [];
      
      // Validate headers
      const validation = validateCSVHeaders(headers);
      if (!validation.valid) {
        throw new Error(`CSV is missing required columns: ${validation.missing.join(', ')}`);
      }
      
      // Parse the full CSV content
      const foodEntries = parseFoodCSV(text);
      
      if (foodEntries.length === 0) {
        throw new Error('No valid food entries found in CSV');
      }
      
      // Create food entries in Nightscout
      await Promise.all(
        foodEntries.map(food => nightscout.createFoodEntry({
          name: food.name,
          carbs: food.carbs,
          protein: food.protein,
          fat: food.fat,
          notes: food.notes
        }))
      );
      
      await loadFoods();
      setShowUploadDialog(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to upload CSV');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFood = async (food: Omit<FoodEntry, 'id'>) => {
    if (!nightscout) {
      setError('Nightscout client not initialized');
      return;
    }

    try {
      setLoading(true);
      await nightscout.createFoodEntry(food);
      await loadFoods();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create food entry');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFood = async (food: FoodEntry) => {
    if (!nightscout) {
      setError('Nightscout client not initialized');
      return;
    }

    try {
      setLoading(true);
      const { id, ...foodData } = food;
      await nightscout.updateFoodEntry(id, foodData);
      await loadFoods();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update food entry');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFood = async (id: string) => {
    if (!nightscout) {
      setError('Nightscout client not initialized');
      return;
    }

    try {
      setLoading(true);
      await nightscout.deleteFoodEntry(id);
      await loadFoods();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete food entry');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFoodEntry = async (food: Omit<FoodEntry, 'id'>) => {
    if (!nightscout) {
      setError('Nightscout client not initialized');
      return;
    }
    try {
      setLoading(true);
      const foodWithDate = { ...food, date: Date.now(), app: 'glucohub' };
      console.log('[DEBUG] Posting food entry to Nightscout:', foodWithDate);
      try {
        await nightscout.createFoodEntry(foodWithDate);
        console.log('[DEBUG] Food entry successfully posted');
      } catch (apiError) {
        console.error('[DEBUG] API error response:', apiError);
        throw apiError;
      }
      await loadFoods();
      setShowAddMealDialog(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add meal plan entry');
    } finally {
      setLoading(false);
    }
  };

  const filteredFoods = foods.filter(food =>
    food.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMeals = meals.filter(meal =>
    meal.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
  }

  return (
    <>
      <ResponsiveMainContent>
        <div key="meal-plans-container" className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Meal Plans</h1>
            <div className="space-x-4">
              <button
                onClick={() => setShowAddMealDialog(true)}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Add Meal Plan Entry
              </button>
              <button
                onClick={() => setShowUploadDialog(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Upload CSV
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('foods')}
                  className={`${
                    activeTab === 'foods'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Food Entries
                </button>
                <button
                  onClick={() => setActiveTab('meals')}
                  className={`${
                    activeTab === 'meals'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Meal Entries
                </button>
              </nav>
            </div>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder={`Search ${activeTab === 'foods' ? 'foods' : 'meals'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded"
            />
          </div>

          {activeTab === 'foods' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFoods.map((food) => (
                <div key={food.id} className="border rounded p-4">
                  <h3 className="font-semibold">{food.name}</h3>
                  <p className="text-sm text-gray-600">
                    Carbs: {food.carbs}g | Protein: {food.protein}g | Fat: {food.fat}g
                  </p>
                  {food.notes && (
                    <p className="text-sm text-gray-500 mt-2">{food.notes}</p>
                  )}
                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => setEditingFood(food)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteFood(food.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMeals.map((meal) => (
                <div key={meal.id} className="border rounded p-4">
                  <h3 className="font-semibold">{meal.name}</h3>
                  <p className="text-sm text-gray-600">
                    Carbs: {meal.carbs}g | Protein: {meal.protein}g | Fat: {meal.fat}g
                  </p>
                  {meal.notes && meal.notes !== meal.name && (
                    <p className="text-sm text-gray-500 mt-2">{meal.notes}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    {new Date(meal.timestamp * 1000).toLocaleString()}
                  </p>
                  {meal.foodItems && meal.foodItems.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Food Items:</p>
                      <ul className="text-sm text-gray-600 list-disc list-inside">
                        {meal.foodItems.map((food, index) => (
                          <li key={index}>{typeof food === 'string' ? food : food.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {showUploadDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4">
                <h2 className="text-xl font-bold mb-4">Upload Meal Plans CSV</h2>
                
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Required CSV Format:</h3>
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <p className="text-sm text-gray-600 mb-2">Required columns: {REQUIRED_CSV_COLUMNS.join(', ')}</p>
                    <p className="text-sm text-gray-600 mb-2">Optional columns: {OPTIONAL_CSV_COLUMNS.join(', ')}</p>
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Example CSV:</p>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {CSV_EXAMPLE}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleCSVUpload(file);
                      }
                    }}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setShowUploadDialog(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </ResponsiveMainContent>
      {showAddMealDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Add Meal Plan Entry</h2>
            <MealForm
              onSubmit={handleAddFoodEntry}
              foods={foods}
              onFoodSelect={() => {}}
              initialData={exampleFood}
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowAddMealDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}; 