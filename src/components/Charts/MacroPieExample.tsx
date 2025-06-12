import React from 'react';
import { MacroPieSummary } from './MacroPieSummary';
import { Meal } from '../../types/nightscout';

// Mock meal data for demonstration
const mockMeals: Meal[] = [
  {
    id: '1',
    name: 'Breakfast',
    carbs: 45,
    protein: 20,
    fat: 15,
    notes: 'Oatmeal and eggs',
    timestamp: Date.parse('2024-06-10T08:00:00Z'),
    foodItems: [],
    synced: true,
    created_at: '2024-06-10T08:00:00Z',
  },
  {
    id: '2',
    name: 'Lunch',
    carbs: 60,
    protein: 30,
    fat: 25,
    notes: 'Chicken and rice',
    timestamp: Date.parse('2024-06-10T12:30:00Z'),
    foodItems: [],
    synced: true,
    created_at: '2024-06-10T12:30:00Z',
  },
  {
    id: '3',
    name: 'Dinner',
    carbs: 55,
    protein: 35,
    fat: 20,
    notes: 'Salmon and potatoes',
    timestamp: Date.parse('2024-06-10T18:45:00Z'),
    foodItems: [],
    synced: true,
    created_at: '2024-06-10T18:45:00Z',
  },
  {
    id: '4',
    name: 'Breakfast',
    carbs: 40,
    protein: 18,
    fat: 12,
    notes: 'Toast and peanut butter',
    timestamp: Date.parse('2024-06-11T08:10:00Z'),
    foodItems: [],
    synced: true,
    created_at: '2024-06-11T08:10:00Z',
  },
  {
    id: '5',
    name: 'Lunch',
    carbs: 65,
    protein: 28,
    fat: 22,
    notes: 'Turkey sandwich',
    timestamp: Date.parse('2024-06-11T13:00:00Z'),
    foodItems: [],
    synced: true,
    created_at: '2024-06-11T13:00:00Z',
  },
  {
    id: '6',
    name: 'Dinner',
    carbs: 50,
    protein: 32,
    fat: 18,
    notes: 'Pasta and meatballs',
    timestamp: Date.parse('2024-06-11T19:00:00Z'),
    foodItems: [],
    synced: true,
    created_at: '2024-06-11T19:00:00Z',
  },
];

export const MacroPieExample: React.FC = () => {
  return (
    <div style={{ padding: 32 }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Macro Pie Chart Example</h2>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Daily Summary (2024-06-10)</h3>
      <MacroPieSummary meals={mockMeals} mode="daily" date="2024-06-10" />
      <h3 style={{ fontSize: 18, fontWeight: 600, margin: '32px 0 12px' }}>Weekly Summary (week of 2024-06-10)</h3>
      <MacroPieSummary meals={mockMeals} mode="weekly" weekStart="2024-06-10" />
    </div>
  );
}; 