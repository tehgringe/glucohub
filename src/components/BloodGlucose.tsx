import React, { useState, useEffect, useCallback } from 'react';
import { useNightscout } from '../contexts/NightscoutContext';
import { BloodGlucoseReading } from '../types/nightscout';
import { ManualBloodGlucoseEntry } from './ManualBloodGlucoseEntry';
import { ResponsiveMainContent } from './ResponsiveMainContent';

export const BloodGlucose: React.FC = () => {
  const { nightscout } = useNightscout();
  const [readings, setReadings] = useState<BloodGlucoseReading[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadReadings = useCallback(async () => {
    if (!nightscout) {
      setError('Nightscout client not initialized');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log('Loading blood glucose readings...');
      const data = await nightscout.getBloodGlucoseReadings();
      console.log('Received readings:', data);
      setReadings(data);
    } catch (err) {
      console.error('Error loading readings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load readings');
    } finally {
      setLoading(false);
    }
  }, [nightscout]);

  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  const handleEntryCreated = useCallback(() => {
    console.log('Entry created, refreshing readings...');
    loadReadings();
  }, [loadReadings]);

  if (loading) {
    return <div className="text-center py-4">Loading blood glucose readings...</div>;
  }

  if (error) {
    return <div className="text-red-600 py-4">{error}</div>;
  }

  return (
    <ResponsiveMainContent>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Manual Blood Glucose</h2>
        <ManualBloodGlucoseEntry onEntryCreated={handleEntryCreated} />
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Glucose (mg/dL)
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Device
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {readings.map((reading) => (
                <tr key={reading.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(reading.date).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {reading.mbg}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {reading.device || 'Manual Entry'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ResponsiveMainContent>
  );
}; 