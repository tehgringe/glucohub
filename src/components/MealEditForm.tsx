import React, { useState } from 'react';
import { Meal } from '../types/nightscout';

interface MealEditFormProps {
  meal: Meal;
  onSubmit: (meal: Meal) => Promise<void>;
  onCancel: () => void;
}

export const MealEditForm: React.FC<MealEditFormProps> = ({ meal, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<Meal>(meal);
  const [datetime, setDatetime] = useState(() => {
    const date = new Date(formData.timestamp * 1000);
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
    await onSubmit({ ...formData, timestamp });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Meal Name
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="carbs" className="block text-sm font-medium text-gray-700">
            Carbs (g)
          </label>
          <input
            type="number"
            id="carbs"
            value={formData.carbs}
            onChange={(e) => setFormData({ ...formData, carbs: Number(e.target.value) })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label htmlFor="protein" className="block text-sm font-medium text-gray-700">
            Protein (g)
          </label>
          <input
            type="number"
            id="protein"
            value={formData.protein}
            onChange={(e) => setFormData({ ...formData, protein: Number(e.target.value) })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label htmlFor="fat" className="block text-sm font-medium text-gray-700">
            Fat (g)
          </label>
          <input
            type="number"
            id="fat"
            value={formData.fat}
            onChange={(e) => setFormData({ ...formData, fat: Number(e.target.value) })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          id="notes"
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          rows={3}
        />
      </div>

      <div>
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

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
}; 