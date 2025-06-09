import initSqlJs, { Database } from 'sql.js';

declare const self: Worker;

interface TableRow {
  [key: string]: any;
}

interface AnalyzeTableMessage {
  type: 'analyzeTable';
  dbFile: Uint8Array;
  tableName: string;
  limit: number;
}

interface AnalyzeStructureMessage {
  type: 'analyzeStructure';
  dbFile: Uint8Array;
}

type WorkerMessage = AnalyzeTableMessage | AnalyzeStructureMessage;

interface Column {
  name: string;
  type: string;
  sampleValue?: any;
}

interface TableInfo {
  name: string;
  columns: Column[];
  rowCount: number;
  sampleRows: any[];
}

let SQL: any;

async function init() {
  SQL = await initSqlJs({
    locateFile: file => `/sql-wasm.wasm`
  });
}

init();

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  try {
    const db = new SQL.Database(e.data.dbFile);

    if (e.data.type === 'analyzeTable') {
      const { tableName, limit } = e.data;
      
      // Get first N rows
      const headQuery = `SELECT * FROM ${tableName} LIMIT ${limit}`;
      const headResult = db.exec(headQuery);
      const headRows = headResult[0]?.values.map((row: any[]) => {
        const obj: TableRow = {};
        headResult[0].columns.forEach((col: string, i: number) => {
          obj[col] = row[i];
        });
        return obj;
      }) || [];

      // Get last N rows
      const tailQuery = `SELECT * FROM ${tableName} ORDER BY rowid DESC LIMIT ${limit}`;
      const tailResult = db.exec(tailQuery);
      const tailRows = tailResult[0]?.values.map((row: any[]) => {
        const obj: TableRow = {};
        tailResult[0].columns.forEach((col: string, i: number) => {
          obj[col] = row[i];
        });
        return obj;
      }) || [];

      self.postMessage({
        type: 'analyzeTable',
        head: headRows,
        tail: tailRows
      });
    } else if (e.data.type === 'analyzeStructure') {
      const tablesQuery = "SELECT name FROM sqlite_master WHERE type='table'";
      const tablesResult = db.exec(tablesQuery);
      const tables = tablesResult[0]?.values.map((row: any[]) => row[0]) || [];

      const tableInfo = await Promise.all(tables.map(async (tableName: string) => {
        const schemaQuery = `PRAGMA table_info(${tableName})`;
        const schemaResult = db.exec(schemaQuery);
        const columns = schemaResult[0]?.values.map((row: any[]) => ({
          name: row[1],
          type: row[2],
          notNull: row[3] === 1,
          defaultValue: row[4],
          primaryKey: row[5] === 1
        })) || [];

        const countQuery = `SELECT COUNT(*) as count FROM ${tableName}`;
        const countResult = db.exec(countQuery);
        const rowCount = countResult[0]?.values[0][0] || 0;

        const sampleQuery = `SELECT * FROM ${tableName} LIMIT 5`;
        const sampleResult = db.exec(sampleQuery);
        const sampleRows = sampleResult[0]?.values.map((row: any[]) => {
          const obj: TableRow = {};
          sampleResult[0].columns.forEach((col: string, i: number) => {
            obj[col] = row[i];
          });
          return obj;
        }) || [];

        return {
          name: tableName,
          columns,
          rowCount,
          sampleRows
        };
      }));

      self.postMessage({
        type: 'analyzeStructure',
        tables: tableInfo
      });
    }

    db.close();
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}; 