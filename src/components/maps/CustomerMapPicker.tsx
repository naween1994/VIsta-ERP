import React, { useState, useEffect } from 'react';
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { MapPin, Navigation, Search, Check } from 'lucide-react';
import { GoogleMapWrapper } from './GoogleMapWrapper.tsx';

interface CustomerMapPickerProps {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  onChangeLocation: (lat: number, lng: number, suggestedAddress?: string) => void;
}

const SRI_LANKA_REGIONS = [
  { name: 'Colombo Pettah', lat: 6.9388, lng: 79.8542, city: 'Colombo 11' },
  { name: 'Kollupitiya', lat: 6.9034, lng: 79.8519, city: 'Colombo 03' },
  { name: 'Nugegoda', lat: 6.8722, lng: 79.8997, city: 'Nugegoda' },
  { name: 'Kandy City', lat: 7.2906, lng: 80.6337, city: 'Kandy' },
  { name: 'Negombo Main', lat: 7.2083, lng: 79.8358, city: 'Negombo' },
  { name: 'Gampaha Hub', lat: 7.0917, lng: 79.9998, city: 'Gampaha' },
  { name: 'Galle Fort', lat: 6.0329, lng: 80.2168, city: 'Galle' },
  { name: 'Kurunegala', lat: 7.4863, lng: 80.3623, city: 'Kurunegala' },
];

const InnerMapPicker: React.FC<CustomerMapPickerProps> = ({
  latitude,
  longitude,
  address,
  city,
  onChangeLocation,
}) => {
  const [center, setCenter] = useState({ lat: latitude || 6.9271, lng: longitude || 79.8612 });
  const [markerPos, setMarkerPos] = useState({ lat: latitude || 6.9271, lng: longitude || 79.8612 });
  const [zoom, setZoom] = useState(13);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (latitude && longitude && (latitude !== markerPos.lat || longitude !== markerPos.lng)) {
      setMarkerPos({ lat: latitude, lng: longitude });
      setCenter({ lat: latitude, lng: longitude });
    }
  }, [latitude, longitude]);

  const handleMapClick = (e: any) => {
    if (e.detail?.latLng) {
      const newLat = parseFloat(e.detail.latLng.lat.toFixed(6));
      const newLng = parseFloat(e.detail.latLng.lng.toFixed(6));
      setMarkerPos({ lat: newLat, lng: newLng });
      onChangeLocation(newLat, newLng);
      setFeedback('Pin location updated via map click!');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleRegionSelect = (region: typeof SRI_LANKA_REGIONS[0]) => {
    setMarkerPos({ lat: region.lat, lng: region.lng });
    setCenter({ lat: region.lat, lng: region.lng });
    setZoom(14);
    onChangeLocation(region.lat, region.lng, `${region.name}, ${region.city}, Sri Lanka`);
    setFeedback(`Centered on ${region.name}`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setFeedback('Detecting GPS position...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = parseFloat(pos.coords.latitude.toFixed(6));
        const newLng = parseFloat(pos.coords.longitude.toFixed(6));
        setMarkerPos({ lat: newLat, lng: newLng });
        setCenter({ lat: newLat, lng: newLng });
        setZoom(15);
        onChangeLocation(newLat, newLng);
        setFeedback('Current device location detected!');
        setTimeout(() => setFeedback(null), 3000);
      },
      (err) => {
        setFeedback(`GPS failed: ${err.message}`);
        setTimeout(() => setFeedback(null), 3000);
      },
      { timeout: 8000 }
    );
  };

  const handleSearchAddress = () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setFeedback('Searching location...');

    // Look for matching regional keyword or query
    const lower = searchQuery.toLowerCase();
    const matchedRegion = SRI_LANKA_REGIONS.find((r) => lower.includes(r.name.toLowerCase()) || lower.includes(r.city.toLowerCase()));
    
    if (matchedRegion) {
      handleRegionSelect(matchedRegion);
      setIsSearching(false);
      return;
    }

    // Try Google Geocoding if available via window.google.maps
    if (typeof window !== 'undefined' && (window as any).google?.maps?.Geocoder) {
      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode({ address: `${searchQuery}, Sri Lanka` }, (results: any, status: string) => {
        setIsSearching(false);
        if (status === 'OK' && results && results[0]) {
          const loc = results[0].geometry.location;
          const newLat = parseFloat(loc.lat().toFixed(6));
          const newLng = parseFloat(loc.lng().toFixed(6));
          setMarkerPos({ lat: newLat, lng: newLng });
          setCenter({ lat: newLat, lng: newLng });
          setZoom(15);
          onChangeLocation(newLat, newLng, results[0].formatted_address);
          setFeedback(`Found: ${results[0].formatted_address}`);
          setTimeout(() => setFeedback(null), 4000);
        } else {
          setFeedback(`Could not find "${searchQuery}". Click on the map to pin manually.`);
          setTimeout(() => setFeedback(null), 4000);
        }
      });
    } else {
      setIsSearching(false);
      setFeedback('Search submitted. Click directly on the map to pinpoint exact shop entrance.');
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  return (
    <div className="space-y-3">
      {/* Top Search & Presets Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchAddress())}
            placeholder="Search address or area in Sri Lanka..."
            className="w-full pl-9 pr-20 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <button
            type="button"
            onClick={handleSearchAddress}
            disabled={isSearching}
            className="absolute right-1 top-1 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-md transition"
          >
            {isSearching ? 'Finding...' : 'Locate'}
          </button>
        </div>

        <button
          type="button"
          onClick={handleDetectGPS}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition"
          title="Detect Current GPS Location"
        >
          <Navigation className="w-3.5 h-3.5 text-amber-600" />
          <span>My GPS</span>
        </button>
      </div>

      {/* Quick Region Presets */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
        <span className="text-slate-500 font-medium whitespace-nowrap">Quick Hubs:</span>
        {SRI_LANKA_REGIONS.map((r) => (
          <button
            key={r.name}
            type="button"
            onClick={() => handleRegionSelect(r)}
            className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-full whitespace-nowrap transition cursor-pointer"
          >
            {r.name}
          </button>
        ))}
      </div>

      {/* Interactive Google Map with explicit height */}
      <div className="relative rounded-xl overflow-hidden border border-slate-300 shadow-inner h-64 sm:h-72 w-full bg-slate-100">
        <Map
          center={center}
          zoom={zoom}
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          onClick={handleMapClick}
          onCenterChanged={(e) => setCenter(e.detail.center)}
          onZoomChanged={(e) => setZoom(e.detail.zoom)}
          style={{ width: '100%', height: '100%' }}
          gestureHandling="greedy"
          disableDefaultUI={false}
        >
          <AdvancedMarker
            position={markerPos}
            title={address || 'Customer Delivery Point'}
          >
            <Pin
              background="#D97706"
              borderColor="#78350F"
              glyphColor="#FFFFFF"
              scale={1.2}
            />
          </AdvancedMarker>
        </Map>

        {/* Tip overlay */}
        <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] px-2.5 py-1 rounded-md pointer-events-none flex items-center gap-1.5 shadow">
          <MapPin className="w-3 h-3 text-amber-400" />
          <span>Click on map to pin shop delivery entrance</span>
        </div>

        {/* Feedback message */}
        {feedback && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-amber-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 animate-fade-in pointer-events-none z-10">
            <Check className="w-3.5 h-3.5 text-amber-300" />
            <span>{feedback}</span>
          </div>
        )}
      </div>

      {/* Selected Coordinates Readout */}
      <div className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">Dispatch Coordinates:</span>
          <span className="font-mono text-amber-800 font-bold">
            {markerPos.lat.toFixed(5)}, {markerPos.lng.toFixed(5)}
          </span>
        </div>
        <span className="text-[11px] text-slate-500">
          Used for automated delivery route calculation
        </span>
      </div>
    </div>
  );
};

export const CustomerMapPicker: React.FC<CustomerMapPickerProps> = (props) => {
  return (
    <GoogleMapWrapper>
      <InnerMapPicker {...props} />
    </GoogleMapWrapper>
  );
};
