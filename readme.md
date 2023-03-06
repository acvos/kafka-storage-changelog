# kafka-storage-changelog
Kafka changelog adadpter for Storage

## Installation
```sh
npm i kafka-storage-changelog
```

## Basic usage
```javascript
import { Storage } from "@navarik/storage"
import { KafkaStorageChangelog } from "kafka-storage-changelog"
import fs from "fs"
import path from "path"

const changelog = new KafkaStorageChangelog({
  brokers: ["localhost:9092"],
  clientId: "AAAAAA",
  ssl: {
    ca: fs.readFileSync(path.join(process.cwd(), "local/kafka-ssl/ca.pem")),
    cert: fs.readFileSync(path.join(process.cwd(), "local/kafka-ssl/service.cert")),
    key: fs.readFileSync(path.join(process.cwd(), "local/kafka-ssl/service.key"))
  },
  topic: "test-changelog",
  consumerGroupId: "testing-test"
})

const storage = new Storage({
  changelog,
  schema: [{
    name: "test",
    fields: [
      { name: "a", type: "string" }
    ]
  }]
})

async function main() {
  await storage.up()

  await storage.create({ type: "test", body: { a: "AAAAAAAAAAAAAA" }})
  console.log("AAAAAAAAAAAAAAAAA", await storage.find({}))

  await storage.down()
}

main()
}
```