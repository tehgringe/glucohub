import { useEffect, useState, useMemo } from 'react';
import { useNightscout } from '../contexts/NightscoutContext';
import { format, addDays, subDays, parseISO, startOfDay, endOfDay } from 'date-fns';
import { formatInTimeZone, toZonedTime, getTimezoneOffset } from 'date-fns-tz';
import { BloodGlucoseReading, Meal } from '../types/nightscout';

export interface ChartDataPoint {
  timestamp: number;
  hour: number;
  value: number;
  type: string;
}

export function use24HourChartData() {
  const { nightscout, config } = useNightscout();
  const [mbgData, setMbgData] = useState<ChartDataPoint[]>([]);
  const [sgvData, setSgvData] = useState<ChartDataPoint[]>([]);
  const [mealData, setMealData] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [showMBG, setShowMBG] = useState(true);
  const [showSGV, setShowSGV] = useState(true);
  const [showAvg, setShowAvg] = useState(true);
  const [boundLow, setBoundLow] = useState(70);
  const [boundHigh, setBoundHigh] = useState(140);

  const getJwtToken = async () => {
    if (!nightscout) return null;
    try {
      return await nightscout.getJwtToken();
    } catch {
      return null;
    }
  };

  // Helper function to safely parse a date
  const safeParseDate = (dateStr: string | number): Date | null => {
    try {
      if (typeof dateStr === 'string') {
        // Handle ISO strings
        if (dateStr.includes('T')) {
          return new Date(dateStr);
        }
        // Handle numeric strings
        const num = Number(dateStr);
        if (!isNaN(num)) {
          return new Date(num);
        }
      } else if (typeof dateStr === 'number') {
        return new Date(dateStr);
      }
      console.warn('Invalid date format:', dateStr);
      return null;
    } catch (err) {
      console.warn('Error parsing date:', dateStr, err);
      return null;
    }
  };

  // Helper function to get date boundaries
  const getDateBoundaries = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date string: ${dateStr}`);
      }
      
      // Get the previous and next day to ensure we have complete coverage
      const prevDate = format(subDays(date, 1), 'yyyy-MM-dd');
      const nextDate = format(addDays(date, 1), 'yyyy-MM-dd');
      
      console.log('Date range:', {
        prevDate,
        selectedDate: dateStr,
        nextDate,
        parsedDate: date.toISOString()
      });
      
      return {
        prevDate,
        selectedDate: dateStr,
        nextDate
      };
    } catch (err) {
      console.error('Error in getDateBoundaries:', err);
      // Fallback to current date if there's an error
      const today = format(new Date(), 'yyyy-MM-dd');
      return {
        prevDate: today,
        selectedDate: today,
        nextDate: today
      };
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!nightscout || !config) {
        setError('Nightscout client not initialized');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const { prevDate, selectedDate: dateToFetch, nextDate } = getDateBoundaries(selectedDate);
        const baseUrl = config.nightscoutUrl.replace(/\/$/, '');
        const jwt = await getJwtToken();
        if (!jwt) throw new Error('Failed to get Nightscout JWT token');
        
        const headers = {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        };

        // Fetch data for all three days to ensure complete coverage
        const getUrls = (type: string, field: string) => {
          return [
            `${baseUrl}/api/v3/${type}?limit=1000&skip=0&fields=_all&${field}$re=^${prevDate}`,
            `${baseUrl}/api/v3/${type}?limit=1000&skip=0&fields=_all&${field}$re=^${dateToFetch}`,
            `${baseUrl}/api/v3/${type}?limit=1000&skip=0&fields=_all&${field}$re=^${nextDate}`
          ];
        };

        const mbgUrls = getUrls('entries', 'dateString');
        const sgvUrls = getUrls('entries', 'dateString');
        const mealUrls = getUrls('treatments', 'created_at');

        // Fetch all data
        const [mbgResponses, sgvResponses, mealResponses] = await Promise.all([
          Promise.all(mbgUrls.map(url => fetch(url, { headers }))),
          Promise.all(sgvUrls.map(url => fetch(url, { headers }))),
          Promise.all(mealUrls.map(url => fetch(url, { headers })))
        ]);

        // Process responses
        const processResponses = async (responses: Response[], type: string) => {
          const results = await Promise.all(responses.map(r => r.json()));
          const allEntries = results.flatMap(r => r.result || []);
          
          // Filter to only include entries for the selected date
          return allEntries.filter(entry => {
            if (!entry.date) {
              console.warn('Entry missing date:', entry);
              return false;
            }
            
            const entryDate = safeParseDate(entry.date);
            if (!entryDate) {
              console.warn('Could not parse entry date:', entry.date);
              return false;
            }
            
            const entryDateStr = format(entryDate, 'yyyy-MM-dd');
            return entryDateStr === dateToFetch;
          });
        };

        const [mbgEntries, sgvEntries, mealEntries] = await Promise.all([
          processResponses(mbgResponses, 'mbg'),
          processResponses(sgvResponses, 'sgv'),
          processResponses(mealResponses, 'meal')
        ]);

        // Transform data points
        const mbgChartData = mbgEntries
          .filter(r => r.type === 'mbg')
          .map((r: any) => {
            const date = safeParseDate(r.date);
            if (!date) {
              console.warn('Invalid MBG date:', r.date);
              return null;
            }
            return {
              timestamp: r.date,
              hour: date.getHours() + date.getMinutes() / 60,
              value: Math.max(1, r.mbg || r.value),
              type: 'mbg',
            };
          })
          .filter((point): point is ChartDataPoint => point !== null)
          .sort((a, b) => a.timestamp - b.timestamp);

        const sgvChartData = sgvEntries
          .filter(r => r.type === 'sgv')
          .map((r: any) => {
            const date = safeParseDate(r.date);
            if (!date) {
              console.warn('Invalid SGV date:', r.date);
              return null;
            }
            return {
              timestamp: r.date,
              hour: date.getHours() + date.getMinutes() / 60,
              value: Math.max(1, r.sgv || r.value),
              type: 'sgv',
            };
          })
          .filter((point): point is ChartDataPoint => point !== null)
          .sort((a, b) => a.timestamp - b.timestamp);

        const meals = mealEntries
          .filter(r => r.eventType === 'Meal')
          .map((r: any): Meal | null => {
            if (!r.date) {
              console.warn('[Meal Missing Date]', r);
              return null;
            }
            
            const timestamp = safeParseDate(r.date);
            if (!timestamp) {
              console.warn('Invalid meal date:', r.date);
              return null;
            }
            
            // Extract food items from notes if available
            const foodItems = r.notes ? [{
              id: r._id,
              name: r.notes.split('\n')[0] || 'Unknown Food',
              carbs: r.carbs || 0,
              protein: r.protein || 0,
              fat: r.fat || 0,
              notes: r.notes
            }] : [];

            return {
              id: r._id,
              name: r.notes?.split('\n')[0] || 'Meal',
              timestamp: timestamp.getTime(),
              carbs: r.carbs || 0,
              protein: r.protein || 0,
              fat: r.fat || 0,
              notes: r.notes || '',
              foodItems: foodItems,
              synced: true,
              nightscoutId: r._id
            };
          })
          .filter((meal): meal is Meal => meal !== null)
          .sort((a, b) => a.timestamp - b.timestamp);

        setMbgData(mbgChartData);
        setSgvData(sgvChartData);
        setMealData(meals);

        // Log some debug info
        if (sgvEntries.length > 0) {
          const firstDate = safeParseDate(sgvEntries[0].date);
          const lastDate = safeParseDate(sgvEntries[sgvEntries.length - 1].date);
          console.log('SGV date range:', {
            first: firstDate?.toISOString(),
            last: lastDate?.toISOString(),
            count: sgvEntries.length
          });
        }
        if (mbgEntries.length > 0) {
          const firstDate = safeParseDate(mbgEntries[0].date);
          const lastDate = safeParseDate(mbgEntries[mbgEntries.length - 1].date);
          console.log('MBG date range:', {
            first: firstDate?.toISOString(),
            last: lastDate?.toISOString(),
            count: mbgEntries.length
          });
        }

      } catch (err) {
        console.error('Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [nightscout, config, selectedDate]);

  const avgSgv = useMemo(() => {
    if (!sgvData.length) return 0;
    const sum = sgvData.reduce((acc, curr) => acc + curr.value, 0);
    return sum / sgvData.length;
  }, [sgvData]);

  return {
    mbgData,
    sgvData,
    mealData,
    loading,
    error,
    selectedDate,
    setSelectedDate,
    showMBG,
    setShowMBG,
    showSGV,
    setShowSGV,
    showAvg,
    setShowAvg,
    boundLow,
    setBoundLow,
    boundHigh,
    setBoundHigh,
    avgSgv,
  };
} 