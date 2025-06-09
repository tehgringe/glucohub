import React, { useState, useEffect } from 'react';
import { useNightscout } from '../contexts/NightscoutContext';
import { FoodEntry } from '../types/nightscout';
import Papa from 'papaparse';

interface CSVFoodEntry {
  name: string;
  carbs: number;
  protein: number;
  fat: number;
  notes?: string;
}

export const MealPlans: React.FC = () => {
  const { nightscout } = useNightscout();
  const [foods, setFoods] = useState<FoodEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingFood, setEditingFood] = useState<FoodEntry | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  useEffect(() => {
    if (nightscout) {
      loadFoods();
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
      setFoods(entries);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load foods');
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
      
      // Create food entries in Nightscout
      await Promise.all(
        foods.map(food => nightscout.createFoodEntry(food))
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
    <div key="meal-plans-container" className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Meal Plans</h1>
        <div className="space-x-4">
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

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search foods..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border rounded"
        />
      </div>

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

      {showUploadDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Upload CSV</h2>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleCSVUpload(file);
                }
              }}
              className="mb-4"
            />
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
  );
}; 