import initSqlJs, { Database } from 'sql.js';

export interface Column {
  name: string;
  type: string;
  primaryKey?: boolean;
  notNull?: boolean;
}

export interface TableInfo {
  name: string;
  columns: Column[];
  rowCount: number;
}

export interface TableRow {
  [key: string]: any;
}

export interface TableAnalysis {
  head: TableRow[];
  tail: TableRow[];
  total: number;
}

export interface TimeGap {
  startTime: number;
  endTime: number;
  duration: number; // in minutes
  startValue?: number;
  endValue?: number;
}

export class SQLiteService {
  private static instance: SQLiteService;
  private db: Database | null = null;

  private constructor() {}

  public static getInstance(): SQLiteService {
    if (!SQLiteService.instance) {
      SQLiteService.instance = new SQLiteService();
    }
    return SQLiteService.instance;
  }

  private async init(): Promise<void> {
    if (!this.db) {
      try {
        const SQL = await initSqlJs({
          locateFile: file => `/sql-wasm.wasm`
        });
        this.db = new SQL.Database();
      } catch (error) {
        console.error('Failed to initialize SQL.js:', error);
        throw new Error('Failed to initialize SQL.js');
      }
    }
  }

  public async analyzeDatabase(dbData: ArrayBuffer): Promise<TableInfo[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Load the database from the ArrayBuffer
      this.db = new (await initSqlJs()).Database(new Uint8Array(dbData));

      // Get list of all tables
      const tablesResult = this.db.exec(`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        AND name NOT LIKE 'sqlite_%'
      `);

      const tables: TableInfo[] = [];

      for (const table of tablesResult[0].values) {
        const tableName = table[0] as string;

        // Get table schema
        const schemaResult = this.db.exec(`PRAGMA table_info(${tableName})`);
        const columns: Column[] = schemaResult[0].values.map((col: any) => ({
          name: col[1],
          type: col[2],
          notNull: col[3] === 1,
          primaryKey: col[5] === 1
        }));

        // Get row count
        const countResult = this.db.exec(`SELECT COUNT(*) as count FROM ${tableName}`);
        const rowCount = countResult[0].values[0][0] as number;

        tables.push({
          name: tableName,
          columns,
          rowCount
        });
      }

      return tables;
    } catch (error) {
      console.error('Error analyzing database:', error);
      throw new Error('Failed to analyze database');
    }
  }

  public async analyzeTable(dbData: ArrayBuffer, tableName: string, page: number = 1, pageSize: number = 50): Promise<TableAnalysis> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Load the database from the ArrayBuffer
      this.db = new (await initSqlJs()).Database(new Uint8Array(dbData));

      // Get total row count
      const countResult = this.db.exec(`SELECT COUNT(*) as count FROM ${tableName}`);
      const total = countResult[0].values[0][0] as number;

      // Calculate offset
      const offset = (page - 1) * pageSize;

      // Get paginated data
      const result = this.db.exec(`
        SELECT * FROM ${tableName}
        ORDER BY rowid
        LIMIT ${pageSize}
        OFFSET ${offset}
      `);

      const rows = result[0]?.values.map((row: any) => {
        const obj: TableRow = {};
        result[0].columns.forEach((col: string, index: number) => {
          obj[col] = row[index];
        });
        return obj;
      }) || [];

      return {
        head: rows,
        tail: [], // We don't need tail rows anymore since we're using pagination
        total
      };
    } catch (error) {
      console.error('Error analyzing table:', error);
      throw new Error('Failed to analyze table');
    }
  }

  public async analyzeTimeGaps(dbData: ArrayBuffer, tableName: string, timestampColumn: string = 'timestamp', minGapMinutes: number = 60): Promise<TimeGap[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Load the database from the ArrayBuffer
      this.db = new (await initSqlJs()).Database(new Uint8Array(dbData));

      // Get all timestamps ordered
      const result = this.db.exec(`
        SELECT ${timestampColumn}, calculated_value
        FROM ${tableName}
        ORDER BY ${timestampColumn}
      `);

      if (!result[0]?.values) {
        return [];
      }

      const gaps: TimeGap[] = [];
      const rows = result[0].values;
      const timestampIndex = result[0].columns.indexOf(timestampColumn);
      const valueIndex = result[0].columns.indexOf('calculated_value');

      for (let i = 0; i < rows.length - 1; i++) {
        const currentTime = rows[i][timestampIndex] as number;
        const nextTime = rows[i + 1][timestampIndex] as number;
        const gapMinutes = (nextTime - currentTime) / (1000 * 60); // Convert ms to minutes

        if (gapMinutes >= minGapMinutes) {
          gaps.push({
            startTime: currentTime,
            endTime: nextTime,
            duration: gapMinutes,
            startValue: rows[i][valueIndex] as number,
            endValue: rows[i + 1][valueIndex] as number
          });
        }
      }

      return gaps;
    } catch (error) {
      console.error('Error analyzing time gaps:', error);
      throw new Error('Failed to analyze time gaps');
    }
  }

  public async getAllRows(dbData: ArrayBuffer, tableName: string): Promise<TableRow[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');
    try {
      // Load the database from the ArrayBuffer
      this.db = new (await initSqlJs()).Database(new Uint8Array(dbData));
      const result = this.db.exec(`SELECT * FROM ${tableName}`);
      if (!result[0]) return [];
      return result[0].values.map((row: any) => {
        const obj: TableRow = {};
        result[0].columns.forEach((col: string, index: number) => {
          obj[col] = row[index];
        });
        return obj;
      });
    } catch (error) {
      console.error('Error fetching all rows:', error);
      throw new Error('Failed to fetch all rows');
    }
  }
} 