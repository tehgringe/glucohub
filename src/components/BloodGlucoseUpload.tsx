import React, { useState } from 'react';
import { useNightscout } from '../contexts/NightscoutContext';
import { parseBloodGlucoseCSV, ParsedBloodGlucose } from '../utils/csvParser';

export const BloodGlucoseUpload: React.FC = () => {
  const { nightscout } = useNightscout();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [deviceSource, setDeviceSource] = useState('OneTouch Verio');
  const [isTest, setIsTest] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setProgress(null);

    try {
      const text = await file.text();
      const readings = parseBloodGlucoseCSV(text);
      
      if (readings.length === 0) {
        throw new Error('No valid blood glucose readings found in the file');
      }

      // Validate readings
      const invalidReadings = readings.filter(reading => reading.mbg < 40 || reading.mbg > 400);
      if (invalidReadings.length > 0) {
        throw new Error(`Found ${invalidReadings.length} readings outside valid range (40-400 mg/dL)`);
      }

      setProgress({ current: 0, total: readings.length });

      // Upload readings in batches to avoid overwhelming the server
      const batchSize = 10;
      for (let i = 0; i < readings.length; i += batchSize) {
        const batch = readings.slice(i, i + batchSize);
        await Promise.all(
          batch.map(reading => {
            const doc = {
              date: reading.date,
              mbg: reading.mbg,
              device: 'unknown', // Match existing entries
              type: 'mbg' as 'mbg',
              value: reading.mbg,
              dateString: reading.dateString,
              source: 'glucohub',
              device_source: deviceSource,
              test: isTest,
              customFields: {
                source: 'glucohub',
                version: '1.0.0',
                metadata: {
                  createdBy: 'manual-entry',
                  timestamp: Date.now(),
                  deviceSource: deviceSource,
                  isTest: isTest
                }
              },
              notes: reading.notes
            };
            console.log('Uploading document:', doc);
            return nightscout?.createBloodGlucoseEntry(doc);
          })
        );
        setProgress({ current: Math.min(i + batchSize, readings.length), total: readings.length });
      }

      setSuccess(`Successfully uploaded ${readings.length} blood glucose readings`);
    } catch (err) {
      console.error('Error uploading blood glucose readings:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload blood glucose readings');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Upload Blood Glucose Readings</h2>
      
      <div className="space-y-4">
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
            These are test readings
          </label>
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex-1">
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                  >
                    <span>Upload a CSV file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      accept=".csv"
                      className="sr-only"
                      onChange={handleFileUpload}
                      disabled={loading}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">CSV files only</p>
                <p className="text-xs text-gray-500">Values must be between 40-400 mg/dL</p>
              </div>
            </div>
          </label>
        </div>
      </div>

      {loading && (
        <div className="mt-4">
          {progress ? (
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                Uploading {progress.current} of {progress.total} readings...
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">Processing file...</div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 rounded-md">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {success && (
        <div className="mt-4 p-4 bg-green-50 rounded-md">
          <div className="text-sm text-green-700">{success}</div>
        </div>
      )}
    </div>
  );
}; 