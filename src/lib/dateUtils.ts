import { fromZonedTime, getTimezoneOffset } from 'date-fns-tz';
import { startOfDay, endOfDay, differenceInDays, format } from 'date-fns';
import { NightscoutConfig } from '../types/nightscout';

const MAX_FETCH_DAYS = 2;
const MIN_DATA_POINTS = 24;

export interface DataQualityMetrics {
  hasGaps: boolean;
  gapCount: number;
  gapDetails: Array<{
    start: Date;
    end: Date;
    duration: number; // in minutes
  }>;
  unusualValues: Array<{
    timestamp: number;
    value: number;
    type: 'mbg' | 'sgv';
    reason: string;
  }>;
  timezoneIssues: Array<{
    type: 'DST' | 'Offset' | 'Range';
    description: string;
  }>;
  dataDensity: {
    expected: number;
    actual: number;
    coverage: number; // percentage
  };
}

export interface DateRange {
  start: Date;
  end: Date;
  localDate: Date;
  timezoneOffset: number;
}

export interface ChartDateRange extends DateRange {
  fetchRange: {
    start: Date;
    end: Date;
  };
  metadata: {
    isDSTTransition: boolean;
    daysToFetch: number;
    expectedDataPoints: number;
    timezoneName: string;
  };
}

function isValidTimezoneOffset(offset: number): boolean {
  return offset >= -720 && offset <= 840 && Number.isInteger(offset);
}

function getSafeTimezoneOffset(config: NightscoutConfig | null): number {
  if (!config?.timezone) return new Date().getTimezoneOffset();

  if (config.timezone.useBrowserTimezone) {
    const offset = new Date().getTimezoneOffset();
    return isValidTimezoneOffset(offset) ? offset : 0;
  }

  const manualOffset = config.timezone.manualOffset ?? 0;
  return isValidTimezoneOffset(manualOffset) ? manualOffset : 0;
}

function hasDSTTransition(start: Date, end: Date, timezone: string): boolean {
  const startOffset = getTimezoneOffset(timezone, start);
  const endOffset = getTimezoneOffset(timezone, end);
  return startOffset !== endOffset;
}

export function getLocalDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function getChartDateRange(dateStr: string, config: NightscoutConfig | null): ChartDateRange {
  const timezoneName = config?.timezone?.name || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Step 1: Convert 'dateStr' + times into UTC Date using actual TZ logic
  const utcStart = fromZonedTime(`${dateStr}T00:00:00`, timezoneName);
  const utcEnd = fromZonedTime(`${dateStr}T23:59:59.999`, timezoneName);

  // Step 2: Calculate timezone offset for metadata
  const timezoneOffset = getTimezoneOffset(timezoneName, utcStart);

  // Step 3: Create fetch window in UTC (span full UTC days)
  const fetchStart = startOfDay(utcStart);
  const fetchEnd = endOfDay(utcEnd);
  const daysToFetch = differenceInDays(fetchEnd, fetchStart) + 1;

  // Step 4: Check DST
  const isDSTTransition = hasDSTTransition(fetchStart, fetchEnd, timezoneName);

  // Step 5: Build the full ChartDateRange object
  const localDate = new Date(dateStr);

  const range: ChartDateRange = {
    start: utcStart,
    end: utcEnd,
    localDate,
    timezoneOffset,
    fetchRange: {
      start: fetchStart,
      end: fetchEnd
    },
    metadata: {
      isDSTTransition,
      daysToFetch,
      expectedDataPoints: MIN_DATA_POINTS * daysToFetch,
      timezoneName
    }
  };

  (range as any).localDateString = getLocalDateString(localDate);

  return range;
}

/**
 * Analyze data quality for a set of chart data
 */
export function analyzeDataQuality(
  mbgData: Array<{ timestamp: number; value: number; type: 'mbg' }>,
  sgvData: Array<{ timestamp: number; value: number; type: 'sgv' }>,
  dateRange: ChartDateRange
): DataQualityMetrics {
  const metrics: DataQualityMetrics = {
    hasGaps: false,
    gapCount: 0,
    gapDetails: [],
    unusualValues: [],
    timezoneIssues: [],
    dataDensity: {
      expected: dateRange.metadata.expectedDataPoints,
      actual: mbgData.length + sgvData.length,
      coverage: 0
    }
  };

  // Check for DST issues
  if (dateRange.metadata.isDSTTransition) {
    metrics.timezoneIssues.push({
      type: 'DST',
      description: 'Data range includes DST transition'
    });
  }

  // Check timezone offset
  if (!isValidTimezoneOffset(dateRange.timezoneOffset)) {
    metrics.timezoneIssues.push({
      type: 'Offset',
      description: `Invalid timezone offset: ${dateRange.timezoneOffset}`
    });
  }

  // Analyze gaps in data
  const allData = [...mbgData, ...sgvData].sort((a, b) => a.timestamp - b.timestamp);
  const maxGapMinutes = 30; // Maximum acceptable gap in minutes

  for (let i = 1; i < allData.length; i++) {
    const gap = (allData[i].timestamp - allData[i - 1].timestamp) / (60 * 1000);
    if (gap > maxGapMinutes) {
      metrics.hasGaps = true;
      metrics.gapCount++;
      metrics.gapDetails.push({
        start: new Date(allData[i - 1].timestamp),
        end: new Date(allData[i].timestamp),
        duration: gap
      });
    }
  }

  // Check for unusual values
  const checkUnusualValue = (point: { timestamp: number; value: number; type: 'mbg' | 'sgv' }) => {
    if (point.value < 40 || point.value > 400) {
      metrics.unusualValues.push({
        ...point,
        reason: 'Value outside normal range (40-400)'
      });
    }
  };

  mbgData.forEach(checkUnusualValue);
  sgvData.forEach(checkUnusualValue);

  // Calculate data density
  metrics.dataDensity.coverage = 
    (metrics.dataDensity.actual / metrics.dataDensity.expected) * 100;

  return metrics;
}

/**
 * Convert a timestamp to a local hour (0-24) accounting for timezone
 */
export function getLocalHour(timestamp: number, timezoneOffset: number, isSeconds: boolean = false): number {
  try {
    // Convert to milliseconds if needed
    const msTimestamp = isSeconds ? timestamp * 1000 : timestamp;
    // Adjust timestamp for timezone offset (convert from UTC to local)
    const localTimestamp = msTimestamp + (timezoneOffset * 60 * 1000);
    const date = new Date(localTimestamp);
    if (isNaN(date.getTime())) {
      // console.warn('Invalid date in getLocalHour:', timestamp, isSeconds ? '(seconds)' : '(milliseconds)');
      return 0;
    }
    return date.getHours() + (date.getMinutes() / 60);
  } catch (err) {
    // console.warn('Error in getLocalHour:', err);
    return 0;
  }
}

/**
 * Safely format a date to ISO string
 */
export function safeFormatDate(timestamp: number, isSeconds: boolean = false): string {
  try {
    const msTimestamp = isSeconds ? timestamp * 1000 : timestamp;
    const date = new Date(msTimestamp);
    if (isNaN(date.getTime())) {
      // console.warn('Invalid date:', timestamp, isSeconds ? '(seconds)' : '(milliseconds)');
      return 'Invalid Date';
    }
    return date.toISOString();
  } catch (err) {
    // console.warn('Error formatting date:', err);
    return 'Invalid Date';
  }
}

/**
 * Format a date range for logging, with enhanced information
 */
export function formatDateRange(range: DateRange): {
  local: { start: string; end: string };
  utc: { start: string; end: string };
  timezoneOffset: number;
  metadata?: ChartDateRange['metadata'];
} {
  return {
    local: {
      start: safeFormatDate(range.start.getTime()),
      end: safeFormatDate(range.end.getTime())
    },
    utc: {
      start: safeFormatDate(range.start.getTime() - (range.timezoneOffset * 60 * 1000)),
      end: safeFormatDate(range.end.getTime() - (range.timezoneOffset * 60 * 1000))
    },
    timezoneOffset: range.timezoneOffset,
    metadata: (range as ChartDateRange).metadata
  };
} 