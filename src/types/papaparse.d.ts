declare module 'papaparse' {
  type ParseErrorType = 'Quotes' | 'Delimiter' | 'FieldMismatch';

  interface ParseError {
    type: ParseErrorType;
    code: string;
    message: string;
    row: number;
  }

  interface ParseResult<T> {
    data: T[];
    errors: ParseError[];
    meta: {
      delimiter: string;
      linebreak: string;
      aborted: boolean;
      truncated: boolean;
      cursor: number;
    };
  }

  interface ParseConfig {
    delimiter?: string;
    header?: boolean;
    dynamicTyping?: boolean;
    preview?: number;
    encoding?: string;
    worker?: boolean;
    comments?: boolean | string;
    step?: (results: ParseResult<any>, parser: any) => void;
    complete?: (results: ParseResult<any>) => void;
    error?: (error: any) => void;
    download?: boolean;
    skipEmptyLines?: boolean;
    chunk?: (results: ParseResult<any>, parser: any) => void;
    fastMode?: boolean;
    beforeFirstChunk?: (chunk: string) => string | void;
    transform?: (value: string) => string;
  }

  interface Parser {
    abort(): void;
    stream(input: string): void;
  }

  interface Papa {
    parse<T = any>(input: string | File, config?: ParseConfig): ParseResult<T>;
    unparse(data: any[], config?: ParseConfig): string;
    RemoteChunkSize: number;
    ScriptPath: string;
    LocalChunkSize: number;
    DefaultDelimiter: string;
    Parser: Parser;
    ParserHandle: any;
    NetworkStreamer: any;
    FileStreamer: any;
    StringStreamer: any;
    ReadableStream: any;
  }

  const Papa: Papa;
  export default Papa;
} 