import { ChangeEvent, ChangelogAdapter } from "@navarik/storage"
import { Kafka, Producer, Consumer, EachMessagePayload } from "kafkajs"
import { v4 as uuidv4 } from "uuid"
import { defaultLogger } from "./default-logger"
import { Observer } from "./observer"
import { logCreator } from "./log-creator"
import { Logger } from "./types"

interface Config {
  brokers: Array<string>
  clientId: string
  topic: string
  consumerGroupId: string
  ssl: {
    ca: string|Buffer
    cert: string|Buffer
    key: string|Buffer
  }
  logger?: Logger
}

export class KafkaStorageChangelog<M extends object> implements ChangelogAdapter<M> {
  private logger: Logger
  private topic: string
  private consumerGroupId: string
  private kafka: Kafka
  private producer: Producer
  private consumer: Consumer
  private observer: Observer = new Observer()

  constructor({ clientId, brokers, ssl, topic, consumerGroupId, logger }: Config) {
    this.logger = logger || defaultLogger

    this.logger.info({ component: "KafkaStorageChangelog" }, `Initializing Kafka connection (topic = ${topic}, consumer group = ${consumerGroupId}, brokers = ${brokers.join(", ")})`)

    this.kafka = new Kafka({
      clientId,
      brokers,
      ssl,
      logCreator: logCreator(this.logger)
    })

    this.producer = this.kafka.producer()
    this.consumer = this.kafka.consumer({ groupId: consumerGroupId })

    this.topic = topic
    this.consumerGroupId = consumerGroupId
  }

  private async getCurrentOffsets() {
    const admin = this.kafka.admin()

    await admin.connect()
    const [{ partitions }] = await admin.fetchOffsets({
      groupId: this.consumerGroupId,
      topics: [this.topic]
    })

    const offsets: {[key: number]: number} = partitions.reduce(
      (acc, { partition, offset }) => {
        const lastRead = parseInt(offset)

        return lastRead <=0 ? acc : ({ ...acc, [partition]: lastRead - 1 })
      },
      {}
    )

    await admin.disconnect()

    return offsets
  }

  observe(handler: (change: ChangeEvent<any, M>) => Promise<void>) {
    this.observer =  new Observer(handler)
  }

  async write(message: ChangeEvent<any, M>) {
    await this.producer.send({
      topic: this.topic,
      messages: [
        { value: JSON.stringify(message) },
      ],
    })
  }

  async readAll() {
    let lastReadOffsets = await this.getCurrentOffsets()
    this.logger.debug({ component: "KafkaStorageChangelog" }, "Index is dirty, following partitions need to be re-read", lastReadOffsets)

    let partitionsToRead = Object.keys(lastReadOffsets).length
    if (!partitionsToRead) {
      this.logger.info({ component: "KafkaStorageChangelog" }, "No events to re-read")

      await this.up()
      return
    }

    this.logger.info({ component: "KafkaStorageChangelog" }, "Reading events from the start. This might take a whale")

    const catchupReader = this.kafka.consumer({ groupId: uuidv4() })
    catchupReader.subscribe({ topic: this.topic, fromBeginning: true })

    let readCount = 0
    await new Promise<void>((resolve) => {
      catchupReader.run({
        eachMessage: async ({ partition, message: { offset, value } }: EachMessagePayload) => {
          const currentOffset = parseInt(offset)
          const lastRead = lastReadOffsets[partition] || 0

          if (currentOffset <= lastRead) {
            await this.observer.process(value)
            readCount++
          }

          if (currentOffset >= lastRead) {
            delete lastReadOffsets[partition]
            partitionsToRead--
          }

          if (!partitionsToRead) {
            resolve()
          }
        }
      })
    })

    this.logger.info({ component: "KafkaStorageChangelog" }, `Successfully read ${readCount} events. Closing catch-up consumer`)
    await catchupReader.disconnect()

    await this.up()
  }

  async up() {
    this.logger.debug({ component: "KafkaStorageChangelog" }, "Starting Kafka changelog producer")
    await this.producer.connect()

    this.logger.debug({ component: "KafkaStorageChangelog" }, "Starting Kafka changelog consumer")
    await this.consumer.connect()
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: false })

    this.logger.debug({ component: "KafkaStorageChangelog" }, "Initializing observer")
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message: { offset, value } }: EachMessagePayload) => {
        await this.observer.process(value)
        await this.consumer.commitOffsets([{ topic, partition, offset }])
      }
    })

    this.logger.info({ component: "KafkaStorageChangelog" }, "Kafka changelog successfully connected")
  }

  async down() {
    this.logger.info({ component: "KafkaStorageChangelog" }, "Shutting down Kafka changelog")
    await this.consumer.disconnect()
    await this.producer.disconnect()

    this.logger.info({ component: "KafkaStorageChangelog" }, "Kafka changelog successfully diosconnected")
  }

  async isHealthy() {
    return true
  }
}
