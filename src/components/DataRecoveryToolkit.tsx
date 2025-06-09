import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { format, addDays, subDays, parseISO, startOfDay, endOfDay, isToday } from 'date-fns';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { v4 as uuidv4 } from 'uuid';
import { useNightscout } from '../contexts/NightscoutContext';
import { SQLiteService, TableInfo, TableRow as TableRowType } from '../lib/sqliteService';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import MuiTableRow from '@mui/material/TableRow';
import { scaleLog, scaleLinear } from '@visx/scale';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { Group } from '@visx/group';
import { Circle } from '@visx/shape';
import IconButton from '@mui/material/IconButton';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

// Simulated SGV data fetcher (fallback)
function simulateFetchSgvEntries(startDate: string, endDate: string) {
  const entries = [];
  let current = parseISO(startDate).getTime();
  const end = parseISO(endDate).getTime();
  while (current < end) {
    if (current < parseISO(startDate).getTime() + 10 * 60 * 60 * 1000 || current > parseISO(startDate).getTime() + 12.5 * 60 * 60 * 1000) {
      entries.push({
        _id: uuidv4(),
        date: current,
        sgv: 100 + Math.round(Math.random() * 40),
        direction: 'Flat',
        device: 'simulator',
        type: 'sgv',
      });
    }
    current += 5 * 60 * 1000;
  }
  return entries;
}

function mapBgReadingToSgv(bg: any, template: any) {
  return {
    sgv: bg.calculated_value,
    date: bg.timestamp,
    direction: bg.direction || template.direction,
    device: bg.device || template.device,
    type: 'sgv',
  };
}

// Chart for visualizing BgReadings for a single day
const BgReadingsDayChart: React.FC<{
  readings: any[];
  selectedDate: string;
  onDateChange: (date: string) => void;
}> = ({ readings, selectedDate, onDateChange }) => {
  const width = 900;
  const height = 400;
  const margin = { top: 40, right: 40, bottom: 60, left: 60 };
  const palette = {
    primary: "#2563eb",
    accent: "#14b8a6",
    bg: "#f8fafc",
    border: "#e5e7eb",
    text: "#111827",
    danger: "#ef4444",
    muted: "#6b7280",
  };
  // Filter readings for the selected day
  const dayStart = startOfDay(parseISO(selectedDate)).getTime();
  const dayEnd = endOfDay(parseISO(selectedDate)).getTime();
  const dayReadings = readings.filter(r => r.timestamp >= dayStart && r.timestamp <= dayEnd);
  // Prepare chart data
  const chartData = dayReadings.map(r => {
    const date = new Date(r.timestamp);
    return {
      timestamp: r.timestamp,
      hour: date.getHours() + date.getMinutes() / 60,
      value: r.calculated_value || r.value || r.sgv || r.mbg,
    };
  }).sort((a, b) => a.timestamp - b.timestamp);
  // Chart scales
  const yDomain = [30, 400];
  const xScale = scaleLinear({ domain: [0, 24], range: [margin.left, width - margin.right] });
  const yScale = scaleLog({ domain: yDomain, range: [height - margin.bottom, margin.top], base: 10, clamp: true });
  return (
    <div className="bg-white shadow rounded-lg p-6 mt-6" style={{ position: 'relative', fontFamily: 'Inter, system-ui, sans-serif', color: palette.text }}>
      <div className="flex gap-4 mb-4 items-end p-2 rounded-lg border border-gray-200 bg-white shadow-sm" style={{ background: palette.bg }}>
        <label className="flex items-center gap-2 font-medium">
          <span>Date:</span>
          <IconButton
            onClick={() => onDateChange(format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}
            size="small"
            style={{ background: palette.bg, border: `1px solid ${palette.border}` }}
            aria-label="Previous day"
          >
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
          <input
            type="date"
            value={selectedDate}
            onChange={e => onDateChange(e.target.value)}
            className="px-2 py-1 border rounded text-base font-medium"
            style={{ background: palette.bg, border: `1px solid ${palette.border}` }}
          />
          <IconButton
            onClick={() => onDateChange(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}
            size="small"
            style={{ background: palette.bg, border: `1px solid ${palette.border}` }}
            aria-label="Next day"
            disabled={isToday(parseISO(selectedDate))}
          >
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
        </label>
        <span className="ml-4 text-gray-500 text-sm">{chartData.length} readings</span>
      </div>
      <svg width={width} height={height} style={{ background: palette.bg, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        {/* Axes */}
        <Group>
          <AxisLeft
            scale={yScale}
            top={0}
            left={margin.left}
            numTicks={7}
            tickValues={[40, 55, 70, 120, 180, 260, 400]}
            tickFormat={d => `${d}`}
            stroke={palette.border}
            tickStroke={palette.border}
            tickLabelProps={() => ({
              fill: palette.muted,
              fontSize: 14,
              textAnchor: 'end',
              dy: '0.33em',
              dx: '-0.5em',
              fontWeight: 600,
            })}
            label="Blood Glucose (mg/dL)"
            labelProps={{
              fill: palette.text,
              fontSize: 16,
              textAnchor: 'middle',
              fontWeight: 700,
              transform: `rotate(-90)`,
              x: -height / 2,
              y: -50,
            }}
          />
          <AxisBottom
            scale={xScale}
            top={height - margin.bottom}
            left={0}
            numTicks={24}
            tickFormat={d => d.toString().padStart(2, '0')}
            stroke={palette.border}
            tickStroke={palette.border}
            tickLabelProps={() => ({
              fill: palette.muted,
              fontSize: 14,
              textAnchor: 'middle',
              dy: '0.5em',
              fontWeight: 600,
            })}
          />
        </Group>
        {/* Dots for readings */}
        <Group>
          {chartData.map((d, i) => (
            <Circle
              key={`bgreading-${i}`}
              cx={xScale(d.hour)}
              cy={yScale(d.value)}
              r={3}
              fill={palette.primary}
              stroke={palette.danger}
              strokeWidth={1}
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.04))' }}
            />
          ))}
        </Group>
      </svg>
      {chartData.length === 0 && (
        <div className="text-center text-gray-500 mt-4">No readings for this day.</div>
      )}
    </div>
  );
};

const DataRecoveryToolkit: React.FC = () => {
  const { nightscout } = useNightscout();
  const sqliteService = SQLiteService.getInstance();
  const [dbFile, setDbFile] = useState<File | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableSchema, setTableSchema] = useState<any[]>([]);
  const [tableRows, setTableRows] = useState<TableRowType[]>([]);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [gaps, setGaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bgReadings, setBgReadings] = useState<any[]>([]);
  const [bgChartDate, setBgChartDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [sgvPreview, setSgvPreview] = useState<any | null>(null);
  const [sgvPreviewRaw, setSgvPreviewRaw] = useState<any | null>(null);
  const [latestNightscoutSgv, setLatestNightscoutSgv] = useState<any | null>(null);

  // File upload logic
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setDbFile(acceptedFiles[0]);
      setTables([]);
      setSelectedTable(null);
      setTableSchema([]);
      setTableRows([]);
      setError(null);
      setGaps([]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/x-sqlite3': ['.db', '.sqlite', '.sqlite3'],
      'application/octet-stream': ['.db', '.sqlite', '.sqlite3']
    },
    multiple: false,
  });

  // Analyze database and list tables
  const analyzeDatabase = async () => {
    if (!dbFile) return;
    setLoading(true);
    setError(null);
    try {
      const arrayBuffer = await dbFile.arrayBuffer();
      const tableInfo = await sqliteService.analyzeDatabase(arrayBuffer);
      setTables(tableInfo.filter(t => t.rowCount > 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze database');
    } finally {
      setLoading(false);
    }
  };

  // Analyze selected table: get schema and first 5 rows
  const analyzeTable = async (tableName: string) => {
    if (!dbFile) return;
    setLoading(true);
    setError(null);
    try {
      const arrayBuffer = await dbFile.arrayBuffer();
      const tableInfo = tables.find(t => t.name === tableName);
      setTableSchema(tableInfo ? tableInfo.columns : []);
      const { head } = await sqliteService.analyzeTable(arrayBuffer, tableName, 1, 5);
      setTableRows(head);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze table');
    } finally {
      setLoading(false);
    }
  };

  // Helper to fetch all rows from a table, sorted by timestamp
  const fetchAllRowsFromTable = async (arrayBuffer: ArrayBuffer, tableName: string, sortColumn: string) => {
    let allRows: any[] = [];
    let page = 1;
    const pageSize = 500;
    while (true) {
      const { head, total } = await sqliteService.analyzeTable(arrayBuffer, tableName, page, pageSize);
      if (head.length === 0) break;
      allRows = allRows.concat(head);
      if (allRows.length >= total) break;
      page++;
    }
    // Sort by sortColumn
    return allRows.sort((a, b) => a[sortColumn] - b[sortColumn]);
  };

  // New: Analyze gaps in BgReadings table
  const handleAnalyzeBgReadingsGaps = async () => {
    if (!dbFile || selectedTable !== 'BgReadings') return;
    setLoading(true);
    setError(null);
    try {
      const arrayBuffer = await dbFile.arrayBuffer();
      // Load all rows from BgReadings, sorted by timestamp
      const allRows = await fetchAllRowsFromTable(arrayBuffer, 'BgReadings', 'timestamp');
      const foundGaps = [];
      for (let i = 1; i < allRows.length; i++) {
        const prev = allRows[i - 1];
        const curr = allRows[i];
        if (curr.timestamp - prev.timestamp > 60 * 60 * 1000) {
          foundGaps.push({
            start: prev.timestamp,
            end: curr.timestamp,
            before: prev,
            after: curr,
            duration: Math.round((curr.timestamp - prev.timestamp) / 60000),
          });
        }
      }
      setGaps(foundGaps);
      setLoading(false);
      console.log('Detected BgReadings gaps:', foundGaps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze BgReadings gaps');
      setLoading(false);
    }
  };

  // When BgReadings is selected and analyzed, load all rows for charting
  const handleLoadBgReadings = async () => {
    if (!dbFile || selectedTable !== 'BgReadings') return;
    setLoading(true);
    setError(null);
    try {
      const arrayBuffer = await dbFile.arrayBuffer();
      const allRows = await fetchAllRowsFromTable(arrayBuffer, 'BgReadings', 'timestamp');
      setBgReadings(allRows);
      // Set chart date to first reading's day if available
      if (allRows.length > 0) {
        setBgChartDate(format(new Date(allRows[0].timestamp), 'yyyy-MM-dd'));
      }
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load BgReadings');
      setLoading(false);
    }
  };

  // Helper to map a BgReadings row to a Nightscout SGV entry
  const mapBgReadingToNightscoutSgv = (row: any): any => {
    return {
      sgv: row.calculated_value,
      date: row.timestamp,
      device: row.device || 'xDrip',
      type: 'sgv' as 'sgv',
      value: row.calculated_value,
      dateString: new Date(row.timestamp).toISOString(),
      direction: row.direction || undefined,
      source: 'glucohub',
      device_source: row.device || 'xDrip',
      test: false,
      utcOffset: new Date().getTimezoneOffset(),
      sysTime: new Date(row.timestamp).toISOString(),
      customFields: {
        source: 'glucohub',
        version: '1.0.0',
        metadata: {
          createdBy: 'sqlite-bgreadings',
          timestamp: Date.now(),
          deviceSource: row.device || 'xDrip',
          isTest: false
        }
      }
    };
  };

  // Handler to preview a sample row as SGV, and fetch latest Nightscout SGV
  const handlePreviewSgv = async () => {
    if (bgReadings.length > 0) {
      const raw = bgReadings[0];
      setSgvPreviewRaw(raw);
      setSgvPreview(mapBgReadingToNightscoutSgv(raw));
      // Fetch latest SGV from Nightscout
      if (nightscout) {
        try {
          const latest = await nightscout.getSensorGlucoseReadings();
          if (latest && latest.length > 0) {
            setLatestNightscoutSgv(latest[0]);
          } else {
            setLatestNightscoutSgv(null);
          }
        } catch (err) {
          setLatestNightscoutSgv(null);
        }
      } else {
        setLatestNightscoutSgv(null);
      }
    } else {
      setSgvPreview(null);
      setSgvPreviewRaw(null);
      setLatestNightscoutSgv(null);
    }
  };

  return (
    <Box sx={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#111827', p: 2 }}>
      <Typography variant="h4" fontWeight={700} mb={2}>Nightscout Data Recovery Toolkit</Typography>
      <Paper sx={{ p: 3, mb: 4, borderRadius: 3, boxShadow: 2 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>1. Upload xDrip SQLite Database</Typography>
        <Box {...getRootProps()} sx={{ border: '2px dashed #cbd5e1', borderRadius: 2, p: 3, textAlign: 'center', cursor: 'pointer', background: isDragActive ? '#e0e7ef' : '#f8fafc', mb: 2 }}>
          <input {...getInputProps()} />
          {dbFile ? (
            <Typography>Selected file: {dbFile.name}</Typography>
          ) : (
            <Typography>Drag and drop your xDrip SQLite database file here, or click to select</Typography>
          )}
        </Box>
        {dbFile && (
          <Button variant="contained" color="primary" onClick={analyzeDatabase} disabled={loading} sx={{ mb: 2 }}>
            {loading ? 'Analyzing...' : 'Analyze Database Structure'}
          </Button>
        )}
        {error && <Typography color="error" mb={1}>{error}</Typography>}
        {tables.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography fontWeight={600} mb={1}>2. Select Table</Typography>
            <Select
              value={selectedTable || ''}
              onChange={e => {
                setSelectedTable(e.target.value as string);
                analyzeTable(e.target.value as string);
              }}
              displayEmpty
              sx={{ minWidth: 220, mb: 2 }}
            >
              <MenuItem value="" disabled>Select a table</MenuItem>
              {tables.map(table => (
                <MenuItem key={table.name} value={table.name}>{table.name}</MenuItem>
              ))}
            </Select>
            {selectedTable && tableSchema.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography fontWeight={500} mb={1}>Schema:</Typography>
                <Box sx={{ fontFamily: 'monospace', fontSize: 14, background: '#f1f5f9', p: 1, borderRadius: 1, mb: 1 }}>
                  {tableSchema.map((col, idx) => `${col.name} (${col.type})`).join(', ')}
                </Box>
                <Typography fontWeight={500} mb={1}>First 5 Rows:</Typography>
                <TableContainer sx={{ maxHeight: 220, background: '#f1f5f9', borderRadius: 1, mb: 1 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <MuiTableRow>
                        {tableSchema.map((col, idx) => (
                          <TableCell key={idx} sx={{ fontWeight: 600, background: '#e0e7ef' }}>{col.name}</TableCell>
                        ))}
                      </MuiTableRow>
                    </TableHead>
                    <TableBody>
                      {tableRows.map((row, idx) => (
                        <MuiTableRow key={idx}>
                          {tableSchema.map((col, cidx) => (
                            <TableCell key={cidx}>{row[col.name]?.toString() ?? ''}</TableCell>
                          ))}
                        </MuiTableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        )}
      </Paper>
      {selectedTable === 'BgReadings' && (
        <Paper sx={{ p: 3, mb: 4, borderRadius: 3, boxShadow: 2 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>3. BgReadings Gap Analysis</Typography>
          <Button variant="contained" color="primary" onClick={handleAnalyzeBgReadingsGaps} disabled={loading} sx={{ mr: 2 }}>
            {loading ? 'Analyzing...' : 'Analyze Gaps (>1 hour)'}
          </Button>
          <Button variant="outlined" color="primary" onClick={handleLoadBgReadings} disabled={loading} sx={{ mr: 2 }}>
            {loading ? 'Loading...' : 'Visualize Day Chart'}
          </Button>
          <Button variant="outlined" color="secondary" onClick={handlePreviewSgv} disabled={bgReadings.length === 0}>
            Preview Sample as SGV Entry
          </Button>
          {error && <Typography color="error" mb={1}>{error}</Typography>}
          <Typography variant="body2" color="text.secondary" mb={2}>
            This will scan the BgReadings table for gaps longer than 1 hour between consecutive readings, or visualize readings for a single day, or preview a sample SGV entry.
          </Typography>
          {gaps.length > 0 && (
            <Box>
              {gaps.map((gap, idx) => (
                <Box key={idx} sx={{ mb: 3, p: 2, border: '1px solid #e5e7eb', borderRadius: 2, background: '#f8fafc' }}>
                  <Typography fontWeight={500}>
                    Gap {idx + 1}: {format(new Date(gap.start), 'yyyy-MM-dd HH:mm')} → {format(new Date(gap.end), 'yyyy-MM-dd HH:mm')} ({gap.duration} min)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    Before: {JSON.stringify(gap.before)}<br />
                    After: {JSON.stringify(gap.after)}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
          {/* Show the chart if readings are loaded */}
          {bgReadings.length > 0 && (
            <BgReadingsDayChart
              readings={bgReadings}
              selectedDate={bgChartDate}
              onDateChange={setBgChartDate}
            />
          )}
          {/* Show SGV preview if available */}
          {sgvPreview && (
            <Box className="mt-6 p-4 bg-gray-50 rounded border border-gray-200">
              <Typography variant="h6" fontWeight={600} mb={2}>Sample SGV Entry Preview</Typography>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: 320 }}>
                  <Typography variant="subtitle2" color="text.secondary" mb={1}>Raw BgReadings Row</Typography>
                  <pre className="bg-white p-3 rounded text-xs overflow-auto" style={{ maxHeight: 300 }}>
                    {JSON.stringify(sgvPreviewRaw, null, 2)}
                  </pre>
                </Box>
                <Box sx={{ flex: 1, minWidth: 320 }}>
                  <Typography variant="subtitle2" color="text.secondary" mb={1}>Mapped SGV Entry</Typography>
                  <pre className="bg-white p-3 rounded text-xs overflow-auto" style={{ maxHeight: 300 }}>
                    {JSON.stringify(sgvPreview, null, 2)}
                  </pre>
                </Box>
                <Box sx={{ flex: 1, minWidth: 320 }}>
                  <Typography variant="subtitle2" color="text.secondary" mb={1}>Most Recent Nightscout SGV</Typography>
                  <pre className="bg-white p-3 rounded text-xs overflow-auto" style={{ maxHeight: 300 }}>
                    {latestNightscoutSgv ? JSON.stringify(latestNightscoutSgv, null, 2) : 'No SGV data found'}
                  </pre>
                </Box>
              </Box>
            </Box>
          )}
        </Paper>
      )}
      {/* TODO: Add BgReadings query and mapping using selectedTable, preview mapped data, export options, and real Nightscout posting in future */}
    </Box>
  );
};

export default DataRecoveryToolkit; 