import React, { useState } from 'react';
import { 
  X, FolderTree, Plus, Edit2, Trash, Check, ChevronRight, 
  ChevronDown, Folder, Tag, Layers, Search, AlertCircle 
} from 'lucide-react';
import { Category } from '../types';

interface CategoryHierarchyManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSaveCategory: (category: Category) => void | Promise<void>;
  onDeleteCategory: (categoryId: string) => void | Promise<void>;
}

export function CategoryHierarchyManagerModal({
  isOpen,
  onClose,
  categories,
  onSaveCategory,
  onDeleteCategory
}: CategoryHierarchyManagerModalProps) {
  const [search, setSearch] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Tag');
  const [color, setColor] = useState('#4f46e5');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const startCreate = (parentCatId?: string) => {
    setEditingCategory(null);
    setName('');
    setParentId(parentCatId || '');
    setDescription('');
    setIcon('Tag');
    setColor('#4f46e5');
    setIsCreating(true);
  };

  const startEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setParentId(cat.parentId || '');
    setDescription(cat.description || '');
    setIcon(cat.icon || 'Tag');
    setColor(cat.color || '#4f46e5');
    setIsCreating(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const categoryToSave: Category = {
        id: editingCategory ? editingCategory.id : `cat_${Date.now()}`,
        name: name.trim(),
        icon: icon || 'Tag',
        parentId: parentId || undefined,
        description: description.trim() || undefined,
        color: color || '#4f46e5'
      };

      await onSaveCategory(categoryToSave);
      setIsCreating(false);
      setEditingCategory(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      await onDeleteCategory(id);
      setDeleteConfirmId(null);
      if (editingCategory?.id === id) {
        setIsCreating(false);
        setEditingCategory(null);
      }
    } finally {
      setSaving(false);
    }
  };

  // Top level categories vs subcategories
  const rootCategories = categories.filter(c => !c.parentId);
  const getSubcategories = (pId: string) => categories.filter(c => c.parentId === pId);

  const filteredCategories = search.trim() 
    ? categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : rootCategories;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Category & Taxonomy Hierarchy</h2>
              <p className="text-xs text-slate-500">Organize multi-tier product categories, departments, and subcategories.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          
          {/* Left Tree Explorer (7 cols) */}
          <div className="md:col-span-7 border-r border-slate-100 p-5 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter categories..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>
              <button
                type="button"
                onClick={() => startCreate()}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Root</span>
              </button>
            </div>

            {/* Tree list */}
            <div className="space-y-2">
              {filteredCategories.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl">
                  <Tag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">No categories found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Create your first category hierarchy</p>
                </div>
              ) : (
                filteredCategories.map(cat => {
                  const subs = getSubcategories(cat.id);
                  return (
                    <div key={cat.id} className="border border-slate-200/80 rounded-2xl p-3 bg-white space-y-2 hover:border-indigo-200 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span 
                            className="w-3 h-3 rounded-full shrink-0" 
                            style={{ backgroundColor: cat.color || '#4f46e5' }}
                          />
                          <span className="text-xs font-bold text-slate-900 truncate">{cat.name}</span>
                          {cat.parentId && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-mono">
                              Sub
                            </span>
                          )}
                          {subs.length > 0 && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md font-semibold">
                              {subs.length} sub
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startCreate(cat.id)}
                            className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg text-[10px] font-bold px-1.5 flex items-center gap-0.5"
                            title="Add subcategory"
                          >
                            <Plus className="w-3 h-3" /> Sub
                          </button>
                          <button
                            type="button"
                            onClick={() => startEdit(cat)}
                            className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(cat.id)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"
                            title="Delete"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Sub categories list */}
                      {subs.length > 0 && (
                        <div className="pl-5 pt-1 space-y-1.5 border-l-2 border-slate-100 ml-2">
                          {subs.map(sub => (
                            <div key={sub.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors">
                              <div className="flex items-center gap-2 min-w-0">
                                <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="text-xs font-medium text-slate-800 truncate">{sub.name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => startEdit(sub)}
                                  className="p-1 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(sub.id)}
                                  className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"
                                >
                                  <Trash className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Edit / Create Form (5 cols) */}
          <div className="md:col-span-5 p-5 bg-slate-50/40 overflow-y-auto">
            {isCreating ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {editingCategory ? 'Edit Category' : 'Create Category'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setEditingCategory(null);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Beverages, Hot Drinks..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Hierarchy</label>
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  >
                    <option value="">None (Top-level Root Category)</option>
                    {categories
                      .filter(c => !editingCategory || c.id !== editingCategory.id)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.parentId ? `↳ ${c.name}` : c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description (Optional)</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description for POS/Ecommerce"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Color Accent</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="submit"
                    disabled={saving || !name.trim()}
                    className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                  >
                    {saving ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-3">
                <FolderTree className="w-10 h-10 text-slate-300" />
                <div>
                  <h4 className="text-xs font-bold text-slate-700">Select or Create a Category</h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Click any category on the left to edit, or create a new branch in your taxonomy.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startCreate()}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold"
                >
                  + Add Root Category
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Delete Confirmation Sub-Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <AlertCircle className="w-5 h-5" />
                <span>Delete Category?</span>
              </div>
              <p className="text-xs text-slate-600">
                Are you sure you want to delete this category? Associated products may be unassigned.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
                >
                  {saving ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
