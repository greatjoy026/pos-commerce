import React, { useState } from 'react';
import { 
  SlidersHorizontal, Plus, Trash2, Sparkles, Check, 
  HelpCircle, FileText, ArrowUpDown, ChevronDown
} from 'lucide-react';

interface StepSpecificationsProps {
  specifications: Record<string, string>;
  setSpecifications: (v: Record<string, string>) => void;
}

const COMMON_SPEC_SUGGESTIONS = [
  'Material', 'Dimensions', 'Weight', 'Battery Life', 'Connectivity',
  'Warranty', 'Color', 'Water Resistance', 'Country of Origin', 'Voltage'
];

export default function StepSpecifications({
  specifications,
  setSpecifications
}: StepSpecificationsProps) {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const entries = Object.entries(specifications || {});

  const handleAddSpec = () => {
    if (!newKey.trim()) return;
    setSpecifications({
      ...specifications,
      [newKey.trim()]: newValue.trim()
    });
    setNewKey('');
    setNewValue('');
  };

  const handleUpdateValue = (key: string, value: string) => {
    setSpecifications({
      ...specifications,
      [key]: value
    });
  };

  const handleDeleteSpec = (keyToDelete: string) => {
    const next = { ...specifications };
    delete next[keyToDelete];
    setSpecifications(next);
  };

  return (
    <div className="space-y-6">
      {/* Specifications Builder */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="border-b border-slate-100 pb-3 mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
            Technical Specifications & Custom Attributes
          </h3>
          <p className="text-xs text-slate-500">Provide key-value technical metadata for customer documentation, filtering, and compliance.</p>
        </div>

        {/* Add new attribute */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Attribute Name</label>
            <input
              type="text"
              list="spec-key-suggestions"
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
              placeholder="e.g. Dimensions or Battery Life"
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
            />
            <datalist id="spec-key-suggestions">
              {COMMON_SPEC_SUGGESTIONS.map(s => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Value / Measurement</label>
            <input
              type="text"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              placeholder="e.g. Up to 40 Hours"
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleAddSpec}
              disabled={!newKey.trim()}
              className="w-full py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Attribute
            </button>
          </div>
        </div>

        {/* List */}
        {entries.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-3 w-1/3">Attribute Key</th>
                  <th className="p-3">Value</th>
                  <th className="p-3 text-center w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map(([k, v]) => (
                  <tr key={k} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{k}</td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={v}
                        onChange={e => handleUpdateValue(k, e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 font-medium"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteSpec(k)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
            <SlidersHorizontal className="w-8 h-8 text-slate-300 mx-auto mb-1" />
            <p className="text-xs font-bold text-slate-600">No specifications added</p>
            <p className="text-[11px] text-slate-400">Add custom attributes above for product datasheets.</p>
          </div>
        )}
      </div>
    </div>
  );
}
