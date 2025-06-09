import React from 'react';
import { useNightscout } from '../contexts/NightscoutContext';

export const ConfigForm: React.FC = () => {
  const { config, setConfig } = useNightscout();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newConfig = {
      nightscoutUrl: formData.get('url') as string,
      nightscoutApiSecret: formData.get('token') as string,
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
                defaultValue={config?.nightscoutUrl}
              />
            </div>
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700">
                API Token
              </label>
              <input
                type="password"
                name="token"
                id="token"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Your API token"
                defaultValue={config?.nightscoutApiSecret}
              />
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