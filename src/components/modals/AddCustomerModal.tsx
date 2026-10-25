import React, { useState } from 'react';
import { X, MapPin, Navigation, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { PricingTier, PaymentTerms } from '../../types/index.ts';
import { CustomerMapPicker } from '../maps/CustomerMapPicker.tsx';

const PRICING_TIERS: PricingTier[] = ['Distributor', 'Wholesale', 'Retail', 'Special'];
const PAYMENT_TERMS_LIST: PaymentTerms[] = ['Immediate / COD', 'Net 7', 'Net 15', 'Net 30', 'Net 60'];

export const AddCustomerModal: React.FC = () => {
  const { isAddCustomerModalOpen, setIsAddCustomerModalOpen, createCustomer } = useApp();

  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Colombo');
  const [pricingTier, setPricingTier] = useState<PricingTier>('Distributor');
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('Net 30');
  const [creditLimit, setCreditLimit] = useState<number>(100000);
  const [latitude, setLatitude] = useState<number>(6.9271);
  const [longitude, setLongitude] = useState<number>(79.8612);
  const [notes, setNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [gpsStatus, setGpsStatus] = useState('');

  if (!isAddCustomerModalOpen) return null;

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocation not supported by browser.');
      return;
    }
    setGpsStatus('Locating GPS coordinates...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(parseFloat(pos.coords.latitude.toFixed(6)));
        setLongitude(parseFloat(pos.coords.longitude.toFixed(6)));
        setGpsStatus('Location captured successfully!');
      },
      (err) => {
        setGpsStatus(`GPS error: ${err.message}. Using default Colombo coordinates.`);
      },
      { timeout: 8000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !businessName.trim()) {
      setError('Contact Person and Business Name are required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await createCustomer({
        name: name.trim(),
        businessName: businessName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        pricingTier,
        paymentTerms,
        creditLimit: Number(creditLimit) || 50000,
        notes: notes.trim(),
        coordinates: {
          latitude: Number(latitude) || 6.9271,
          longitude: Number(longitude) || 79.8612,
        },
      });

      // Clear & close
      setName('');
      setBusinessName('');
      setEmail('');
      setPhone('');
      setAddress('');
      setNotes('');
      setIsAddCustomerModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden border border-amber-200">
        <div className="bg-gradient-to-r from-amber-700 to-amber-900 px-6 py-4 flex items-center justify-between text-white">
          <div>
            <h3 className="text-lg font-bold">New Customer / Trade Account</h3>
            <p className="text-xs text-amber-200">Set commercial terms, assigned pricing tier, and dispatch GPS coordinates</p>
          </div>
          <button
            onClick={() => setIsAddCustomerModalOpen(false)}
            aria-label="Close modal"
            className="text-amber-200 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Business / Enterprise Name *
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Lanka Spice Traders, Cinnamon Grand Kitchens..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Primary Contact Person *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Gamini Perera, Kasun Fernando..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="purchasing@example.lk"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+94 77 123 4567"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Street / Delivery Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="No. 128, Main Wholesale Market, 4th Cross Street"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                City / Region
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Colombo, Kandy, Galle, Negombo..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Assigned Pricing Tier
              </label>
              <select
                value={pricingTier}
                onChange={(e) => setPricingTier(e.target.value as PricingTier)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-amber-900 focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
              >
                {PRICING_TIERS.map((t) => (
                  <option key={t} value={t}>{t} Tier</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Payment Terms
              </label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value as PaymentTerms)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
              >
                {PAYMENT_TERMS_LIST.map((term) => (
                  <option key={term} value={term}>{term}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Credit Limit (Rs.)
              </label>
              <input
                type="number"
                min="0"
                step="5000"
                value={creditLimit}
                onChange={(e) => setCreditLimit(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
            </div>
          </div>

          {/* Google Maps Interactive Location Picker */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-amber-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-950 uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-amber-700" />
                <span>Google Maps Location & Delivery Pin</span>
              </div>
              <span className="text-[11px] text-amber-800 font-medium">Click map or pick hub to set pin</span>
            </div>

            <CustomerMapPicker
              latitude={latitude}
              longitude={longitude}
              address={address}
              city={city}
              onChangeLocation={(newLat, newLng, suggestedAddr) => {
                setLatitude(newLat);
                setLongitude(newLng);
                if (suggestedAddr && !address) {
                  setAddress(suggestedAddr);
                }
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Internal Trade Notes / Instructions
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Special loading dock hours, preferred delivery morning times..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-hidden"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsAddCustomerModalOpen(false)}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-semibold shadow-md transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving Customer...' : 'Create Customer Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
