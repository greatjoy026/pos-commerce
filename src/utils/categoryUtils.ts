import { Category } from '../types';

/**
 * Recursively find all child/descendant category IDs for a given parent category ID.
 */
export function getChildCategoryIds(parentId: string, categories: Category[]): string[] {
  const childIds: string[] = [];
  const queue: string[] = [parentId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const directChildren = categories.filter(cat => cat.parentId === currentId);
    
    for (const child of directChildren) {
      if (!childIds.includes(child.id)) {
        childIds.push(child.id);
        queue.push(child.id);
      }
    }
  }

  return childIds;
}

/**
 * Build a nested tree structure of categories from a flat list.
 */
export function buildCategoryTree(categories: Category[]): (Category & { children?: Category[] })[] {
  const map = new Map<string, Category & { children?: Category[] }>();
  const roots: (Category & { children?: Category[] })[] = [];

  categories.forEach(cat => {
    map.set(cat.id, { ...cat, children: [] });
  });

  categories.forEach(cat => {
    const node = map.get(cat.id)!;
    if (cat.parentId && map.has(cat.parentId)) {
      const parent = map.get(cat.parentId)!;
      if (!parent.children) parent.children = [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}
