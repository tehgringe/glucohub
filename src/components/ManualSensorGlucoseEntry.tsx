import React, { useState } from 'react';
import { useNightscout } from '../contexts/NightscoutContext';

interface ManualSensorGlucoseEntryProps {
  onEntryCreated?: () => void;
}

export const ManualSensorGlucoseEntry: React.FC<ManualSensorGlucoseEntryProps> = ({ onEntryCreated }) => {
  const { nightscout } = useNightscout();
  const [value, setValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [deviceSource, setDeviceSource] = useState('xDrip-DexcomG5');
  const [direction, setDirection] = useState('Flat');
  const [isTest, setIsTest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateSGVValue = (value: number): boolean => {
    // Typical sensor glucose ranges: 40-400 mg/dL
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
      const sgvValue = parseInt(value, 10);
      if (isNaN(sgvValue)) {
        throw new Error('Invalid sensor glucose value');
      }

      if (!validateSGVValue(sgvValue)) {
        throw new Error('Sensor glucose value must be between 40 and 400 mg/dL');
      }

      console.log('Creating sensor glucose entry with value:', sgvValue);
      await nightscout.createSensorGlucoseEntry({
        date: new Date(date).getTime(),
        sgv: sgvValue,
        device: deviceSource,
        type: 'sgv',
        value: sgvValue,
        dateString: new Date(date).toISOString(),
        direction: direction,
        source: 'glucohub',
        device_source: deviceSource,
        test: isTest
      });

      console.log('Sensor glucose entry created successfully');
      setValue('');
      setDate(new Date().toISOString().slice(0, 16));
      setDeviceSource('xDrip-DexcomG5');
      setDirection('Flat');
      setIsTest(false);
      onEntryCreated?.();
    } catch (err) {
      console.error('Error creating sensor glucose entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to create entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Manual Sensor Glucose Entry</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="sgv-value" className="block text-sm font-medium text-gray-700">
            Sensor Glucose Value (mg/dL)
          </label>
          <input
            type="number"
            id="sgv-value"
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
            placeholder="xDrip-DexcomG5"
            required
          />
        </div>

        <div>
          <label htmlFor="direction" className="block text-sm font-medium text-gray-700">
            Direction
          </label>
          <select
            id="direction"
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          >
            <option value="Flat">Flat</option>
            <option value="DoubleUp">Double Up</option>
            <option value="SingleUp">Single Up</option>
            <option value="FortyFiveUp">Forty Five Up</option>
            <option value="FortyFiveDown">Forty Five Down</option>
            <option value="SingleDown">Single Down</option>
            <option value="DoubleDown">Double Down</option>
          </select>
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