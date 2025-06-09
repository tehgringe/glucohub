import React, { useState } from 'react';
import { Meal, FoodEntry } from '../types/nightscout';

interface MealFormProps {
  onSubmit: (meal: Omit<Meal, 'id'>) => void;
  foods: FoodEntry[];
  onFoodSelect: (food: FoodEntry) => void;
}

export const MealForm: React.FC<MealFormProps> = ({ onSubmit, foods, onFoodSelect }) => {
  const [formData, setFormData] = useState<Omit<Meal, 'id'>>({
    name: '',
    carbs: 0,
    protein: 0,
    fat: 0,
    notes: '',
    timestamp: Math.floor(Date.now() / 1000),
    synced: false,
    foodItems: []
  });
  const [datetime, setDatetime] = useState(() => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dt = new Date(datetime);
    const timestamp = Math.floor(dt.getTime() / 1000);
    onSubmit({ ...formData, timestamp });
    setFormData({
      name: '',
      carbs: 0,
      protein: 0,
      fat: 0,
      notes: '',
      timestamp: Math.floor(Date.now() / 1000),
      synced: false,
      foodItems: []
    });
    setDatetime(() => {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    });
  };

  return (
    <div key="meal-form-container">
      <form key="meal-form" onSubmit={handleSubmit} className="space-y-4">
        <div key="name-field">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Meal Name
          </label>
          <input
            key="name-input"
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <div key="nutrition-fields" className="grid grid-cols-3 gap-4">
          <div key="carbs-field">
            <label htmlFor="carbs" className="block text-sm font-medium text-gray-700">
              Carbs (g)
            </label>
            <input
              key="carbs-input"
              type="number"
              id="carbs"
              value={formData.carbs}
              onChange={(e) => setFormData({ ...formData, carbs: Number(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div key="protein-field">
            <label htmlFor="protein" className="block text-sm font-medium text-gray-700">
              Protein (g)
            </label>
            <input
              key="protein-input"
              type="number"
              id="protein"
              value={formData.protein}
              onChange={(e) => setFormData({ ...formData, protein: Number(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div key="fat-field">
            <label htmlFor="fat" className="block text-sm font-medium text-gray-700">
              Fat (g)
            </label>
            <input
              key="fat-input"
              type="number"
              id="fat"
              value={formData.fat}
              onChange={(e) => setFormData({ ...formData, fat: Number(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div key="notes-field">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            key="notes-input"
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            rows={3}
          />
        </div>

        <div key="datetime-field">
          <label htmlFor="datetime" className="block text-sm font-medium text-gray-700">
            Meal Date & Time
          </label>
          <input
            type="datetime-local"
            id="datetime"
            value={datetime}
            onChange={e => setDatetime(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <div key="food-items-section">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Food Items
          </label>
          <div key="food-items-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {foods.map((food) => (
              <div
                key={food.id}
                className="border rounded p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => onFoodSelect(food)}
              >
                <h4 key={`name-${food.id}`} className="font-medium">{food.name}</h4>
                <p key={`nutrition-${food.id}`} className="text-sm text-gray-600">
                  Carbs: {food.carbs}g | Protein: {food.protein}g | Fat: {food.fat}g
                </p>
                {food.notes && (
                  <p key={`notes-${food.id}`} className="text-sm text-gray-500 mt-2">{food.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          key="submit-button"
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Save Meal
        </button>
      </form>
    </div>
  );
}; 