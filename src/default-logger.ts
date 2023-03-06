import { Logger } from "./types"

const format = (level: string, component: string, message: string) =>
  `[${new Date().toISOString()}] ${level} [${component}] ${message}`

export const defaultLogger: Logger = {
  fatal: ({ component }: { component: string }, message: string) =>
    console.error(format("FATAL", component, message)),
  error: ({ component }: { component: string }, message: string) =>
    console.error(format("ERROR", component, message)),
  warn: ({ component }: { component: string }, message: string) =>
    console.warn(format("WARN", component, message)),
  info: ({ component }: { component: string }, message: string) =>
    console.info(format("INFO", component, message)),
  debug: ({ component }: { component: string }, message: string) =>
    console.debug(format("DEBUG", component, message)),
  trace: ({ component }: { component: string }, message: string) =>
    console.debug(format("TRACE", component, message)),
}
