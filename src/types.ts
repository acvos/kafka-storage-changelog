export interface Logger {
  trace(...messages: Array<(string|object)>): void;
  debug(...messages: Array<(string|object)>): void;
  info(...messages: Array<(string|object)>): void;
  warn(...messages: Array<(string|object)>): void;
  error(...messages: Array<(string|object)>): void;
  fatal(...messages: Array<(string|object)>): void;
}
