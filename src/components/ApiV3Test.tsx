import React, { useState, useEffect, useRef } from 'react';
import { useNightscout } from '../contexts/NightscoutContext';
import { testNightscoutApiV3Status } from '../lib/nightscout';

interface ApiResponse {
  status: number;
  result: any;
  message?: string;
}

interface QueryParams {
  limit: number;
  skip: number;
  fields: string;
  sort?: string;
  sortDesc?: string;
  filters: { [key: string]: string };
}

const COLLECTIONS = [
  'devicestatus',
  'entries',
  'food',
  'profile',
  'settings',
  'treatments'
] as const;

type Collection = typeof COLLECTIONS[number];

const ApiV3Test: React.FC = () => {
  const { nightscout, config } = useNightscout();
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [statusResponse, setStatusResponse] = useState<ApiResponse | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Collection>('treatments');
  const [documentId, setDocumentId] = useState<string>('');
  const [documentResponse, setDocumentResponse] = useState<ApiResponse | null>(null);
  const [collectionResponse, setCollectionResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const isRefreshing = useRef(false);
  const [filterText, setFilterText] = useState<string>('');

  // Query parameters state
  const [queryParams, setQueryParams] = useState<QueryParams>({
    limit: 10,
    skip: 0,
    fields: '_all',
    filters: {}
  });

  // Update filters when filter text changes
  useEffect(() => {
    const lines = filterText.split('\n');
    const filters = lines.reduce((acc, line) => {
      const [key, value] = line.split('=');
      if (key && value) {
        acc[key.trim()] = value.trim();
      }
      return acc;
    }, {} as { [key: string]: string });
    setQueryParams(prev => ({ ...prev, filters }));
  }, [filterText]);

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
  }, []); // Empty dependency array means this runs once on mount

  const testApiV3Status = async () => {
    if (!nightscout) {
      setError('Nightscout client not initialized');
      return;
    }

    setLoading(true);
    setError(null);
    setStatusResponse(null);

    try {
      // Use config for baseUrl and accessToken
      if (!config) throw new Error('Nightscout config not initialized');
      const baseUrl = config.baseUrl;
      const accessToken = config.accessToken;
      const status = await testNightscoutApiV3Status(baseUrl, accessToken);
      setStatusResponse(status);
    } catch (err) {
      console.error('Error fetching status:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const buildQueryString = (params: QueryParams): string => {
    const queryParts: string[] = [];
    
    // Add basic parameters
    queryParts.push(`limit=${params.limit}`);
    queryParts.push(`skip=${params.skip}`);
    queryParts.push(`fields=${params.fields}`);
    
    // Add sorting
    if (params.sort) {
      queryParts.push(`sort=${params.sort}`);
    } else if (params.sortDesc) {
      queryParts.push(`sort$desc=${params.sortDesc}`);
    }
    
    // Add filters
    Object.entries(params.filters).forEach(([key, value]) => {
      if (value) {
        queryParts.push(`${key}=${encodeURIComponent(value)}`);
      }
    });
    
    return queryParts.join('&');
  };

  const testGetCollectionDocument = async () => {
    if (!nightscout) {
      setError('Nightscout client not initialized');
      return;
    }

    setLoading(true);
    setError(null);
    setCollectionResponse(null);

    try {
      // Ensure we have a valid token
      const token = jwtToken || await refreshJwtToken();
      if (!token) {
        throw new Error('Failed to get JWT token');
      }

      // Construct the API request URL with query parameters
      const baseUrl = nightscout.getBaseUrl();
      const queryString = buildQueryString(queryParams);
      const url = `${baseUrl}/api/v3/${selectedCollection}?${queryString}`;
      console.log('Making API v3 request to:', url);
      console.log('Using JWT token:', token);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      setCollectionResponse(data);
    } catch (err) {
      console.error('Error fetching collection document:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const testGetDocument = async () => {
    if (!nightscout) {
      setError('Nightscout client not initialized');
      return;
    }

    setLoading(true);
    setError(null);
    setDocumentResponse(null);

    try {
      // Ensure we have a valid token
      const token = jwtToken || await refreshJwtToken();
      if (!token) {
        throw new Error('Failed to get JWT token');
      }

      // Construct the API request URL
      const baseUrl = nightscout.getBaseUrl();
      const url = `${baseUrl}/api/v3/${selectedCollection}/${documentId}?fields=_all`;
      console.log('Making API v3 request to:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('API v3 document response:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch document');
      }

      setDocumentResponse(data);
    } catch (err) {
      console.error('Error fetching document:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const analyzeDataGaps = (entries: any[]) => {
    if (!entries || entries.length < 2) return null;

    // Sort entries by date
    const sortedEntries = [...entries].sort((a, b) => a.date - b.date);
    
    const gaps = [];
    for (let i = 1; i < sortedEntries.length; i++) {
      const prevEntry = sortedEntries[i - 1];
      const currentEntry = sortedEntries[i];
      const timeDiff = currentEntry.date - prevEntry.date;
      
      // If gap is more than 1 hour (3600000 ms)
      if (timeDiff > 3600000) {
        gaps.push({
          start: new Date(prevEntry.date).toISOString(),
          end: new Date(currentEntry.date).toISOString(),
          duration: Math.round(timeDiff / (1000 * 60 * 60)) + ' hours',
          entries: {
            before: prevEntry,
            after: currentEntry
          }
        });
      }
    }
    
    return gaps;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">API v3 Status Test</h2>
        <button
          onClick={testApiV3Status}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test API v3 status'}
        </button>
        {error && <p className="text-red-500 mt-2">{error}</p>}
        {statusResponse && (
          <div className="mt-4">
            <h3 className="font-medium">Response:</h3>
            <pre className="bg-gray-100 p-4 rounded mt-2 overflow-auto">
              {JSON.stringify(statusResponse, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">API v3 Collection Document Test</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Collection</label>
            <select
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value as Collection)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              {COLLECTIONS.map(collection => (
                <option key={collection} value={collection}>
                  {collection}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Limit</label>
              <input
                type="number"
                value={queryParams.limit}
                onChange={(e) => setQueryParams(prev => ({ ...prev, limit: parseInt(e.target.value) || 10 }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                min="1"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Skip</label>
              <input
                type="number"
                value={queryParams.skip}
                onChange={(e) => setQueryParams(prev => ({ ...prev, skip: parseInt(e.target.value) || 0 }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Sort Field</label>
              <input
                type="text"
                value={queryParams.sort || ''}
                onChange={(e) => setQueryParams(prev => ({ 
                  ...prev, 
                  sort: e.target.value,
                  sortDesc: '' // Clear sortDesc when sort is set
                }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., date"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Sort Descending</label>
              <input
                type="text"
                value={queryParams.sortDesc || ''}
                onChange={(e) => setQueryParams(prev => ({ 
                  ...prev, 
                  sortDesc: e.target.value,
                  sort: '' // Clear sort when sortDesc is set
                }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., date"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filters (one per line, format: field$operator=value)
            </label>
            <div className="mb-2 text-sm text-gray-600">
              <p>Example filters for entries:</p>
              <ul className="list-disc list-inside">
                <li>type$eq=mbg (manual blood glucose entries)</li>
                <li>type$eq=sgv (sensor glucose values)</li>
                <li>date$gt=1748709420000 (entries after specific timestamp)</li>
                <li>mbg$gt=100 (manual readings above 100)</li>
                <li>sgv$gt=100 (sensor readings above 100)</li>
              </ul>
              <p className="mt-2">Common operators: $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin, $re</p>
            </div>
            <textarea
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="type$eq=mbg&#10;date$gt=1748709420000"
              className="w-full p-2 border rounded h-24"
            />
          </div>

          <div className="flex space-x-4">
            <button
              onClick={testGetCollectionDocument}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Fetch Collection Documents'}
            </button>
            <button
              onClick={() => {
                setFilterText('');
                setQueryParams({
                  limit: 10,
                  skip: 0,
                  fields: '_all',
                  filters: {}
                });
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Reset Filters
            </button>
          </div>

          {error && (
            <div className="text-red-500 mt-2">
              Error: {error}
            </div>
          )}

          {collectionResponse && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Response:</h3>
              <div className="mb-2 text-sm text-gray-600">
                <p>Found {collectionResponse.result?.length || 0} documents</p>
                {selectedCollection === 'entries' && collectionResponse.result?.length > 0 && (
                  <div className="mt-2">
                    <h4 className="font-medium">Data Gap Analysis:</h4>
                    {(() => {
                      const gaps = analyzeDataGaps(collectionResponse.result);
                      if (!gaps || gaps.length === 0) {
                        return <p>No significant gaps found in the data.</p>;
                      }
                      return (
                        <div className="mt-2 space-y-4">
                          {gaps.map((gap, index) => (
                            <div key={index} className="bg-yellow-50 p-4 rounded border border-yellow-200">
                              <p className="font-medium">Gap {index + 1}:</p>
                              <p>Start: {gap.start}</p>
                              <p>End: {gap.end}</p>
                              <p>Duration: {gap.duration}</p>
                              <div className="mt-2">
                                <p className="font-medium">Surrounding Entries:</p>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium">Before Gap:</p>
                                    <pre className="text-xs bg-white p-2 rounded">
                                      {JSON.stringify(gap.entries.before, null, 2)}
                                    </pre>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">After Gap:</p>
                                    <pre className="text-xs bg-white p-2 rounded">
                                      {JSON.stringify(gap.entries.after, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
              <pre className="bg-gray-100 p-4 rounded overflow-auto">
                {JSON.stringify(collectionResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">API v3 Document Test</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Collection</label>
            <select
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value as Collection)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              {COLLECTIONS.map(collection => (
                <option key={collection} value={collection}>
                  {collection}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Document ID</label>
            <input
              type="text"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter document ID"
            />
          </div>
          <button
            onClick={testGetDocument}
            disabled={loading || !documentId}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Get Document'}
          </button>
          {error && <p className="text-red-500">{error}</p>}
          {documentResponse && (
            <div>
              <h3 className="font-medium">Response:</h3>
              <pre className="bg-gray-100 p-4 rounded mt-2 overflow-auto">
                {JSON.stringify(documentResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiV3Test; 