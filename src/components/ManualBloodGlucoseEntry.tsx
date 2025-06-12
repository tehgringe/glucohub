import React, { useState } from 'react';
import { useNightscout } from '../contexts/NightscoutContext';

interface ManualBloodGlucoseEntryProps {
  onEntryCreated?: () => void;
}

export const ManualBloodGlucoseEntry: React.FC<ManualBloodGlucoseEntryProps> = ({ onEntryCreated }) => {
  const { nightscout } = useNightscout();
  const [value, setValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [deviceSource, setDeviceSource] = useState('OneTouch Verio');
  const [isTest, setIsTest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateBGValue = (value: number): boolean => {
    // Typical blood glucose ranges: 40-400 mg/dL
    return value >= 40 && value <= 400;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nightscout) {
      setError('Nightscout client not initialized');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const bgValue = parseInt(value, 10);
      if (isNaN(bgValue)) {
        throw new Error('Invalid blood glucose value');
      }

      if (!validateBGValue(bgValue)) {
        throw new Error('Blood glucose value must be between 40 and 400 mg/dL');
      }

      console.log('Creating blood glucose entry with value:', bgValue);
      await nightscout.createBloodGlucoseEntry({
        date: new Date(date).getTime(),
        mbg: bgValue,
        device: 'unknown', // Keep as unknown for Nightscout compatibility
        type: 'mbg',
        value: bgValue,
        dateString: new Date(date).toISOString(),
        source: 'glucohub',
        device_source: deviceSource,
        test: isTest
      });

      console.log('Blood glucose entry created successfully');
      setValue('');
      setDate(new Date().toISOString().slice(0, 16));
      setDeviceSource('OneTouch Verio');
      setIsTest(false);
      onEntryCreated?.();
    } catch (err) {
      console.error('Error creating blood glucose entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to create entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="bg-value" className="block text-sm font-medium text-gray-700">
            Blood Glucose Value (mg/dL)
          </label>
          <input
            type="number"
            id="bg-value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Enter value (40-400)"
            required
            min="40"
            max="400"
          />
        </div>

        <div>
          <label htmlFor="date-time" className="block text-sm font-medium text-gray-700">
            Date and Time
          </label>
          <input
            type="datetime-local"
            id="date-time"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          />
        </div>

        <div>
          <label htmlFor="device-source" className="block text-sm font-medium text-gray-700">
            Device Source
          </label>
          <input
            type="text"
            id="device-source"
            value={deviceSource}
            onChange={(e) => setDeviceSource(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="OneTouch Verio"
            required
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="is-test"
            checked={isTest}
            onChange={(e) => setIsTest(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="is-test" className="ml-2 block text-sm text-gray-900">
            This is a test reading
          </label>
        </div>

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Entry'}
        </button>
      </form>
    </div>
  );
}; 