import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as checklistService from '../services/checklist';

const REFRESH_INTERVAL = 20000; // 20 seconds

export function useChecklist(taskId) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  // Load checklist items
  const loadItems = useCallback(async () => {
    if (!taskId) return;
    
    try {
      const data = await checklistService.listChecklist(taskId);
      setItems(data.items || data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load checklist:', err);
      setError(err?.response?.data?.error?.message || 'Failed to load checklist');
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  // Initial load
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Auto-refresh every 20 seconds
  useEffect(() => {
    if (!taskId) return;
    
    const interval = setInterval(() => {
      loadItems();
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [taskId, loadItems]);

  // Add item with optimistic update
  const addItem = useCallback(async (label, position = 0) => {
    if (!taskId || !label.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticItem = {
      id: tempId,
      label: label.trim(),
      done: false,
      position,
      created_at: new Date().toISOString()
    };

    // Optimistic update
    setItems(prev => [...prev, optimisticItem]);

    try {
      const newItem = await checklistService.addChecklistItem(taskId, label.trim(), position);
      // Replace temp item with real one
      setItems(prev => prev.map(item => item.id === tempId ? newItem : item));
      queryClient.invalidateQueries(['task', taskId]);
    } catch (err) {
      console.error('Failed to add checklist item:', err);
      // Rollback on error
      setItems(prev => prev.filter(item => item.id !== tempId));
      throw err;
    }
  }, [taskId, queryClient]);

  // Toggle item with optimistic update
  const toggleItem = useCallback(async (itemId) => {
    if (!taskId || !itemId) return;

    const originalItems = [...items];
    
    // Optimistic update
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          done: !item.done,
          done_at: !item.done ? new Date().toISOString() : null
        };
      }
      return item;
    }));

    try {
      await checklistService.toggleChecklistItem(taskId, itemId);
      // Refresh to get server state
      await loadItems();
      queryClient.invalidateQueries(['task', taskId]);
    } catch (err) {
      console.error('Failed to toggle checklist item:', err);
      // Rollback on error
      setItems(originalItems);
      throw err;
    }
  }, [taskId, items, loadItems, queryClient]);

  // Delete item with optimistic update
  const deleteItem = useCallback(async (itemId) => {
    if (!taskId || !itemId) return;

    const originalItems = [...items];
    
    // Optimistic update
    setItems(prev => prev.filter(item => item.id !== itemId));

    try {
      await checklistService.deleteChecklistItem(taskId, itemId);
      queryClient.invalidateQueries(['task', taskId]);
    } catch (err) {
      console.error('Failed to delete checklist item:', err);
      // Rollback on error
      setItems(originalItems);
      throw err;
    }
  }, [taskId, items, queryClient]);

  // Reorder items with optimistic update
  const reorderItems = useCallback(async (newOrder) => {
    if (!taskId || !newOrder || newOrder.length === 0) return;

    const originalItems = [...items];
    
    // Optimistic update
    const reordered = newOrder.map(id => items.find(item => item.id === id)).filter(Boolean);
    setItems(reordered);

    try {
      await checklistService.reorderChecklist(taskId, newOrder);
      queryClient.invalidateQueries(['task', taskId]);
    } catch (err) {
      console.error('Failed to reorder checklist:', err);
      // Rollback on error
      setItems(originalItems);
      throw err;
    }
  }, [taskId, items, queryClient]);

  return {
    items,
    isLoading,
    error,
    addItem,
    toggleItem,
    deleteItem,
    reorderItems,
    refresh: loadItems
  };
}
