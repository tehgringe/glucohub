import React, { useState, useEffect, useRef } from 'react';
import { useNightscout } from '../contexts/NightscoutContext';

interface ApiResponse {
  status: number;
  result?: any;
  message?: string;
  identifier?: string;
  lastModified?: number;
}

const DataRecovery: React.FC = () => {
  const { nightscout } = useNightscout();
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const isRefreshing = useRef(false);

  // Required fields
  const [device, setDevice] = useState<string>("xDrip-DexcomG5");
  const [date, setDate] = useState<string>('2025-05-30T12:00:00');
  const [sgv, setSgv] = useState<number>(100);
  const [type, setType] = useState<string>("sgv");

  // Optional fields
  const [delta, setDelta] = useState<number>(-10);
  const [direction, setDirection] = useState<string>("Flat");
  const [filtered, setFiltered] = useState<number>(0);
  const [unfiltered, setUnfiltered] = useState<number>(0);
  const [rssi, setRssi] = useState<number>(100);
  const [noise, setNoise] = useState<number>(1);
  const [utcOffset, setUtcOffset] = useState<number>(240);

  // System fields
  const [identifier, setIdentifier] = useState<string>(crypto.randomUUID());
  const [srvModified, setSrvModified] = useState<number>(0);
  const [srvCreated, setSrvCreated] = useState<number>(0);

  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Function to refresh JWT token
  const refreshJwtToken = async () => {
    if (!nightscout) {
      setError('Nightscout client not initialized');
      return null;
    }

    // Prevent multiple simultaneous refresh attempts
    if (isRefreshing.current) {
      console.log('Token refresh already in progress...');
      return null;
    }

    try {
      isRefreshing.current = true;
      console.log('Refreshing JWT token...');
      const token = await nightscout.getJwtToken();
      console.log('Received new JWT token');
      setJwtToken(token);
      setError(null);
      return token;
    } catch (err) {
      console.error('Error refreshing JWT token:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh JWT token');
      return null;
    } finally {
      isRefreshing.current = false;
    }
  };

  // Initial token refresh
  useEffect(() => {
    refreshJwtToken();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nightscout) {
      setError('Nightscout client not initialized');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Ensure we have a valid token
      const token = jwtToken || await refreshJwtToken();
      if (!token) {
        throw new Error('Failed to get JWT token');
      }

      const timestampMs = new Date(date).getTime();
      const payload = {
        // Required fields
        device,
        date: timestampMs,
        dateString: new Date(timestampMs).toISOString(),
        sgv,
        type,
        app: "glucohub",

        // Optional fields
        delta,
        direction,
        filtered,
        unfiltered,
        rssi,
        noise,
        utcOffset,

        // System fields
        identifier,
        srvModified: timestampMs,
        srvCreated: timestampMs
      };

      // Construct the API request URL
      const baseUrl = nightscout.getBaseUrl();
      const url = `${baseUrl}/api/v3/entries`;
      console.log('Making API v3 request to:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log('API v3 response:', data);

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      setResponse(data);
    } catch (err) {
      console.error('Error submitting data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Data Recovery Test</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Required Fields */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Required Fields</h3>
            
            <div>
              <label htmlFor="device" className="block text-sm font-medium text-gray-700">
                Device
              </label>
              <input
                type="text"
                id="device"
                value={device}
                onChange={(e) => setDevice(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                Timestamp
              </label>
              <input
                type="datetime-local"
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="sgv" className="block text-sm font-medium text-gray-700">
                Blood Glucose (mg/dL)
              </label>
              <input
                type="number"
                id="sgv"
                value={sgv}
                onChange={(e) => setSgv(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Type
              </label>
              <input
                type="text"
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Optional Fields */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Optional Fields</h3>
            
            <div>
              <label htmlFor="delta" className="block text-sm font-medium text-gray-700">
                Delta
              </label>
              <input
                type="number"
                id="delta"
                value={delta}
                onChange={(e) => setDelta(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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

            <div>
              <label htmlFor="filtered" className="block text-sm font-medium text-gray-700">
                Filtered Value
              </label>
              <input
                type="number"
                id="filtered"
                value={filtered}
                onChange={(e) => setFiltered(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="unfiltered" className="block text-sm font-medium text-gray-700">
                Unfiltered Value
              </label>
              <input
                type="number"
                id="unfiltered"
                value={unfiltered}
                onChange={(e) => setUnfiltered(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="rssi" className="block text-sm font-medium text-gray-700">
                RSSI
              </label>
              <input
                type="number"
                id="rssi"
                value={rssi}
                onChange={(e) => setRssi(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="noise" className="block text-sm font-medium text-gray-700">
                Noise Level
              </label>
              <select
                id="noise"
                value={noise}
                onChange={(e) => setNoise(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </div>

            <div>
              <label htmlFor="utcOffset" className="block text-sm font-medium text-gray-700">
                UTC Offset (minutes)
              </label>
              <input
                type="number"
                id="utcOffset"
                value={utcOffset}
                onChange={(e) => setUtcOffset(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Test Data'}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-50 rounded-md">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {response && (
        <div className="mt-4 p-4 bg-green-50 rounded-md">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>Entry created successfully!</p>
                <ul className="list-disc list-inside mt-2">
                  <li>Status: {response.status}</li>
                  <li>Identifier: {response.identifier}</li>
                  <li>Last Modified: {response.lastModified ? new Date(response.lastModified).toLocaleString() : 'N/A'}</li>
                </ul>
                <div className="mt-4">
                  <p className="font-medium">Full Response:</p>
                  <pre className="mt-1 bg-white p-2 rounded text-xs overflow-auto">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataRecovery; 