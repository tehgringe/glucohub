import React, { useState } from 'react';
import { BloodGlucoseReading } from '../types/nightscout';

interface BloodGlucoseEditFormProps {
  reading: BloodGlucoseReading;
  onSubmit: (reading: BloodGlucoseReading) => Promise<void>;
  onCancel: () => void;
}

export const BloodGlucoseEditForm: React.FC<BloodGlucoseEditFormProps> = ({ reading, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<BloodGlucoseReading>(reading);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="mbg" className="block text-sm font-medium text-gray-700">
          Blood Glucose (mg/dL)
        </label>
        <input
          type="number"
          id="mbg"
          value={formData.mbg}
          onChange={(e) => setFormData({ ...formData, mbg: Number(e.target.value), value: Number(e.target.value) })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700">
          Date and Time
        </label>
        <input
          type="datetime-local"
          id="date"
          value={new Date(formData.date).toISOString().slice(0, 16)}
          onChange={(e) => setFormData({ ...formData, date: new Date(e.target.value).getTime() })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label htmlFor="device" className="block text-sm font-medium text-gray-700">
          Device
        </label>
        <input
          type="text"
          id="device"
          value={formData.device}
          onChange={(e) => setFormData({ ...formData, device: e.target.value })}
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