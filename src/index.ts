import { serve } from '@hono/node-server'
import { createNodeWebSocket } from '@hono/node-ws'
import { Hono } from 'hono'
import type { WSContext } from 'hono/ws';
import { createClient } from 'redis';

const app = new Hono()

const redisPub = createClient();
const redisSub = createClient();
const wss =  new Set<WSContext<WebSocket>>();

redisPub.on('error', (err) => {
  console.error(`Pub Error: ${err}`)
});

redisSub.on('error', (err) => {
  console.error(`Sub Error: ${err}`)
});

async function connects() {
  await redisPub.connect();
  await redisSub.connect();
}

connects()
.then(()=> {
  console.log('connects success')
})
.catch((err) => {console.log('connets error:',err)})

redisSub.subscribe('ws-channel',(message,channel) => {
  console.log(`Received message: ${message} from channel: ${channel}`)
  wss.forEach(ws => {
    ws.send('test')
  })
  console.log(`Received message: ${message} from channel: ${channel}`)
})

const { injectWebSocket,upgradeWebSocket } = createNodeWebSocket({app});

app.get('/ws', upgradeWebSocket((c) => {
  return {
    onMessage:  (event,ws) => {
      wss.add(ws);
      redisPub.publish('ws-channel',JSON.stringify({message: event.data}))
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