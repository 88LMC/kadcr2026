import { useMemo } from 'react';

interface Activity {
  id: string;
  prospect_id: string | null;
  activity_type: string;
  notes: string | null;
  scheduled_date: string;
  created_by: string | null;
  prospects?: {
    company_name: string;
    contact_name: string;
  } | null;
}

interface DeduplicationResult {
  activities: Activity[];
  removedCount: number;
  duplicateGroups: Array<{
    kept: Activity;
    removed: Activity[];
    reason: string;
  }>;
}

// Calcular similitud entre dos textos (0-1)
function textSimilarity(a: string | null, b: string | null): number {
  if (!a || !b) return a === b ? 1 : 0;
  
  const normalize = (s: string) => s.toLowerCase().trim();
  const normA = normalize(a);
  const normB = normalize(b);
  
  // Exacto
  if (normA === normB) return 1;
  
  // Contiene
  if (normA.includes(normB) || normB.includes(normA)) return 0.9;
  
  // Palabras en común
  const wordsA = new Set(normA.split(/\s+/));
  const wordsB = new Set(normB.split(/\s+/));
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  
  return intersection.size / union.size;
}

// Diferencia en días entre dos fechas
function daysDifference(date1: string, date2: string): number {
  const d1 = new Date(date1).getTime();
  const d2 = new Date(date2).getTime();
  return Math.abs((d1 - d2) / (1000 * 60 * 60 * 24));
}

// Determinar si dos actividades son duplicadas
function isDuplicate(a: Activity, b: Activity): { isDup: boolean; reason: string } {
  // REGLA 1: Mismo prospecto + tipo + notas similares + fechas cercanas
  if (a.prospect_id && a.prospect_id === b.prospect_id) {
    if (a.activity_type === b.activity_type) {
      const similarity = textSimilarity(a.notes, b.notes);
      const daysDiff = daysDifference(a.scheduled_date, b.scheduled_date);
      
      if (similarity >= 0.8 && daysDiff < 7) {
        return { 
          isDup: true, 
          reason: `Mismo prospecto, tipo y descripción similar (${Math.round(similarity * 100)}%)` 
        };
      }
    }
    
    // REGLA 2: Sistema vs Manual
    if (a.created_by === 'system' && b.created_by !== 'system') {
      const daysDiff = daysDifference(a.scheduled_date, b.scheduled_date);
      if (daysDiff < 3) {
        return { 
          isDup: true, 
          reason: 'Generada por sistema cuando ya existe actividad manual' 
        };
      }
    }
    
    if (b.created_by === 'system' && a.created_by !== 'system') {
      const daysDiff = daysDifference(a.scheduled_date, b.scheduled_date);
      if (daysDiff < 3) {
        return { 
          isDup: true, 
          reason: 'Generada por sistema cuando ya existe actividad manual' 
        };
      }
    }
  }
  
  // REGLA 3: Tareas generales con notas idénticas
  if (!a.prospect_id && !b.prospect_id) {
    const similarity = textSimilarity(a.notes, b.notes);
    const daysDiff = daysDifference(a.scheduled_date, b.scheduled_date);
    
    if (similarity === 1 && daysDiff < 3) {
      return { 
        isDup: true, 
        reason: 'Tarea general duplicada (notas idénticas)' 
      };
    }
  }
  
  return { isDup: false, reason: '' };
}

export function useDeduplicatedActivities(activities: Activity[]): DeduplicationResult {
  return useMemo(() => {
    const duplicateGroups: DeduplicationResult['duplicateGroups'] = [];
    const toRemove = new Set<string>();
    
    // Comparar todas las actividades entre sí
    for (let i = 0; i < activities.length; i++) {
      if (toRemove.has(activities[i].id)) continue;
      
      const removed: Activity[] = [];
      
      for (let j = i + 1; j < activities.length; j++) {
        if (toRemove.has(activities[j].id)) continue;
        
        const { isDup, reason } = isDuplicate(activities[i], activities[j]);
        
        if (isDup) {
          // Decidir cuál mantener y cuál eliminar
          let kept = activities[i];
          let duplicate = activities[j];
          
          // Priorizar manual sobre sistema
          if (duplicate.created_by !== 'system' && kept.created_by === 'system') {
            [kept, duplicate] = [duplicate, kept];
          }
          
          // Priorizar más antigua (primera creada)
          if (kept.created_by === duplicate.created_by) {
            const keptDate = new Date(kept.scheduled_date);
            const dupDate = new Date(duplicate.scheduled_date);
            if (dupDate < keptDate) {
              [kept, duplicate] = [duplicate, kept];
            }
          }
          
          toRemove.add(duplicate.id);
          removed.push(duplicate);
        }
      }
      
      if (removed.length > 0) {
        duplicateGroups.push({
          kept: activities[i],
          removed,
          reason: isDuplicate(activities[i], removed[0]).reason,
        });
      }
    }
    
    // Filtrar actividades no duplicadas
    const deduplicated = activities.filter(a => !toRemove.has(a.id));
    
    return {
      activities: deduplicated,
      removedCount: toRemove.size,
      duplicateGroups,
    };
  }, [activities]);
}
