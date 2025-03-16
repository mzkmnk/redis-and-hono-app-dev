import { serve } from '@hono/node-server'
import { createNodeWebSocket } from '@hono/node-ws'
import { Hono } from 'hono'

const app = new Hono()

const { injectWebSocket,upgradeWebSocket } = createNodeWebSocket({app});

app.get('/ws', upgradeWebSocket((c) => {
  return {
    onMessage: (event,ws) => {
      console.log(`Message from client: ${event.data}`)

      ws.send('Hello from server')
    }
  }
}))

const server = serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})


injectWebSocket(server);