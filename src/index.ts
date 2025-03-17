import { serve } from '@hono/node-server'
import { createNodeWebSocket } from '@hono/node-ws'
import { Hono } from 'hono'
import type { WSContext } from 'hono/ws';
import { createClient } from 'redis';

const app = new Hono()

const redisPub = createClient({url: 'redis://redis:6379'});
const redisSub = createClient({url: 'redis://redis:6379'});
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
    console.log(ws.url);
    ws.send(message)
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
})).get('/', (c) => {
  return c.text('Hello Hono!')
})

const server = serve({fetch: app.fetch}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})


injectWebSocket(server);