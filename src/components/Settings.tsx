import React, { useState, useEffect } from 'react';
import { useNightscout } from '../contexts/NightscoutContext';
import { NightscoutConfig } from '../types/nightscout';
import { testNightscoutApiV3Status } from '../lib/nightscout';
import { ResponsiveMainContent } from './ResponsiveMainContent';

interface SettingsProps {
  onSave: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onSave }) => {
  console.log('Settings component rendering');
  
  const { config, setConfig } = useNightscout();
  const [url, setUrl] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [useBrowserTimezone, setUseBrowserTimezone] = useState(true);
  const [manualTimezone, setManualTimezone] = useState('');
  const [manualOffset, setManualOffset] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiCheckResult, setApiCheckResult] = useState<null | { success: boolean; message: string }>(null);

  // Get list of common timezones
  const timezones = Intl.supportedValuesOf('timeZone').sort();

  useEffect(() => {
    console.log('Settings mounted, config:', config);
    if (config) {
      setUrl(config.baseUrl);
      setApiSecret(config.apiSecret);
      setAccessToken(config.accessToken);
      if (config.timezone) {
        setUseBrowserTimezone(config.timezone.useBrowserTimezone);
        setManualTimezone(config.timezone.name || '');
        setManualOffset(config.timezone.manualOffset?.toString() || '');
      }
    }
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSubmit called');
    setError(null);
    setLoading(true);
    setApiCheckResult(null);

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

      // Validate access token
      if (!accessToken.trim()) {
        throw new Error('Access Token is required for API v3');
      }

      // Validate timezone settings
      let timezoneConfig: NightscoutConfig['timezone'] | undefined;
      if (!useBrowserTimezone) {
        if (!manualTimezone) {
          throw new Error('Please select a timezone');
        }
        const offset = parseInt(manualOffset);
        if (isNaN(offset)) {
          throw new Error('Invalid timezone offset');
        }
        timezoneConfig = {
          name: manualTimezone,
          useBrowserTimezone: false,
          manualOffset: offset
        };
      } else {
        // Use browser timezone
        timezoneConfig = {
          name: Intl.DateTimeFormat().resolvedOptions().timeZone,
          useBrowserTimezone: true
        };
      }

      console.log('Saving settings:', { 
        url: url.trim(), 
        apiSecret: apiSecret.trim(),
        accessToken: accessToken.trim(),
        timezone: timezoneConfig
      });
      
      setConfig({
        baseUrl: url.trim(),
        apiSecret: apiSecret.trim(),
        accessToken: accessToken.trim(),
        enabled: true,
        timezone: timezoneConfig
      });

      // Quick API v3 status check using the access token
      try {
        const status = await testNightscoutApiV3Status(url.trim(), accessToken.trim());
        console.debug('[Settings] Nightscout API v3 status response:', status);
        setApiCheckResult({ success: true, message: 'Nightscout API v3 status: ' + JSON.stringify(status) });
        console.debug('[Settings] apiCheckResult set to success');
      } catch (err) {
        console.error('[Settings] Nightscout API v3 connection failed:', err);
        setApiCheckResult({ success: false, message: 'Nightscout API v3 connection failed: ' + (err instanceof Error ? err.message : err) });
        console.debug('[Settings] apiCheckResult set to failure');
      }

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

  // Debug: Log apiCheckResult on every render
  console.debug('[Settings] Rendering, apiCheckResult:', apiCheckResult);

  return (
    <ResponsiveMainContent>
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
                        API Secret (for API v1)
                      </label>
                      <input
                        type="password"
                        id="apiSecret"
                        value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Used for API v1 endpoints. This is your Nightscout API secret.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="accessToken" className="block text-sm font-medium text-gray-700">
                        Access Token (for API v3)
                      </label>
                      <input
                        type="password"
                        id="accessToken"
                        value={accessToken}
                        onChange={(e) => setAccessToken(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Used for API v3 JWT authentication. This is your Nightscout access token.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900">Timezone Settings</h3>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="useBrowserTimezone"
                          checked={useBrowserTimezone}
                          onChange={(e) => setUseBrowserTimezone(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="useBrowserTimezone" className="ml-2 block text-sm text-gray-900">
                          Use browser timezone
                        </label>
                      </div>

                      {!useBrowserTimezone && (
                        <div className="space-y-4">
                          <div>
                            <label htmlFor="manualTimezone" className="block text-sm font-medium text-gray-700">
                              Timezone
                            </label>
                            <select
                              id="manualTimezone"
                              value={manualTimezone}
                              onChange={(e) => setManualTimezone(e.target.value)}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              required
                            >
                              <option value="">Select a timezone</option>
                              {timezones.map((tz) => (
                                <option key={tz} value={tz}>
                                  {tz}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label htmlFor="manualOffset" className="block text-sm font-medium text-gray-700">
                              Manual Offset (minutes)
                            </label>
                            <input
                              type="number"
                              id="manualOffset"
                              value={manualOffset}
                              onChange={(e) => setManualOffset(e.target.value)}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              placeholder="e.g., 240 for UTC+4"
                              required
                            />
                            <p className="mt-1 text-sm text-gray-500">
                              Enter the offset in minutes from UTC (e.g., 240 for UTC+4)
                            </p>
                          </div>
                        </div>
                      )}

                      {useBrowserTimezone && (
                        <div className="text-sm text-gray-500">
                          Current browser timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                        </div>
                      )}
                    </div>

                    {error && (
                      <div className="text-red-600 text-sm">{error}</div>
                    )}

                    <div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {loading ? 'Saving...' : 'Save Settings'}
                      </button>
                    </div>
                    <div>
                      <button
                        type="button"
                        disabled={loading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 mt-2"
                        onClick={async () => {
                          setError(null);
                          setLoading(true);
                          setApiCheckResult(null);
                          try {
                            const urlObj = new URL(url.trim());
                            if (!urlObj.protocol.startsWith('http')) {
                              throw new Error('URL must start with http:// or https://');
                            }
                            if (!accessToken.trim()) {
                              throw new Error('Access Token is required for API v3');
                            }
                            const status = await testNightscoutApiV3Status(url.trim(), accessToken.trim());
                            setApiCheckResult({ success: true, message: 'Nightscout API v3 status: ' + JSON.stringify(status) });
                          } catch (err) {
                            setApiCheckResult({ success: false, message: 'Nightscout API v3 connection failed: ' + (err instanceof Error ? err.message : err) });
                          } finally {
                            setLoading(false);
                          }
                        }}
                      >
                        {loading ? 'Testing...' : 'Test API Connection'}
                      </button>
                    </div>
                  </form>
                  {apiCheckResult && (
                    <div
                      style={{
                        marginTop: 16,
                        padding: 12,
                        borderRadius: 6,
                        color: apiCheckResult.success ? '#166534' : '#b91c1c',
                        background: apiCheckResult.success ? '#dcfce7' : '#fee2e2',
                        border: `1px solid ${apiCheckResult.success ? '#22c55e' : '#ef4444'}`,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                        fontSize: 14,
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        maxHeight: 240,
                      }}
                    >
                      {(() => {
                        // Try to pretty-print JSON if possible
                        try {
                          const parsed = JSON.parse(apiCheckResult.message.replace(/^Nightscout API v3 status: /, ''));
                          return <pre style={{margin: 0}}>{JSON.stringify(parsed, null, 2)}</pre>;
                        } catch {
                          return <span>{apiCheckResult.message}</span>;
                        }
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ResponsiveMainContent>
  );
}; 