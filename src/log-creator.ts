import { logLevel,LogEntry } from "kafkajs"
import { Logger } from "./types"

const logMethods: {[key: string]: keyof Logger} = {
  [logLevel.DEBUG]: "debug",
  [logLevel.ERROR]: "error",
  [logLevel.INFO]: "info",
  [logLevel.WARN]: "warn",
  [logLevel.NOTHING]: "error"
}

export const logCreator = (logger: Logger) => () =>
  ({ level, log }: LogEntry) => {
    const method = logMethods[level]
    const { message, ...rest } = log

    return logger[method]({ component: "KafkaStorageChangelog/kafkajs" }, message, rest)
  }
