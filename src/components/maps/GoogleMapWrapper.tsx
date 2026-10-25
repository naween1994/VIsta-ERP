import React, { useEffect, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';

interface GoogleMapWrapperProps {
  children: React.ReactNode;
}

export const GoogleMapWrapper: React.FC<GoogleMapWrapperProps> = ({ children }) => {
  const buildApiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [configLoadFailed, setConfigLoadFailed] = useState(false);

  useEffect(() => {
    let isActive = true;
    fetch('/api/config')
      .then(async (response) => {
        if (!response.ok) throw new Error(`Configuration request failed (${response.status}).`);
        return response.json() as Promise<{ googleMapsApiKey?: string }>;
      })
      .then((config) => {
        if (isActive) setApiKey(config.googleMapsApiKey || buildApiKey);
      })
      .catch((err) => {
        console.error('Failed to load runtime map configuration:', err);
        if (isActive) {
          setConfigLoadFailed(true);
          setApiKey(buildApiKey);
        }
      });

    return () => {
      isActive = false;
    };
  }, [buildApiKey]);

  if (apiKey === null) {
    return <div className="rounded-xl bg-gray-50 p-4 text-center text-xs text-gray-500">Loading map settings...</div>;
  }

  if (!apiKey) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
        <p className="text-sm font-semibold text-amber-900">Google Maps API Key Required</p>
        <p className="text-xs text-amber-700 mt-1">
          {configLoadFailed
            ? 'Map settings could not be loaded. Configure the Google Maps API key to display customer locations and delivery routes.'
            : 'Configure the Google Maps API key to display customer locations and delivery routes.'}
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      {children}
    </APIProvider>
  );
};
