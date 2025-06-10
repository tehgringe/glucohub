import React, { createContext, useContext, useState, useEffect } from 'react';
import { NightscoutClient } from '../lib/nightscout';
import { NightscoutConfig } from '../types/nightscout';

interface NightscoutContextType {
  nightscout: NightscoutClient | null;
  config: NightscoutConfig | null;
  setConfig: (config: NightscoutConfig) => void;
}

const NightscoutContext = createContext<NightscoutContextType>({
  nightscout: null,
  config: null,
  setConfig: () => {},
});

export const useNightscout = () => useContext(NightscoutContext);

export const NightscoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [nightscout, setNightscout] = useState<NightscoutClient | null>(null);
  const [config, setConfig] = useState<NightscoutConfig | null>(null);

  useEffect(() => {
    const baseUrl = localStorage.getItem('nightscoutBaseUrl');
    const apiSecret = localStorage.getItem('nightscoutApiSecret');
    const accessToken = localStorage.getItem('nightscoutAccessToken');

    if (baseUrl && apiSecret && accessToken) {
      const newConfig = {
        baseUrl,
        apiSecret,
        accessToken,
        enabled: true
      };
      setConfig(newConfig);
      setNightscout(new NightscoutClient(baseUrl, apiSecret, accessToken));
    }
  }, []);

  const handleSetConfig = (newConfig: NightscoutConfig) => {
    localStorage.setItem('nightscoutBaseUrl', newConfig.baseUrl);
    localStorage.setItem('nightscoutApiSecret', newConfig.apiSecret);
    localStorage.setItem('nightscoutAccessToken', newConfig.accessToken);
    setConfig(newConfig);
    setNightscout(new NightscoutClient(newConfig.baseUrl, newConfig.apiSecret, newConfig.accessToken));
  };

  return (
    <NightscoutContext.Provider value={{ nightscout, config, setConfig: handleSetConfig }}>
      {children}
    </NightscoutContext.Provider>
  );
}; 