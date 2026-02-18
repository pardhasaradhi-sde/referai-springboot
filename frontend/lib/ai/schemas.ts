/**
 * Compatibility type definitions for PersonaCard and landing demo components.
 * These mirror the old Supabase-era MatchResult shape.
 */

export interface Persona {
  id: string;
  name: string;
  role: string;
  company: string;
  skills: string[];
  bio?: string;
}

export interface MatchResult {
  persona: Persona;
  score: number;
  sharedSkills: string[];
  explanation: string;
}
