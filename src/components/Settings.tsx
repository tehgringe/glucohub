import React, { useState, useEffect } from 'react';
import { useNightscout } from '../contexts/NightscoutContext';

interface SettingsProps {
  onSave: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onSave }) => {
  console.log('Settings component rendering');
  
  const { config, setConfig } = useNightscout();
  const [url, setUrl] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('Settings mounted, config:', config);
    if (config) {
      setUrl(config.nightscoutUrl);
      setApiSecret(config.nightscoutApiSecret);
    }
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Settings form submitted');
    setError(null);
    setLoading(true);

    try {
      // Validate URL
      const urlObj = new URL(url.trim());
      if (!urlObj.protocol.startsWith('http')) {
        throw new Error('URL must start with http:// or https://');
      }

      // Validate API secret
      if (!apiSecret.trim()) {
        throw new Error('API Secret is required');
      }

      console.log('Saving settings:', { url: url.trim(), apiSecret: apiSecret.trim() });
      setConfig({
        nightscoutUrl: url.trim(),
        nightscoutApiSecret: apiSecret.trim()
      });
      onSave();
    } catch (err) {
      console.error('Settings error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const loadFoods = async () => {
    if (!config) {
      setError('Nightscout client not initialized');
      return;
    }
    // ...rest of your code
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <h2 className="text-2xl font-bold mb-8 text-center text-gray-900">Nightscout Settings</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="url" className="block text-sm font-medium text-gray-700">
                      Nightscout URL
                    </label>
                    <input
                      type="url"
                      id="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="https://your-nightscout.herokuapp.com"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="apiSecret" className="block text-sm font-medium text-gray-700">
                      API Secret
                    </label>
                    <input
                      type="password"
                      id="apiSecret"
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {error && (
                    <div className="rounded-md bg-red-50 p-4">
                      <div className="flex">
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">Error</h3>
                          <div className="mt-2 text-sm text-red-700">{error}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Settings'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 