import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { SQLiteService, TableInfo, TableRow, TimeGap } from '../lib/sqliteService';
import { saveAs } from 'file-saver';
import { ResponsiveMainContent } from './ResponsiveMainContent';

const PAGE_SIZES = [50, 100, 1000];

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString();
};

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  return `${hours}h ${remainingMinutes}m`;
};

const XdripDbAnalyzer: React.FC = () => {
  const [dbFile, setDbFile] = useState<File | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTableForAnalysis, setSelectedTableForAnalysis] = useState<string | null>(null);
  const [tableHead, setTableHead] = useState<TableRow[]>([]);
  const [tableTail, setTableTail] = useState<TableRow[]>([]);
  const [analyzingTable, setAnalyzingTable] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalRows, setTotalRows] = useState(0);
  const [timeGaps, setTimeGaps] = useState<TimeGap[]>([]);
  const [analyzingGaps, setAnalyzingGaps] = useState(false);

  const sqliteService = SQLiteService.getInstance();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setDbFile(acceptedFiles[0]);
      setTables([]);
      setError(null);
      setSelectedTableForAnalysis(null);
      setTableHead([]);
      setTableTail([]);
      setVisibleColumns(new Set());
      setCurrentPage(1);
      setTimeGaps([]);
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

  const analyzeDatabase = async () => {
    if (!dbFile) return;

    setLoading(true);
    setError(null);

    try {
      const arrayBuffer = await dbFile.arrayBuffer();
      const tableInfo = await sqliteService.analyzeDatabase(arrayBuffer);
      
      // Filter out tables with zero rows
      const nonEmptyTables = tableInfo.filter(table => table.rowCount > 0);
      setTables(nonEmptyTables);
    } catch (err) {
      console.error('Database analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze database');
    } finally {
      setLoading(false);
    }
  };

  const analyzeTable = async (tableName: string, page: number = 1, size: number = 50) => {
    if (!dbFile) return;

    setAnalyzingTable(true);
    setError(null);

    try {
      const arrayBuffer = await dbFile.arrayBuffer();
      const { head, tail, total } = await sqliteService.analyzeTable(arrayBuffer, tableName, page, size);
      setTableHead(head);
      setTableTail(tail);
      setTotalRows(total);
      
      // Initialize visible columns if not already set
      if (visibleColumns.size === 0 && head.length > 0) {
        const columns = Object.keys(head[0]);
        setVisibleColumns(new Set(columns));
      }
    } catch (err) {
      console.error('Table analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze table');
    } finally {
      setAnalyzingTable(false);
    }
  };

  const analyzeTimeGaps = async (tableName: string) => {
    if (!dbFile) return;

    setAnalyzingGaps(true);
    setError(null);

    try {
      const arrayBuffer = await dbFile.arrayBuffer();
      const gaps = await sqliteService.analyzeTimeGaps(arrayBuffer, tableName);
      setTimeGaps(gaps);
    } catch (err) {
      console.error('Time gap analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze time gaps');
    } finally {
      setAnalyzingGaps(false);
    }
  };

  const handleTableSelect = (tableName: string) => {
    setSelectedTableForAnalysis(tableName);
    setCurrentPage(1);
    analyzeTable(tableName, 1, pageSize);
    if (tableName === 'BgReadings') {
      analyzeTimeGaps(tableName);
    }
  };

  const toggleColumn = (columnName: string) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnName)) {
        newSet.delete(columnName);
      } else {
        newSet.add(columnName);
      }
      return newSet;
    });
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (selectedTableForAnalysis) {
      analyzeTable(selectedTableForAnalysis, newPage, pageSize);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
    if (selectedTableForAnalysis) {
      analyzeTable(selectedTableForAnalysis, 1, newSize);
    }
  };

  const totalPages = Math.ceil(totalRows / pageSize);

  // Helper to export all rows from the selected table to CSV
  const exportAllRowsToCSV = async (tableName: string) => {
    if (!dbFile) return;
    const arrayBuffer = await dbFile.arrayBuffer();
    const allRows = await sqliteService.getAllRows(arrayBuffer, tableName);
    if (!allRows.length) return;
    // If visibleColumns is empty, use all columns
    const columns = (visibleColumns.size > 0)
      ? Object.keys(allRows[0]).filter(col => visibleColumns.has(col))
      : Object.keys(allRows[0]);
    const csvRows = [columns.join(',')];
    for (const row of allRows) {
      const vals = columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n')))
          return '"' + val.replace(/"/g, '""') + '"';
        return val;
      });
      csvRows.push(vals.join(','));
    }
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${tableName}.csv`);
  };

  return (
    <ResponsiveMainContent>
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">xDrip Database Explorer</h2>
          
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
              ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
          >
            <input {...getInputProps()} />
            {dbFile ? (
              <p>Selected file: {dbFile.name}</p>
            ) : (
              <p>Drag and drop your xDrip SQLite database file here, or click to select</p>
            )}
          </div>

          {dbFile && (
            <div className="mt-4">
              <button
                onClick={analyzeDatabase}
                disabled={loading}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Analyzing...' : 'Analyze Database Structure'}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 rounded-md">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}

          {tables.length > 0 && (
            <>
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Database Structure</h3>
                <div className="space-y-6">
                  {tables.map(table => (
                    <div key={table.name} className="border rounded-lg p-4">
                      <h4 className="text-lg font-medium mb-2">
                        Table: {table.name}
                        <span className="text-sm text-gray-500 ml-2">
                          ({table.rowCount} rows)
                        </span>
                      </h4>
                      
                      <div className="mb-4">
                        <h5 className="font-medium mb-2">Columns:</h5>
                        <div className="grid grid-cols-3 gap-4">
                          {table.columns.map(column => (
                            <div key={column.name} className="bg-gray-50 p-2 rounded">
                              <div className="font-medium">{column.name}</div>
                              <div className="text-sm text-gray-600">{column.type}</div>
                              {column.primaryKey && (
                                <div className="text-sm text-blue-600">Primary Key</div>
                              )}
                              {column.notNull && (
                                <div className="text-sm text-orange-600">Not Null</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 flex gap-4">
                        <button
                          onClick={() => handleTableSelect(table.name)}
                          disabled={analyzingTable && selectedTableForAnalysis === table.name}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          {analyzingTable && selectedTableForAnalysis === table.name
                            ? 'Analyzing...'
                            : 'View Sample Data'}
                        </button>
                        <button
                          onClick={() => exportAllRowsToCSV(table.name)}
                          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm font-medium"
                        >
                          Export ALL to CSV
                        </button>
                      </div>

                      {selectedTableForAnalysis === table.name && (
                        <div className="mt-4">
                          {table.name === 'BgReadings' && (
                            <>
                              <div className="mb-4 space-y-4">
                                <div>
                                  <h6 className="text-sm font-medium text-gray-500 mb-2">Column Visibility:</h6>
                                  <div className="flex flex-wrap gap-2">
                                    {table.columns.map(column => (
                                      <label key={column.name} className="inline-flex items-center">
                                        <input
                                          type="checkbox"
                                          checked={visibleColumns.has(column.name)}
                                          onChange={() => toggleColumn(column.name)}
                                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">{column.name}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex items-center space-x-4">
                                  <div>
                                    <label htmlFor="pageSize" className="text-sm font-medium text-gray-700">
                                      Rows per page:
                                    </label>
                                    <select
                                      id="pageSize"
                                      value={pageSize}
                                      onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                                      className="ml-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    >
                                      {PAGE_SIZES.map(size => (
                                        <option key={size} value={size}>{size}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => handlePageChange(currentPage - 1)}
                                      disabled={currentPage === 1}
                                      className="px-3 py-1 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                      Previous
                                    </button>
                                    <span className="text-sm text-gray-700">
                                      Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                      onClick={() => handlePageChange(currentPage + 1)}
                                      disabled={currentPage === totalPages}
                                      className="px-3 py-1 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                      Next
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-6">
                                <h5 className="text-lg font-medium mb-4">Time Gaps Analysis</h5>
                                {analyzingGaps ? (
                                  <div className="text-gray-600">Analyzing time gaps...</div>
                                ) : timeGaps.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</th>
                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Value</th>
                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Value</th>
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-gray-200">
                                        {timeGaps.map((gap, index) => (
                                          <tr key={index}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                              {formatDate(gap.startTime)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                              {formatDate(gap.endTime)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                              {formatDuration(gap.duration)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                              {gap.startValue?.toFixed(1)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                              {gap.endValue?.toFixed(1)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="text-gray-600">No gaps found longer than 1 hour</div>
                                )}
                              </div>
                            </>
                          )}

                          <div className="mt-4">
                            <h5 className="font-medium mb-2">Table Data:</h5>
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    {table.columns
                                      .filter(column => visibleColumns.has(column.name))
                                      .map(column => (
                                        <th
                                          key={column.name}
                                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                          {column.name}
                                        </th>
                                      ))}
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {tableHead.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                      {table.columns
                                        .filter(column => visibleColumns.has(column.name))
                                        .map(column => (
                                          <td
                                            key={column.name}
                                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                                          >
                                            {JSON.stringify(row[column.name])}
                                          </td>
                                        ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ResponsiveMainContent>
  );
};

export default XdripDbAnalyzer; 