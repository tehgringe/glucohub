import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNightscout } from '../contexts/NightscoutContext';
import { NightscoutConfig, BloodGlucoseReading, Meal } from '../types/nightscout';
import { getChartDateRange, analyzeDataQuality, formatDateRange } from '../lib/dateUtils';
import { format } from 'date-fns';

interface ChartData {
  mbgData: Array<{ timestamp: number; value: number; type: 'mbg'; hour: number }>;
  sgvData: Array<{ timestamp: number; value: number; type: 'sgv'; hour: number }>;
  meals: Meal[];
  dateRange: ReturnType<typeof getChartDateRange>;
  dataQuality: ReturnType<typeof analyzeDataQuality>;
  isLoading: boolean;
  error: string | null;
  loading: boolean;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  showMBG: boolean;
  setShowMBG: (show: boolean) => void;
  showSGV: boolean;
  setShowSGV: (show: boolean) => void;
  showAvg: boolean;
  setShowAvg: (show: boolean) => void;
  boundLow: number;
  setBoundLow: (value: number) => void;
  boundHigh: number;
  setBoundHigh: (value: number) => void;
  avgSgv: number;
}

export function use24HourChartData(dateStr: string = format(new Date(), 'yyyy-MM-dd')): ChartData {
  const { config, nightscout } = useNightscout();
  const [data, setData] = useState<Omit<ChartData, 'loading' | 'selectedDate' | 'setSelectedDate' | 'showMBG' | 'setShowMBG' | 'showSGV' | 'setShowSGV' | 'showAvg' | 'setShowAvg' | 'boundLow' | 'setBoundLow' | 'boundHigh' | 'setBoundHigh' | 'avgSgv'>>({
    mbgData: [],
    sgvData: [],
    meals: [],
    dateRange: null as any,
    dataQuality: null as any,
    isLoading: true,
    error: null
  });

  // Add state for component controls
  const [selectedDate, setSelectedDate] = useState(dateStr);
  const [showMBG, setShowMBG] = useState(true);
  const [showSGV, setShowSGV] = useState(true);
  const [showAvg, setShowAvg] = useState(true);
  const [boundLow, setBoundLow] = useState(70);
  const [boundHigh, setBoundHigh] = useState(140);

  // Calculate average SGV
  const avgSgv = useMemo(() => {
    if (!data.sgvData.length) return 0;
    const sum = data.sgvData.reduce((acc, point) => acc + point.value, 0);
    return sum / data.sgvData.length;
  }, [data.sgvData]);

  const loadData = useCallback(async () => {
    if (!nightscout || !config) {
      setData(prev => ({ ...prev, isLoading: false, error: 'Nightscout client not initialized' }));
      return;
    }

    try {
      // Get validated date range
      const dateRange = getChartDateRange(selectedDate, config);
      setData(prev => ({ ...prev, dateRange, isLoading: true, error: null }));

      // Add high-priority debug log for SGV fetch window
      console.log('[SGV FETCH WINDOW] UTC:',
        new Date(dateRange.fetchRange.start.getTime()).toISOString(),
        'to',
        new Date(dateRange.fetchRange.end.getTime()).toISOString()
      );

      // Fetch data for the validated range
      const localDateString = (dateRange as any).localDateString;
      const [mbgData, sgvData, meals] = await Promise.all([
        nightscout.getBloodGlucoseReadingsInRange(
          dateRange.fetchRange.start.getTime(),
          dateRange.fetchRange.end.getTime(),
          localDateString
        ),
        nightscout.getSensorGlucoseReadingsInRange(
          dateRange.fetchRange.start.getTime(),
          dateRange.fetchRange.end.getTime(),
          localDateString
        ),
        nightscout.getMealEntriesInRange(
          dateRange.fetchRange.start.getTime(),
          dateRange.fetchRange.end.getTime(),
          localDateString
        )
      ]);

      // SGV/MBG: Use entry.date (ms UTC), convert to local time
      const localMbgData = mbgData.map((entry: BloodGlucoseReading) => {
        const utcDate = new Date(entry.date);
        const hour = utcDate.getHours() + utcDate.getMinutes() / 60;
        return {
          ...entry,
          timestamp: entry.date,
          value: entry.mbg || entry.value,
          type: 'mbg' as const,
          hour
        };
      });

      const localSgvData = sgvData.map((entry: BloodGlucoseReading) => {
        const utcDate = new Date(entry.date);
        const hour = utcDate.getHours() + utcDate.getMinutes() / 60;
        return {
          ...entry,
          timestamp: entry.date,
          value: entry.sgv || entry.value,
          type: 'sgv' as const,
          hour
        };
      });

      // Meals: Use meal.created_at (ISO UTC string), convert to local time
      const localMeals = meals.map((meal: Meal) => {
        if (!meal.created_at) {
          return meal;
        }
        const utcDate = new Date(meal.created_at);
        const hour = utcDate.getHours() + utcDate.getMinutes() / 60;
        return {
          ...meal,
          hour
        };
      });

      // Analyze data quality
      const dataQuality = analyzeDataQuality(localMbgData, localSgvData, dateRange);

      // Log data quality metrics
      if (dataQuality.hasGaps || dataQuality.unusualValues.length > 0 || dataQuality.timezoneIssues.length > 0) {
        // console.warn('Data quality issues detected:', {
        //   gaps: dataQuality.gapDetails,
        //   unusualValues: dataQuality.unusualValues,
        //   timezoneIssues: dataQuality.timezoneIssues,
        //   dataDensity: dataQuality.dataDensity
        // });
      }

      // Log data summary
      console.log('Chart data summary:', {
        dateRange: formatDateRange(dateRange),
        mbgCount: localMbgData.length,
        sgvCount: localSgvData.length,
        mealCount: localMeals.length,
        dataQuality: {
          coverage: `${dataQuality.dataDensity.coverage.toFixed(1)}%`,
          gaps: dataQuality.gapCount,
          unusualValues: dataQuality.unusualValues.length,
          timezoneIssues: dataQuality.timezoneIssues.length
        }
      });

      // After mapping, log only the first and last SGV points and all MBG points
      if (localSgvData.length > 0) {
        const first = localSgvData[0];
        const last = localSgvData[localSgvData.length - 1];
        const firstUtc = new Date(first.timestamp);
        const lastUtc = new Date(last.timestamp);
        console.log('[SGV] First:', {
          value: first.value,
          utc: firstUtc.toISOString(),
          local: firstUtc.toString()
        });
        console.log('[SGV] Last:', {
          value: last.value,
          utc: lastUtc.toISOString(),
          local: lastUtc.toString()
        });
      }
      if (localMbgData.length > 0) {
        localMbgData.forEach((mbg, i) => {
          const mbgUtc = new Date(mbg.timestamp);
          console.log(`[MBG] #${i + 1}:`, {
            value: mbg.value,
            utc: mbgUtc.toISOString(),
            local: mbgUtc.toString()
          });
        });
      }

      setData({
        mbgData: localMbgData,
        sgvData: localSgvData,
        meals: localMeals,
        dateRange,
        dataQuality,
        isLoading: false,
        error: null
      });
    } catch (err) {
      console.error('Error loading chart data:', err);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load chart data'
      }));
    }
  }, [selectedDate, config, nightscout]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    ...data,
    loading: data.isLoading,
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
    avgSgv
  };
} 