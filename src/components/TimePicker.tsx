import React from 'react';
import { FoodEntry } from '../types/nightscout';

interface TimePickerProps {
  food: FoodEntry;
  onConfirm: (food: FoodEntry, timestamp: number) => void;
  onCancel: () => void;
}

export const TimePicker: React.FC<TimePickerProps> = ({ food, onConfirm, onCancel }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const dateTime = formData.get('datetime') as string;
    
    // Convert the local datetime to a timestamp
    const localDate = new Date(dateTime);
    const timestamp = localDate.getTime();
    
    console.log('TimePicker - Selected datetime:', {
      input: dateTime,
      localDate: localDate.toString(),
      timestamp,
      localTime: new Date(timestamp).toString()
    });
    
    onConfirm(food, Math.floor(timestamp / 1000));
  };

  // Convert current time to local datetime string for the input
  const getLocalDateTimeString = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-bold mb-4">Select Time</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Date and Time</label>
        <input
          type="datetime-local"
          name="datetime"
          defaultValue={getLocalDateTimeString()}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Select
        </button>
      </div>
    </form>
  );
}; 