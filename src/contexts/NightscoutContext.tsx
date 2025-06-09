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
    const nightscoutUrl = localStorage.getItem('nightscoutUrl');
    const nightscoutApiSecret = localStorage.getItem('nightscoutApiSecret');

    if (nightscoutUrl && nightscoutApiSecret) {
      const newConfig = {
        nightscoutUrl,
        nightscoutApiSecret,
      };
      setConfig(newConfig);
      setNightscout(new NightscoutClient(newConfig));
    }
  }, []);

  const handleSetConfig = (newConfig: NightscoutConfig) => {
    localStorage.setItem('nightscoutUrl', newConfig.nightscoutUrl);
    localStorage.setItem('nightscoutApiSecret', newConfig.nightscoutApiSecret);
    setConfig(newConfig);
    setNightscout(new NightscoutClient(newConfig));
  };

  return (
    <NightscoutContext.Provider value={{ nightscout, config, setConfig: handleSetConfig }}>
      {children}
    </NightscoutContext.Provider>
  );
}; 