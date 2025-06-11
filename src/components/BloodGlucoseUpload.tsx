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
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const REQUIRED_CSV_COLUMNS = ['Item Type', 'Date and Time', 'Value'];
  const OPTIONAL_CSV_COLUMNS = ['Device', 'Notes', 'Additional Value'];
  const CSV_EXAMPLE = `Item Type,Date and Time,Value,Device,Notes\nBlood Glucose Reading,2024-06-01 08:15,110,OneTouch,Before breakfast\nBlood Glucose Reading,2024-06-01 12:30,145,OneTouch,After lunch\nBlood Glucose Reading,2024-06-01 18:45,95,OneTouch,Before dinner`;

  const handleFileUpload = async (file: File) => {
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
      const invalidReadings = readings.filter(reading => reading.mbg < 40 || reading.mbg > 400);
      if (invalidReadings.length > 0) {
        throw new Error(`Found ${invalidReadings.length} readings outside valid range (40-400 mg/dL)`);
      }
      setProgress({ current: 0, total: readings.length });
      const batchSize = 10;
      for (let i = 0; i < readings.length; i += batchSize) {
        const batch = readings.slice(i, i + batchSize);
        await Promise.all(
          batch.map(reading => {
            const doc = {
              date: reading.date,
              mbg: reading.mbg,
              device: 'unknown',
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
            return nightscout?.createBloodGlucoseEntry(doc);
          })
        );
        setProgress({ current: Math.min(i + batchSize, readings.length), total: readings.length });
      }
      setSuccess(`Successfully uploaded ${readings.length} blood glucose readings`);
      setShowUploadDialog(false);
    } catch (err) {
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
        <div>
          <button
            type="button"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            onClick={() => setShowUploadDialog(true)}
          >
            Upload CSV
          </button>
        </div>
      </div>
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Upload Blood Glucose CSV</h2>
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Required CSV Format:</h3>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-600 mb-2">Required columns: {REQUIRED_CSV_COLUMNS.join(', ')}</p>
                <p className="text-sm text-gray-600 mb-2">Optional columns: {OPTIONAL_CSV_COLUMNS.join(', ')}</p>
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Example CSV:</p>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">{CSV_EXAMPLE}</pre>
                </div>
              </div>
            </div>
            <div className="mb-4">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(file);
                  }
                }}
                className="w-full px-3 py-2 border rounded"
                disabled={loading}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowUploadDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={loading}
              >
                Cancel
              </button>
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
        </div>
      )}
    </div>
  );
}; 