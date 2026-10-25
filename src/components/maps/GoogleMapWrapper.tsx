import React from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';

interface GoogleMapWrapperProps {
  children: React.ReactNode;
}

export const GoogleMapWrapper: React.FC<GoogleMapWrapperProps> = ({ children }) => {
  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';

  if (!apiKey) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
        <p className="text-sm font-semibold text-amber-900">Google Maps API Key Required</p>
        <p className="text-xs text-amber-700 mt-1">
          Please ensure your Google Maps API key is configured to display interactive customer location maps and delivery routes.
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} libraries={['places', 'geometry']}>
      {children}
    </APIProvider>
  );
};
