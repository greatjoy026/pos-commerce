import React, { useState, useRef } from 'react';
import { ProductMediaItem, ProductVariant } from '../../types';
import { 
  Image as ImageIcon, Upload, Trash2, Star, ArrowLeft, 
  ArrowRight, Plus, Check, Sparkles, Eye, Layers, Link,
  CheckCircle2, X, AlertCircle
} from 'lucide-react';

interface Step5MediaProps {
  mediaGallery: ProductMediaItem[];
  setMediaGallery: (v: ProductMediaItem[]) => void;
  primaryImageUrl: string;
  setPrimaryImageUrl: (v: string) => void;
  variants: ProductVariant[];
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

export default function Step5Media({
  mediaGallery,
  setMediaGallery,
  primaryImageUrl,
  setPrimaryImageUrl,
  variants
}: Step5MediaProps) {
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Add image by direct URL
  const handleAddUrlImage = () => {
    if (!customUrlInput.trim()) return;
    const isFirst = mediaGallery.length === 0;
    const newItem: ProductMediaItem = {
      id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      url: customUrlInput.trim(),
      isPrimary: isFirst,
      variantTag: undefined
    };

    const updated = [...mediaGallery, newItem];
    setMediaGallery(updated);
    if (isFirst || !primaryImageUrl) {
      setPrimaryImageUrl(newItem.url);
    }
    setCustomUrlInput('');
  };

  // Add from preset
  const handleAddPreset = (url: string) => {
    if (mediaGallery.some(m => m.url === url)) return;
    const isFirst = mediaGallery.length === 0;
    const newItem: ProductMediaItem = {
      id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      url,
      isPrimary: isFirst,
      variantTag: undefined
    };

    const updated = [...mediaGallery, newItem];
    setMediaGallery(updated);
    if (isFirst || !primaryImageUrl) {
      setPrimaryImageUrl(newItem.url);
    }
  };

  // Process multiple file list (from file picker or drop zone)
  const processFileList = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;

    setIsProcessingFiles(true);

    try {
      // Read all files concurrently with Promise.all
      const loadedItems: ProductMediaItem[] = await Promise.all(
        fileArray.map((file, index) => {
          return new Promise<ProductMediaItem>((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUrl = (event.target?.result as string) || '';
              resolve({
                id: `img-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
                url: dataUrl,
                isPrimary: false,
                variantTag: undefined
              });
            };
            reader.onerror = () => {
              resolve({
                id: `img-${Date.now()}-${index}`,
                url: '',
                isPrimary: false,
                variantTag: undefined
              });
            };
            reader.readAsDataURL(file);
          });
        })
      );

      const validItems = loadedItems.filter(item => Boolean(item.url));
      if (validItems.length === 0) return;

      const hadNoImages = mediaGallery.length === 0;
      if (hadNoImages) {
        validItems[0].isPrimary = true;
        setPrimaryImageUrl(validItems[0].url);
      }

      setMediaGallery([...mediaGallery, ...validItems]);
    } catch (err) {
      console.error('Failed to load image files:', err);
    } finally {
      setIsProcessingFiles(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // File Upload via Input Click
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFileList(e.target.files);
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFileList(e.dataTransfer.files);
    }
  };

  // Set Primary Image
  const handleSetPrimary = (index: number) => {
    const targetUrl = mediaGallery[index].url;
    const updated = mediaGallery.map((item, i) => ({
      ...item,
      isPrimary: i === index
    }));
    setMediaGallery(updated);
    setPrimaryImageUrl(targetUrl);
  };

  // Delete image
  const handleDeleteImage = (index: number) => {
    const wasPrimary = mediaGallery[index].isPrimary;
    const updated = mediaGallery.filter((_, i) => i !== index);
    if (wasPrimary && updated.length > 0) {
      updated[0].isPrimary = true;
      setPrimaryImageUrl(updated[0].url);
    } else if (updated.length === 0) {
      setPrimaryImageUrl('');
    }
    setMediaGallery(updated);
  };

  // Move image position (Reorder)
  const handleMoveImage = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= mediaGallery.length) return;
    const updated = [...mediaGallery];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setMediaGallery(updated);
  };

  // Assign Variant Tag
  const handleAssignVariant = (index: number, tag: string) => {
    const updated = [...mediaGallery];
    updated[index] = { ...updated[index], variantTag: tag || undefined };
    setMediaGallery(updated);
  };

  // List of variant labels for dropdown
  const variantOptions = variants.map(v => {
    const parts = [v.sku];
    if (v.color) parts.push(v.color);
    if (v.size) parts.push(v.size);
    if (v.model) parts.push(v.model);
    return {
      sku: v.sku,
      label: parts.join(' - ')
    };
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="step-5-media">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-indigo-600" />
            <span>Visual Media & Multi-Image Asset Gallery</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload multiple high-resolution photos at once, set primary hero image, arrange display order, and map photos to specific variants.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-200">
            {mediaGallery.length} Photos in Gallery
          </span>
          {mediaGallery.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setMediaGallery([]);
                setPrimaryImageUrl('');
              }}
              className="text-xs text-red-600 hover:text-red-800 font-bold px-2 py-1"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Upload Zone & Presets */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Upload Action Box (Supports Multiple Image Selection & Drag/Drop) */}
        <div className="md:col-span-6 space-y-3">
          <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
            <span>Upload Multiple Product Images</span>
            <span className="text-[10px] text-indigo-600 font-semibold">Select 1 or many files</span>
          </label>

          <div 
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all space-y-2 group ${
              isDragging 
                ? 'border-indigo-600 bg-indigo-50/80 scale-[1.01]' 
                : 'border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/40'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              multiple 
              className="hidden" 
              onChange={handleFileUpload} 
            />
            <div className="w-11 h-11 bg-white group-hover:bg-indigo-600 group-hover:text-white text-slate-600 rounded-2xl shadow-xs flex items-center justify-center mx-auto transition-all">
              <Upload className={`w-5 h-5 ${isProcessingFiles ? 'animate-bounce text-indigo-600' : ''}`} />
            </div>
            
            <div>
              <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-950">
                {isProcessingFiles ? 'Processing images...' : 'Click or Drag & Drop Multiple Images'}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Select multiple JPG, PNG, WEBP files simultaneously from your device
              </p>
            </div>
          </div>

          {/* URL Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={customUrlInput}
              onChange={(e) => setCustomUrlInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUrlImage(); } }}
              placeholder="Paste image web URL (e.g. https://...)"
              className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-slate-950 focus:outline-hidden"
              id="input-media-url"
            />
            <button
              type="button"
              onClick={handleAddUrlImage}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 active:scale-98 transition-all shrink-0"
            >
              + Add URL
            </button>
          </div>
        </div>

        {/* Curated Presets */}
        <div className="md:col-span-6 space-y-3">
          <label className="text-xs font-bold text-slate-800 block">
            Or Choose from Curated Studio Templates
          </label>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESET_TEMPLATES.map((tpl, i) => {
              const isAdded = mediaGallery.some(m => m.url === tpl.url);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleAddPreset(tpl.url)}
                  className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                    isAdded 
                      ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-500/20' 
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <img 
                    src={tpl.url} 
                    alt={tpl.name}
                    className="w-8 h-8 rounded-lg object-cover bg-slate-100 shrink-0" 
                  />
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-slate-800 block truncate">
                      {tpl.name}
                    </span>
                    <span className="text-[9px] text-slate-400 block">
                      {isAdded ? 'Added ✓' : '+ Add'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Gallery Cards Grid */}
      {mediaGallery.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Gallery Sequence & Variant Association</span>
            </h4>
            <span className="text-[11px] text-slate-400">
              Drag or use arrows to change sequence. Star sets the primary hero image.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {mediaGallery.map((item, idx) => (
              <div 
                key={item.id}
                className={`bg-white border rounded-2xl p-3 space-y-2.5 transition-all shadow-2xs ${
                  item.isPrimary 
                    ? 'border-amber-400 ring-2 ring-amber-400/20' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Image Container */}
                <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 group">
                  <img 
                    src={item.url} 
                    alt={`Product asset ${idx + 1}`} 
                    className="w-full h-full object-cover"
                  />

                  {/* Primary Badge */}
                  {item.isPrimary && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold uppercase rounded-md shadow-xs flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      Hero Image
                    </span>
                  )}

                  {/* Quick Action Overlay */}
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPreviewImage(item.url)}
                      className="p-2 bg-white text-slate-900 rounded-lg hover:bg-slate-100 transition-transform active:scale-95 shadow-md"
                      title="Preview Full Size"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {!item.isPrimary && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(idx)}
                        className="p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-transform active:scale-95 shadow-md"
                        title="Set as Primary Hero Image"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(idx)}
                      className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-transform active:scale-95 shadow-md"
                      title="Delete Image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Reorder and Star Controls */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveImage(idx, 'left')}
                      className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none rounded"
                      title="Move Left"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      #{idx + 1}
                    </span>
                    <button
                      type="button"
                      disabled={idx === mediaGallery.length - 1}
                      onClick={() => handleMoveImage(idx, 'right')}
                      className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none rounded"
                      title="Move Right"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {!item.isPrimary ? (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(idx)}
                      className="text-[10px] font-bold text-slate-500 hover:text-amber-600 flex items-center gap-1"
                    >
                      <Star className="w-3 h-3" />
                      <span>Set Hero</span>
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Primary</span>
                    </span>
                  )}
                </div>

                {/* Variant Tag Mapper */}
                {variantOptions.length > 0 && (
                  <div className="pt-1">
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                      Map to Variant:
                    </label>
                    <select
                      value={item.variantTag || ''}
                      onChange={(e) => handleAssignVariant(idx, e.target.value)}
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700 focus:outline-hidden"
                    >
                      <option value="">All Variants (General)</option>
                      {variantOptions.map(opt => (
                        <option key={opt.sku} value={opt.sku}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full-size preview modal */}
      {selectedPreviewImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedPreviewImage(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-slate-900 rounded-2xl overflow-hidden p-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setSelectedPreviewImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={selectedPreviewImage} 
              alt="Full Preview" 
              className="w-full h-auto max-h-[75vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
