import React, { useState } from 'react';
import { ProductSpecificationItem } from '../../types';
import { 
  SlidersHorizontal, Plus, Trash2, Sparkles, Check, 
  HelpCircle, FileText, ArrowUpDown, ChevronDown
} from 'lucide-react';

interface Step6SpecificationsProps {
  specifications: ProductSpecificationItem[];
  setSpecifications: (v: ProductSpecificationItem[]) => void;
  category: string;
}

const CATEGORY_PRESET_SPECS: Record<string, { key: string; placeholder: string }[]> = {
  'Electronics': [
    { key: 'Battery Life', placeholder: 'e.g. Up to 40 Hours (ANC On)' },
    { key: 'Connectivity', placeholder: 'e.g. Bluetooth 5.3, USB-C, AUX' },
    { key: 'Drivers / Sensor', placeholder: 'e.g. 40mm Titanium Drivers' },
    { key: 'Weight', placeholder: 'e.g. 250 grams' },
    { key: 'Warranty', placeholder: 'e.g. 2 Years Manufacturer Replacement' },
    { key: 'Water Resistance', placeholder: 'e.g. IPX5 Splashproof' }
  ],
  'Apparel & Fashion': [
    { key: 'Material', placeholder: 'e.g. 100% Organic Combed Cotton' },
    { key: 'Care Instructions', placeholder: 'e.g. Machine wash cold, tumble dry low' },
    { key: 'Fit Type', placeholder: 'e.g. Regular / Relaxed Fit' },
    { key: 'Country of Origin', placeholder: 'e.g. Portugal' },
    { key: 'Season', placeholder: 'e.g. Autumn / Winter 2026' }
  ],
  'Home & Living': [
    { key: 'Dimensions', placeholder: 'e.g. 120cm x 60cm x 75cm' },
    { key: 'Material / Construction', placeholder: 'e.g. Solid Oak & Powder-Coated Steel' },
    { key: 'Max Weight Capacity', placeholder: 'e.g. 150 kg' },
    { key: 'Assembly Required', placeholder: 'e.g. Yes (Tools included)' }
  ],
  'Fitness & Outdoors': [
    { key: 'Material', placeholder: 'e.g. High-Density Ripstop Nylon' },
    { key: 'Capacity / Volume', placeholder: 'e.g. 32 Liters' },
    { key: 'Weather Resistance', placeholder: 'e.g. Waterproof PU Coating' },
    { key: 'Warranty', placeholder: 'e.g. Lifetime Warranty' }
  ]
};

export default function Step6Specifications({
  specifications,
  setSpecifications,
  category
}: Step6SpecificationsProps) {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  // Add custom spec item
  const handleAddSpec = () => {
    if (!newKey.trim() || !newValue.trim()) {
      alert('Please provide both an attribute key and a value.');
      return;
    }

    const newItem: ProductSpecificationItem = {
      id: `spec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      key: newKey.trim(),
      value: newValue.trim()
    };

    setSpecifications([...specifications, newItem]);
    setNewKey('');
    setNewValue('');
  };

  // Update spec item
  const handleUpdateSpec = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...specifications];
    updated[index] = { ...updated[index], [field]: val };
    setSpecifications(updated);
  };

  // Delete spec item
  const handleDeleteSpec = (index: number) => {
    setSpecifications(specifications.filter((_, i) => i !== index));
  };

  // Load category presets
  const handleApplyPresetCategory = (catName: string) => {
    const presets = CATEGORY_PRESET_SPECS[catName] || CATEGORY_PRESET_SPECS['Electronics'];
    const newItems: ProductSpecificationItem[] = presets.map((p, idx) => ({
      id: `spec-preset-${Date.now()}-${idx}`,
      key: p.key,
      value: p.placeholder.replace('e.g. ', '')
    }));

    setSpecifications([...specifications, ...newItems.filter(n => !specifications.some(s => s.key.toLowerCase() === n.key.toLowerCase()))]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="step-6-specifications">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
            <span>Technical Specifications & Dynamic Attributes</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Add detailed technical specifications, dimensions, materials, certifications, and product attributes for e-commerce spec sheets and receipts.
          </p>
        </div>

        {/* Preset Loader */}
        <button
          type="button"
          onClick={() => handleApplyPresetCategory(category)}
          className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all border border-indigo-200/60 flex items-center gap-1.5 self-start sm:self-auto"
          id="btn-autofill-specs"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Autofill {category || 'Electronics'} Specs</span>
        </button>
      </div>

      {/* Quick Template Chips */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span>Quick Specification Templates by Domain:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.keys(CATEGORY_PRESET_SPECS).map(catKey => (
            <button
              key={catKey}
              type="button"
              onClick={() => handleApplyPresetCategory(catKey)}
              className="px-2.5 py-1 bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 rounded-lg text-xs font-medium transition-all"
            >
              + {catKey} Package
            </button>
          ))}
        </div>
      </div>

      {/* Specifications Table / Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Defined Specification Parameters ({specifications.length})
          </h4>
          <span className="text-xs text-slate-500">
            Rendered on online product pages & POS specification modals
          </span>
        </div>

        {specifications.length > 0 ? (
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-2.5 w-1/3">Specification Attribute Key</th>
                    <th className="px-4 py-2.5">Attribute Value / Technical Detail</th>
                    <th className="px-4 py-2.5 text-center w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {specifications.map((spec, idx) => (
                    <tr key={spec.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={spec.key}
                          onChange={(e) => handleUpdateSpec(idx, 'key', e.target.value)}
                          placeholder="e.g. Battery Life"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-slate-950"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={spec.value}
                          onChange={(e) => handleUpdateSpec(idx, 'value', e.target.value)}
                          placeholder="e.g. 40 Hours"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:bg-white focus:ring-1 focus:ring-slate-950"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteSpec(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Remove specification"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-center space-y-2">
            <SlidersHorizontal className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-xs font-bold text-slate-700">No Specifications Added Yet</div>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Add custom technical details below or click an autofill template above to quickly populate attributes.
            </p>
          </div>
        )}
      </div>

      {/* Add New Specification Input Row */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
        <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-indigo-600" />
          <span>+ Add Custom Specification Field</span>
        </h5>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-4">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Attribute Name / Key
            </label>
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="e.g., Wireless Range, Material, Voltage"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
            />
          </div>

          <div className="sm:col-span-6">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Attribute Value / Technical Detail
            </label>
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSpec(); } }}
              placeholder="e.g., Up to 15 Meters (Bluetooth 5.3 Class 1)"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={handleAddSpec}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Spec</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
