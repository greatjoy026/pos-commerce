import React, { useState, useRef } from 'react';
import { 
  Image as ImageIcon, Upload, Trash2, Star, Plus, Check, 
  Sparkles, Eye, Link, CheckCircle2, X, AlertCircle
} from 'lucide-react';
import { ProductVariant } from '../../types';

interface StepMediaProps {
  imageUrl: string;
  setImageUrl: (v: string) => void;
  images: string[];
  setImages: (v: string[]) => void;
  variants: ProductVariant[];
  setVariants?: (v: ProductVariant[]) => void;
}

const PRESET_TEMPLATES = [
  { name: 'Headphones', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600' },
  { name: 'Smartwatch', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600' },
  { name: 'Footwear', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600' },
  { name: 'Apparel', url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=600' },
  { name: 'Coffee / Mug', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=600' },
  { name: 'Desk / Tech', url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=600' },
  { name: 'Backpack', url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=600' },
  { name: 'Camera', url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=600' }
];

export default function StepMedia({
  imageUrl,
  setImageUrl,
  images,
  setImages,
  variants = []
}: StepMediaProps) {
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAddUrlImage = () => {
    if (!urlInput.trim()) return;
    const newUrl = urlInput.trim();
    if (!images.includes(newUrl)) {
      const updated = [...images, newUrl];
      setImages(updated);
      if (!imageUrl) {
        setImageUrl(newUrl);
      }
    }
    setUrlInput('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const resultUrl = String(reader.result || '');
        if (resultUrl && !images.includes(resultUrl)) {
          setImages([...images, resultUrl]);
          if (!imageUrl) {
            setImageUrl(resultUrl);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDeleteImage = (imgUrl: string) => {
    const updated = images.filter(img => img !== imgUrl);
    setImages(updated);
    if (imageUrl === imgUrl) {
      setImageUrl(updated[0] || '');
    }
  };

  const handleSetPrimary = (imgUrl: string) => {
    setImageUrl(imgUrl);
    if (!images.includes(imgUrl)) {
      setImages([imgUrl, ...images]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload & URL Input Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="border-b border-slate-100 pb-3 mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-indigo-600" />
            Product Media & Visual Assets
          </h3>
          <p className="text-xs text-slate-500">Upload high-resolution photography, web assets, or choose ready-made templates.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* File Drag / Drop area */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/40 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center"
          >
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              multiple
              className="hidden"
            />
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-2">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-800">Click or drag image to upload</p>
            <p className="text-[11px] text-slate-500 mt-0.5">PNG, JPG, WEBP up to 10MB</p>
          </div>

          {/* Direct URL Input */}
          <div className="flex flex-col justify-center space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <label className="text-xs font-bold text-slate-700">Add Image from Web URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="button"
                onClick={handleAddUrlImage}
                className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shrink-0"
              >
                Add Image
              </button>
            </div>
            <p className="text-[11px] text-slate-400">Direct CDN or HTTPS image link.</p>
          </div>
        </div>

        {/* Preset Templates */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-600 block mb-2">
            Or pick a sample catalog visual:
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESET_TEMPLATES.map(preset => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleSetPrimary(preset.url)}
                className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 transition-all"
              >
                <img src={preset.url} alt={preset.name} className="w-5 h-5 rounded object-cover" />
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Active Gallery Shots ({images.length})
          </h3>
          <span className="text-xs text-slate-500">Star icon designates primary POS cover</span>
        </div>

        {images.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((img, idx) => {
              const isCover = img === imageUrl;
              return (
                <div 
                  key={idx}
                  className={`group relative rounded-2xl overflow-hidden border-2 transition-all ${
                    isCover ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-slate-200'
                  }`}
                >
                  <img src={img} alt="Product" className="w-full h-32 object-cover" />
                  
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2 p-2">
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(img)}
                      className={`p-1.5 rounded-lg text-xs font-bold ${
                        isCover ? 'bg-indigo-600 text-white' : 'bg-white text-slate-800 hover:bg-indigo-50'
                      }`}
                      title="Set as Primary Cover"
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img)}
                      className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700"
                      title="Delete Image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {isCover && (
                    <span className="absolute top-2 left-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                      Primary
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
            <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-1" />
            <p className="text-xs font-bold text-slate-600">No images added</p>
            <p className="text-[11px] text-slate-400">Add an image URL or choose a template above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
