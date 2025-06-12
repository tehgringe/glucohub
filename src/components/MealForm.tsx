import React, { useState } from 'react';
import { Meal, FoodEntry } from '../types/nightscout';

interface MealFormProps {
  onSubmit: (food: Omit<FoodEntry, 'id'>) => void;
  foods: FoodEntry[];
  onFoodSelect: (food: FoodEntry) => void;
  initialData?: Omit<FoodEntry, 'id'>;
}

export const MealForm: React.FC<MealFormProps> = ({ onSubmit, foods, onFoodSelect, initialData }) => {
  const [formData, setFormData] = useState<Omit<FoodEntry, 'id'>>({
    name: initialData?.name || '',
    carbs: initialData?.carbs || 0,
    protein: initialData?.protein || 0,
    fat: initialData?.fat || 0,
    notes: initialData?.notes || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      name: '',
      carbs: 0,
      protein: 0,
      fat: 0,
      notes: ''
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