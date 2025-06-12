import React from 'react';
import { MacroPieChart } from './MacroPieChart';
import { Meal } from '../../types/nightscout';
import { format, isSameDay, startOfWeek, addDays, isWithinInterval } from 'date-fns';

interface MacroPieSummaryProps {
  meals: Meal[];
  mode: 'daily' | 'weekly';
  date?: string; // 'YYYY-MM-DD' for daily
  weekStart?: string; // 'YYYY-MM-DD' for weekly
}

export const MacroPieSummary: React.FC<MacroPieSummaryProps> = ({ meals, mode, date, weekStart }) => {
  if (!meals || meals.length === 0) return <div>No meal data.</div>;

  if (mode === 'daily') {
    const day = date ? new Date(date) : new Date();
    const dayMeals = meals.filter(m => m.created_at && isSameDay(new Date(m.created_at), day));
    const macros = dayMeals.reduce(
      (acc, m) => ({
        carbs: acc.carbs + (Number(m.carbs) || 0),
        protein: acc.protein + (Number(m.protein) || 0),
        fat: acc.fat + (Number(m.fat) || 0),
      }),
      { carbs: 0, protein: 0, fat: 0 }
    );
    return (
      <div style={{ margin: 16 }}>
        <MacroPieChart {...macros} label={format(day, 'EEEE, MMM d yyyy')} />
      </div>
    );
  }

  // Weekly mode
  const weekStartDate = weekStart ? new Date(weekStart) : startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));
  return (
    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', margin: 16 }}>
      {days.map(day => {
        const dayMeals = meals.filter(m => m.created_at && isSameDay(new Date(m.created_at), day));
        const macros = dayMeals.reduce(
          (acc, m) => ({
            carbs: acc.carbs + (Number(m.carbs) || 0),
            protein: acc.protein + (Number(m.protein) || 0),
            fat: acc.fat + (Number(m.fat) || 0),
          }),
          { carbs: 0, protein: 0, fat: 0 }
        );
        return (
          <MacroPieChart
            key={day.toISOString()}
            {...macros}
            label={format(day, 'EEE, MMM d')}
          />
        );
      })}
    </div>
  );
}; 