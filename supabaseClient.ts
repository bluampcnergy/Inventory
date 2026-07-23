
import { createClient } from '@supabase/supabase-js';

// Ultra-safe environment variable access
const getEnv = (key: string) => {
  try {
    // Check if import.meta exists and has env
    if (import.meta && (import.meta as any).env) {
      return (import.meta as any).env[key];
    }
    // Fallback for some process.env environments
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
  } catch (e) {
    return undefined;
  }
  return undefined;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || "https://ofnwuifgzqjmmnsqsoed.supabase.co";
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY') || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mbnd1aWZnenFqbW1uc3Fzb2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MDQwODQsImV4cCI6MjEwMDM4MDA4NH0.J-EU8aFvlj1o6sMoWWJUJKbp8buMo4V8AbAmT7KkTz8";

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials missing. App may not function correctly.');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');
