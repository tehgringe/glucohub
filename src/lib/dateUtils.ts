import { format, addDays, subDays, parseISO, startOfDay, endOfDay, addHours, subHours, addMinutes, isWithinInterval, differenceInDays } from 'date-fns';
import { formatInTimeZone, toZonedTime, getTimezoneOffset as getTzOffset } from 'date-fns-tz';
import { NightscoutConfig } from '../types/nightscout';

// Constants for validation
const MAX_TIMEZONE_OFFSET = 14 * 60; // 14 hours in minutes
const MIN_TIMEZONE_OFFSET = -12 * 60; // -12 hours in minutes
const MAX_FETCH_DAYS = 3; // Maximum days to fetch for any timezone
const MIN_DATA_POINTS = 24; // Minimum data points expected per day

export interface DateRange {
  start: Date;
  end: Date;
  // The date in local time that this range represents
  localDate: Date;
  // The timezone offset in minutes
  timezoneOffset: number;
}

export interface ChartDateRange extends DateRange {
  // The date range to fetch from Nightscout (may be wider than start/end to account for timezone)
  fetchRange: {
    start: Date;
    end: Date;
  };
  // Additional metadata for validation
  metadata: {
    isDSTTransition: boolean;
    daysToFetch: number;
    expectedDataPoints: number;
    timezoneName: string;
  };
}

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

/**
 * Get a safe timezone offset, with validation and fallbacks
 */
export function getSafeTimezoneOffset(config: NightscoutConfig | null): number {
  try {
    if (!config?.timezone) {
      return new Date().getTimezoneOffset();
    }

    if (config.timezone.useBrowserTimezone) {
      const browserOffset = new Date().getTimezoneOffset();
      if (isValidTimezoneOffset(browserOffset)) {
        return browserOffset;
      }
      // console.warn('Invalid browser timezone offset, using fallback');
      return 0; // Fallback to UTC
    }

    const manualOffset = config.timezone.manualOffset;
    if (manualOffset === undefined || !isValidTimezoneOffset(manualOffset)) {
      // console.warn('Invalid manual timezone offset, using fallback');
      return 0; // Fallback to UTC
    }

    return manualOffset;
  } catch (err) {
    // console.error('Error getting timezone offset:', err);
    return 0; // Fallback to UTC
  }
}

/**
 * Validate a timezone offset
 */
function isValidTimezoneOffset(offset: number): boolean {
  return offset >= MIN_TIMEZONE_OFFSET && 
         offset <= MAX_TIMEZONE_OFFSET && 
         Number.isInteger(offset);
}

/**
 * Check if a date range includes a DST transition
 */
function hasDSTTransition(start: Date, end: Date, timezone: string): boolean {
  try {
    // getTzOffset(timezone, date) - timezone is first parameter
    const startOffset = getTzOffset(timezone, start);
    const endOffset = getTzOffset(timezone, end);
    return startOffset !== endOffset;
  } catch (err) {
    // console.warn('Error checking DST transition:', err);
    return false;
  }
}

/**
 * Calculate the number of days needed to fetch based on timezone
 */
function calculateFetchDays(timezoneOffset: number): number {
  const offsetHours = Math.abs(timezoneOffset) / 60;
  // Add extra days for large timezone offsets
  return Math.min(MAX_FETCH_DAYS, Math.ceil(offsetHours / 12) + 1);
}

/**
 * Validate a chart date range
 */
export function validateDateRange(range: ChartDateRange): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check date validity
  if (isNaN(range.start.getTime()) || isNaN(range.end.getTime())) {
    issues.push('Invalid date range: dates are not valid');
  }

  // Check timezone offset
  if (!isValidTimezoneOffset(range.timezoneOffset)) {
    issues.push(`Invalid timezone offset: ${range.timezoneOffset}`);
  }

  // Check fetch range
  const fetchDays = differenceInDays(range.fetchRange.end, range.fetchRange.start);
  if (fetchDays > MAX_FETCH_DAYS) {
    issues.push(`Fetch range too large: ${fetchDays} days`);
  }

  // Check DST transition
  if (range.metadata.isDSTTransition) {
    issues.push('Date range includes DST transition');
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Get the YYYY-MM-DD string for a local date (for API filtering)
 */
export function getLocalDateString(date: Date): string {
  // Always use the local date, not UTC
  return format(date, 'yyyy-MM-dd');
}

/**
 * Get the date range for a chart, with enhanced validation and safety checks
 */
export function getChartDateRange(dateStr: string, config: NightscoutConfig | null): ChartDateRange {
  // Get safe timezone offset
  const timezoneOffset = getSafeTimezoneOffset(config);
  console.log('[DEBUG] getChartDateRange timezoneOffset:', timezoneOffset);
  const timezoneName = config?.timezone?.name || Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Parse the selected date in local time
  const localDate = parseISO(dateStr);
  if (isNaN(localDate.getTime())) {
    throw new Error(`Invalid date string: ${dateStr}`);
  }
  
  // Calculate the start and end of the local day
  const localStart = startOfDay(localDate);
  const localEnd = endOfDay(localDate);
  
  // Convert to UTC by ADDING the timezone offset (in minutes)
  const utcStart = addMinutes(localStart, timezoneOffset);
  const utcEnd = addMinutes(localEnd, timezoneOffset);

  // For most timezones, fetch window is just the UTC-mapped local day
  // Only widen if offset is extreme (e.g., >12 hours)
  let fetchStart = utcStart;
  let fetchEnd = utcEnd;
  let daysToFetch = 1;
  if (Math.abs(timezoneOffset) > 12 * 60) {
    // For UTC+13/14 or UTC-12, widen by 1 day on each side
    fetchStart = subDays(utcStart, 1);
    fetchEnd = addDays(utcEnd, 1);
    daysToFetch = 3;
  }

  // Check for DST transition
  const isDSTTransition = hasDSTTransition(fetchStart, fetchEnd, timezoneName);

  const range: ChartDateRange = {
    start: localStart,
    end: localEnd,
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

  // Attach the local date string for filtering
  (range as any).localDateString = getLocalDateString(localDate);

  // Validate the range
  const { isValid, issues } = validateDateRange(range);
  if (!isValid) {
    // console.warn('Date range validation issues:', issues);
  }

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