import React, { useState, useEffect, useRef } from 'react';
import { useNightscout } from '../contexts/NightscoutContext';
import { ResponsiveMainContent } from './ResponsiveMainContent';

interface ApiResponse {
  status: number;
  result?: any;
  message?: string;
  identifier?: string;
  lastModified?: number;
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

const DataFix: React.FC = () => {
  const { nightscout } = useNightscout();
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const isRefreshing = useRef(false);

  // Form state
  const [selectedCollection, setSelectedCollection] = useState<Collection>('entries');
  const [documentId, setDocumentId] = useState<string>('');
  const [permanent, setPermanent] = useState<boolean>(false);
  const [operation, setOperation] = useState<'delete' | 'patch'>('delete');
  const [currentDocument, setCurrentDocument] = useState<any>(null);
  const [editedDocument, setEditedDocument] = useState<string>('');
  const [patchResponse, setPatchResponse] = useState<ApiResponse | null>(null);

  // Response states
  const [initialCheck, setInitialCheck] = useState<ApiResponse | null>(null);
  const [deleteResponse, setDeleteResponse] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  // New state for MBG cleanup
  const [mbgDocuments, setMbgDocuments] = useState<any[]>([]);
  const [mbgLoading, setMbgLoading] = useState<boolean>(false);
  const [mbgError, setMbgError] = useState<string | null>(null);
  const [mbgDeleteResponse, setMbgDeleteResponse] = useState<ApiResponse | null>(null);
  // New state for SGV cleanup
  const [sgvDocuments, setSgvDocuments] = useState<any[]>([]);
  const [sgvLoading, setSgvLoading] = useState<boolean>(false);
  const [sgvError, setSgvError] = useState<string | null>(null);
  const [sgvDeleteResponse, setSgvDeleteResponse] = useState<ApiResponse | null>(null);

  // Function to refresh JWT token
  const refreshJwtToken = async () => {
    if (!nightscout) {
      setError('Nightscout client not initialized');
      return null;
    }

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

  const checkDocument = async (id: string): Promise<ApiResponse | null> => {
    if (!nightscout) {
      setError('Nightscout client not initialized');
      return null;
    }

    try {
      const token = jwtToken || await refreshJwtToken();
      if (!token) {
        throw new Error('Failed to get JWT token');
      }

      const baseUrl = nightscout.getBaseUrl();
      const url = `${baseUrl}/api/v3/${selectedCollection}/${id}`;
      console.log('Checking document at:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('Document check response:', data);

      if (response.status === 404) {
        console.log('Document not found');
        return { status: 404, message: 'Document not found' };
      }

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error('Error checking document:', err);
      throw err;
    }
  };

  const deleteDocument = async () => {
    if (!nightscout) {
      setError('Nightscout client not initialized');
      return;
    }

    if (!documentId) {
      setError('Document ID is required');
      return;
    }

    setLoading(true);
    setError(null);
    setInitialCheck(null);
    setDeleteResponse(null);

    try {
      // Step 1: Check if document exists
      console.log('Step 1: Checking if document exists...');
      const initialCheckResult = await checkDocument(documentId);
      setInitialCheck(initialCheckResult);
      console.log('Initial check result:', initialCheckResult);

      // Step 2: Delete the document
      console.log('Step 2: Deleting document...');
      const token = jwtToken || await refreshJwtToken();
      if (!token) {
        throw new Error('Failed to get JWT token');
      }

      const baseUrl = nightscout.getBaseUrl();
      const url = `${baseUrl}/api/v3/${selectedCollection}/${documentId}${permanent ? '?permanent=true' : ''}`;
      console.log('Deleting document at:', url);

      const deleteResponse = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const deleteData = await deleteResponse.json();
      console.log('Delete response:', deleteData);

      if (!deleteResponse.ok) {
        throw new Error(deleteData.message || `HTTP error! status: ${deleteResponse.status}`);
      }

      setDeleteResponse(deleteData);
    } catch (err) {
      console.error('Error in delete operation:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Function to load document data
  const loadDocument = async () => {
    if (!nightscout || !documentId) {
      setError('Nightscout client not initialized or document ID missing');
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentDocument(null);
    setEditedDocument('');
    setPatchResponse(null);

    try {
      const token = jwtToken || await refreshJwtToken();
      if (!token) {
        throw new Error('Failed to get JWT token');
      }

      const baseUrl = nightscout.getBaseUrl();
      const url = `${baseUrl}/api/v3/${selectedCollection}/${documentId}`;
      console.log('Loading document from:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('Document data:', data);

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      // Extract the actual document from the result field
      const document = data.result;
      setCurrentDocument(document);
      setEditedDocument(JSON.stringify(document, null, 2));
    } catch (err) {
      console.error('Error loading document:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Function to apply PATCH
  const applyPatch = async () => {
    if (!nightscout || !documentId || !editedDocument) {
      setError('Missing required data for update operation');
      return;
    }

    setLoading(true);
    setError(null);
    setPatchResponse(null);

    try {
      // Parse the edited JSON
      const parsedDocument = JSON.parse(editedDocument);
      
      // Extract the actual document data from the result field if it exists
      const documentData = parsedDocument.result || parsedDocument;
      
      // First delete the existing document
      console.log('Deleting existing document:', documentId);
      await nightscout.deleteBloodGlucoseEntry(documentId);

      // Then create a new document with the updated data
      console.log('Creating new document with data:', documentData);
      const result = await nightscout.createBloodGlucoseEntry({
        date: documentData.date,
        mbg: documentData.mbg,
        device: documentData.device || 'Manual Entry',
        type: 'mbg',
        value: documentData.mbg,
        dateString: documentData.dateString,
        direction: documentData.direction,
        customFields: documentData.customFields,
        source: documentData.source || 'manual',
        device_source: documentData.device_source || 'manual',
        test: documentData.test || false,
        utcOffset: documentData.utcOffset || new Date().getTimezoneOffset(),
        sysTime: documentData.sysTime || new Date(documentData.date).toISOString()
      });

      console.log('Update response:', result);
      setPatchResponse({
        status: 200,
        message: 'Document updated successfully',
        result: {
          identifier: result.id,
          srvModified: Date.now(),
          srvCreated: Date.now()
        }
      });
      setCurrentDocument(documentData);
    } catch (err) {
      console.error('Error applying update:', err);
      if (err instanceof SyntaxError) {
        setError('Invalid JSON format. Please check your edits.');
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  // New function to fetch all MBG documents
  const fetchAllMbgDocuments = async () => {
    if (!nightscout) {
      setMbgError('Nightscout client not initialized');
      return;
    }

    setMbgLoading(true);
    setMbgError(null);
    setMbgDocuments([]);

    try {
      const token = jwtToken || await refreshJwtToken();
      if (!token) {
        throw new Error('Failed to get JWT token');
      }

      const baseUrl = nightscout.getBaseUrl();
      const url = `${baseUrl}/api/v3/entries?type=mbg`;
      console.log('Fetching MBG documents from:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('MBG documents response:', data);
      console.log('MBG documents data:', data.result);

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      setMbgDocuments(data.result || []);
    } catch (err) {
      console.error('Error fetching MBG documents:', err);
      setMbgError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setMbgLoading(false);
    }
  };

  // New function to delete all MBG documents
  const deleteAllMbgDocuments = async () => {
    console.log('deleteAllMbgDocuments called');
    if (!nightscout || mbgDocuments.length === 0) {
      setMbgError('No MBG documents to delete');
      return;
    }

    setMbgLoading(true);
    setMbgError(null);
    setMbgDeleteResponse(null);

    try {
      const token = jwtToken || await refreshJwtToken();
      if (!token) {
        throw new Error('Failed to get JWT token');
      }

      const baseUrl = nightscout.getBaseUrl();
      const validDocs = mbgDocuments.filter(doc => doc.identifier);
      console.log('Filtered MBG documents for deletion:', validDocs);

      const deletePromises = validDocs.map(doc => {
        const deleteUrl = `${baseUrl}/api/v3/entries/${doc.identifier}`;
        console.log('DELETE request URI:', deleteUrl);
        return fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }).then(res => res.json());
      });

      const results = await Promise.all(deletePromises);
      console.log('Delete all MBG documents response:', results);

      setMbgDeleteResponse({
        status: 200,
        message: `Successfully deleted ${results.length} MBG documents`,
        result: results
      });

      // Clear the MBG documents list after deletion
      setMbgDocuments([]);
    } catch (err) {
      console.error('Error deleting MBG documents:', err);
      setMbgError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setMbgLoading(false);
    }
  };

  // Function to fetch all SGV documents
  const fetchAllSgvDocuments = async () => {
    if (!nightscout) {
      setSgvError('Nightscout client not initialized');
      return;
    }
    setSgvLoading(true);
    setSgvError(null);
    setSgvDocuments([]);
    try {
      const token = jwtToken || await refreshJwtToken();
      if (!token) {
        throw new Error('Failed to get JWT token');
      }
      const baseUrl = nightscout.getBaseUrl();
      const url = `${baseUrl}/api/v3/entries?type=sgv&fields=_all`;
      console.log('Fetching SGV documents from:', url);
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      console.log('SGV documents response:', data);
      console.log('SGV documents data:', data.result);
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      setSgvDocuments(data.result || []);
    } catch (err) {
      console.error('Error fetching SGV documents:', err);
      setSgvError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSgvLoading(false);
    }
  };

  // Function to delete all SGV documents
  const deleteAllSgvDocuments = async () => {
    if (!nightscout || sgvDocuments.length === 0) {
      setSgvError('No SGV documents to delete');
      return;
    }
    setSgvLoading(true);
    setSgvError(null);
    setSgvDeleteResponse(null);
    try {
      const token = jwtToken || await refreshJwtToken();
      if (!token) {
        throw new Error('Failed to get JWT token');
      }
      const baseUrl = nightscout.getBaseUrl();
      const validDocs = sgvDocuments.filter(doc => doc.identifier);
      console.log('Filtered SGV documents for deletion:', validDocs);
      const deletePromises = validDocs.map(doc => {
        const deleteUrl = `${baseUrl}/api/v3/entries/${doc.identifier}`;
        console.log('DELETE request URI:', deleteUrl);
        return fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }).then(res => res.json());
      });
      const results = await Promise.all(deletePromises);
      console.log('Delete all SGV documents response:', results);
      setSgvDeleteResponse({
        status: 200,
        message: `Successfully deleted ${results.length} SGV documents`,
        result: results
      });
      setSgvDocuments([]);
    } catch (err) {
      console.error('Error deleting SGV documents:', err);
      setSgvError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSgvLoading(false);
    }
  };

  return (
    <ResponsiveMainContent>
      <>
        <h2 className="text-xl font-semibold mb-4">Data Fix Tool</h2>
        
        <div className="space-y-4">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Note:</strong> Due to MongoDB's eventual consistency model and caching behavior, 
                  the verification check may still show the document as existing even after successful deletion. 
                  The deletion is still processed correctly, but it may take some time for all caches to update.
                </p>
              </div>
            </div>
          </div>

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

          <div className="flex space-x-4">
            <button
              onClick={() => setOperation('delete')}
              className={`flex-1 px-4 py-2 rounded ${
                operation === 'delete'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Delete
            </button>
            <button
              onClick={() => setOperation('patch')}
              className={`flex-1 px-4 py-2 rounded ${
                operation === 'patch'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Edit
            </button>
          </div>

          {operation === 'delete' ? (
            <>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="permanent"
                  checked={permanent}
                  onChange={(e) => setPermanent(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="permanent" className="ml-2 block text-sm text-gray-900">
                  Permanent deletion
                </label>
              </div>

              <button
                onClick={deleteDocument}
                disabled={loading || !documentId}
                className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Delete Document'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={loadDocument}
                disabled={loading || !documentId}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load Document'}
              </button>

              {currentDocument && (
                <div className="mt-4 space-y-4">
                  <h3 className="text-lg font-medium">Edit Document</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">JSON Document</label>
                    <textarea
                      value={editedDocument}
                      onChange={(e) => setEditedDocument(e.target.value)}
                      className="w-full h-96 font-mono text-sm p-4 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      spellCheck="false"
                    />
                  </div>
                  <button
                    onClick={applyPatch}
                    disabled={loading}
                    className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
                  >
                    {loading ? 'Applying Changes...' : 'Apply Changes'}
                  </button>
                </div>
              )}

              {patchResponse && (
                <div className="mt-4 p-4 bg-green-50 rounded-md">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">PATCH Response</h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p>Status: {patchResponse.status}</p>
                        {patchResponse.message && <p>Message: {patchResponse.message}</p>}
                        <div className="mt-2">
                          <p className="font-medium">Full Response:</p>
                          <pre className="mt-1 bg-white p-2 rounded text-xs overflow-auto">
                            {JSON.stringify(patchResponse, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

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

          {initialCheck && (
            <div className="mt-4 p-4 bg-blue-50 rounded-md">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Initial Check</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>Status: {initialCheck.status}</p>
                    {initialCheck.message && <p>Message: {initialCheck.message}</p>}
                    <div className="mt-2">
                      <p className="font-medium">Full Response:</p>
                      <pre className="mt-1 bg-white p-2 rounded text-xs overflow-auto">
                        {JSON.stringify(initialCheck, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {deleteResponse && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-md">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Delete Response</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>Status: {deleteResponse.status}</p>
                    {deleteResponse.message && <p>Message: {deleteResponse.message}</p>}
                    <div className="mt-2">
                      <p className="font-medium">Full Response:</p>
                      <pre className="mt-1 bg-white p-2 rounded text-xs overflow-auto">
                        {JSON.stringify(deleteResponse, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* New MBG Cleanup Section */}
          <div className="mt-8 border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">MBG Cleanup</h3>
            <button
              onClick={fetchAllMbgDocuments}
              disabled={mbgLoading}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {mbgLoading ? 'Loading...' : 'Fetch All MBG Documents'}
            </button>

            {mbgError && (
              <div className="mt-4 p-4 bg-red-50 rounded-md">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{mbgError}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {mbgDocuments.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700">MBG Documents ({mbgDocuments.length})</h4>
                <div className="mt-2 max-h-60 overflow-y-auto">
                  <ul className="space-y-2">
                    {mbgDocuments.map((doc, idx) => (
                      <li key={doc.identifier || idx} className="text-sm text-gray-600">
                        {doc.identifier
                          ? <>
                              <div><span className="font-mono font-bold">ID:</span> {doc.identifier}</div>
                              <div><span className="font-mono">date:</span> {doc.date}</div>
                              <div><span className="font-mono">mbg:</span> {doc.mbg}</div>
                              <div><span className="font-mono">device:</span> {doc.device}</div>
                            </>
                          : <pre className="bg-yellow-100 p-2 rounded">{JSON.stringify(doc, null, 2)}</pre>
                        }
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={deleteAllMbgDocuments}
                  disabled={mbgLoading}
                  className="mt-4 w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
                >
                  {mbgLoading ? 'Deleting...' : 'Delete All MBG Documents'}
                </button>
              </div>
            )}

            {mbgDeleteResponse && (
              <div className="mt-4 p-4 bg-green-50 rounded-md">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Delete Response</h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>Status: {mbgDeleteResponse.status}</p>
                      {mbgDeleteResponse.message && <p>Message: {mbgDeleteResponse.message}</p>}
                      <div className="mt-2">
                        <p className="font-medium">Full Response:</p>
                        <pre className="mt-1 bg-white p-2 rounded text-xs overflow-auto">
                          {JSON.stringify(mbgDeleteResponse, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* New SGV Cleanup Section */}
          <div className="mt-8 border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">SGV Cleanup</h3>
            <button
              onClick={fetchAllSgvDocuments}
              disabled={sgvLoading}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {sgvLoading ? 'Loading...' : 'Fetch All SGV Documents'}
            </button>
            {sgvError && (
              <div className="mt-4 p-4 bg-red-50 rounded-md">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{sgvError}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {sgvDocuments.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700">SGV Documents ({sgvDocuments.length})</h4>
                <div className="mt-2 max-h-60 overflow-y-auto">
                  <ul className="space-y-2">
                    {sgvDocuments.map((doc, idx) => (
                      <li key={doc.identifier || idx} className="text-sm text-gray-600">
                        {doc.identifier
                          ? <>
                              <div><span className="font-mono font-bold">ID:</span> {doc.identifier}</div>
                              <div><span className="font-mono">date:</span> {doc.date}</div>
                              <div><span className="font-mono">sgv:</span> {doc.sgv}</div>
                              <div><span className="font-mono">device:</span> {doc.device}</div>
                            </>
                          : <pre className="bg-yellow-100 p-2 rounded">{JSON.stringify(doc, null, 2)}</pre>
                        }
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={deleteAllSgvDocuments}
                  disabled={sgvLoading}
                  className="mt-4 w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
                >
                  {sgvLoading ? 'Deleting...' : 'Delete All SGV Documents'}
                </button>
              </div>
            )}
            {sgvDeleteResponse && (
              <div className="mt-4 p-4 bg-green-50 rounded-md">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Delete Response</h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>Status: {sgvDeleteResponse.status}</p>
                      {sgvDeleteResponse.message && <p>Message: {sgvDeleteResponse.message}</p>}
                      <div className="mt-2">
                        <p className="font-medium">Full Response:</p>
                        <pre className="mt-1 bg-white p-2 rounded text-xs overflow-auto">
                          {JSON.stringify(sgvDeleteResponse, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    </ResponsiveMainContent>
  );
};

export default DataFix; 