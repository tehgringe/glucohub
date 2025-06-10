import React from 'react';
import { useNightscout } from '../contexts/NightscoutContext';

export const ConfigForm: React.FC = () => {
  const { config, setConfig } = useNightscout();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newConfig = {
      baseUrl: formData.get('url') as string,
      apiSecret: formData.get('apiSecret') as string,
      accessToken: formData.get('accessToken') as string,
      enabled: true
    };
    setConfig(newConfig);
  };

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Nightscout Configuration</h3>
        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>Configure your Nightscout server settings.</p>
        </div>
        <form onSubmit={handleSubmit} className="mt-5">
          <div className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700">
                Nightscout URL
              </label>
              <input
                type="url"
                name="url"
                id="url"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="https://your-nightscout.herokuapp.com"
                defaultValue={config?.baseUrl}
                required
              />
            </div>
            <div>
              <label htmlFor="apiSecret" className="block text-sm font-medium text-gray-700">
                API Secret (for API v1)
              </label>
              <input
                type="password"
                name="apiSecret"
                id="apiSecret"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Your API secret"
                defaultValue={config?.apiSecret}
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
                name="accessToken"
                id="accessToken"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Your access token"
                defaultValue={config?.accessToken}
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Used for API v3 JWT authentication. This is your Nightscout access token.
              </p>
            </div>
          </div>
          <div className="mt-5">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 