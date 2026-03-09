
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export function useSupabase<T>(
  tableName: string,
  initialValue: T[],
  idKey: string = 'id'
): [T[], React.Dispatch<React.SetStateAction<T[]>>] {
  const [data, setData] = useState<T[]>(initialValue);
  // Track the data that is currently known to be in the DB (or scheduled to be)
  const lastSyncedData = useRef<T[]>(initialValue);
  // Ref to track if sync is allowed. We disable it if the table doesn't exist or network fails.
  const syncEnabled = useRef<boolean>(true);
  // Ref to track if initial fetch is complete — prevents syncing dummy/initial data
  const initialFetchDone = useRef<boolean>(false);
  // Debounce timer ref — ensures only ONE sync fires after all rapid mutations settle
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref to always access the latest data without stale closures
  const dataRef = useRef<T[]>(initialValue);

  // Keep dataRef always in sync with the latest state
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Fetch initial data
  useEffect(() => {
    const fetch = async () => {
      try {
        // Prepare query
        let query = supabase.from(tableName).select('*');

        // Optimisation: For large tables, sort by timestamp desc
        if (tableName === 'test_results' || tableName === 'logs' || tableName === 'received_goods' || tableName === 'finished_goods') {
          query = query.order('timestamp', { ascending: false });
        }

        // Large range limit to prevent data loss (default is 1000)
        const { data: dbData, error } = await query.range(0, 50000);

        if (error) {
          if (error.code === 'PGRST205' || error.code === '42P01') {
            console.warn(`Supabase table '${tableName}' not found. Disabling sync. Using local data.`);
            syncEnabled.current = false;
          } else {
            throw error;
          }
        } else if (dbData) {
          setData(dbData as unknown as T[]);
          lastSyncedData.current = dbData as unknown as T[];
          dataRef.current = dbData as unknown as T[];
        }
        initialFetchDone.current = true;
      } catch (error: any) {
        console.warn(`[Offline Mode] Could not sync '${tableName}' with Supabase. Using local data. Error: ${error.message || 'Network request failed'}`);
        syncEnabled.current = false;
        initialFetchDone.current = true;
      }
    };
    fetch();
  }, [tableName]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (syncTimer.current) {
        clearTimeout(syncTimer.current);
      }
    };
  }, []);

  const syncToSupabase = async (newData: T[], oldData: T[]) => {
    if (!syncEnabled.current) return;

    const oldMap = new Map(oldData.map((item: any) => [String(item[idKey]), item]));
    const newIds = new Set(newData.map((item: any) => String(item[idKey])));

    // Find items to insert or update
    const toUpsert = newData.filter((item: any) => {
      const id = String(item[idKey]);
      const oldItem = oldMap.get(id);
      return !oldItem || JSON.stringify(item) !== JSON.stringify(oldItem);
    });

    // Find items to delete
    const toDeleteIds = oldData
      .filter((item: any) => !newIds.has(String(item[idKey])))
      .map((item: any) => String(item[idKey]));

    const CHUNK_SIZE = 100;

    const chunkArray = (arr: any[], size: number) => {
      return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
        arr.slice(i * size, i * size + size)
      );
    };

    try {
      if (toDeleteIds.length > 0) {
        // Safety: log what we're about to delete
        console.log(`[useSupabase:${tableName}] Deleting ${toDeleteIds.length} item(s)`);
        const chunks = chunkArray(toDeleteIds, CHUNK_SIZE);
        for (const chunk of chunks) {
          const { error } = await supabase.from(tableName).delete().in(idKey, chunk);
          if (error) {
            console.error(`Error deleting chunk in ${tableName}:`, error);
          }
        }
      }
      if (toUpsert.length > 0) {
        const chunks = chunkArray(toUpsert, CHUNK_SIZE);
        for (const chunk of chunks) {
          const { error } = await supabase.from(tableName).upsert(chunk);
          if (error) {
            console.error(`Error upserting chunk in ${tableName}:`, error);
          }
        }
      }
    } catch (error: any) {
      console.error(`Supabase sync error for ${tableName}:`, error.message || error);
    }
  };

  // Schedule a debounced sync — waits for mutations to settle before diffing
  const scheduleDebouncedSync = useCallback(() => {
    if (!syncEnabled.current || !initialFetchDone.current) return;

    // Clear any pending sync — only the latest state matters
    if (syncTimer.current) {
      clearTimeout(syncTimer.current);
    }

    syncTimer.current = setTimeout(() => {
      // Read the LATEST state from the ref (avoids stale closures entirely)
      const currentData = dataRef.current;
      const baseline = lastSyncedData.current;

      if (currentData !== baseline) {
        syncToSupabase(currentData, baseline);
        lastSyncedData.current = currentData;
      }
    }, 1500); // 1.5s debounce — allows rapid typing/mutations to accumulate
  }, [tableName, idKey]);

  const setSupabaseData = useCallback((action: React.SetStateAction<T[]>) => {
    setData(prev => {
      const newData = typeof action === 'function' ? (action as any)(prev) : action;
      return newData;
    });
    // Schedule a debounced sync instead of immediate Promise.resolve sync
    scheduleDebouncedSync();
  }, [scheduleDebouncedSync]);

  return [data, setSupabaseData];
}
