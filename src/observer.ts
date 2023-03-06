import { ChangeEvent } from "@navarik/storage"

export class Observer {
  constructor(private handler: (change: ChangeEvent<any, any>) => Promise<void> = async () => {}) {}

  async process(message: Buffer|null) {
    const event = JSON.parse(message?.toString() || "{}")
    await this.handler(event)
  }
}
