import { createServer } from 'node:http'
import { promises as fs } from 'node:fs'
import { join, extname } from 'node:path'
import { App } from 'uWebSockets.js'
import { networkInterfaces } from 'node:os'

const CONTENT_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  default: 'text/plain',
}

const HTTP_PORT = 3000
const WS_PORT = 3001
const NUM_FOOD = 1000
const SPAN = 400

const state = {
  players: {},
  food: [],
}

function initState() {
  state.players = [] // { name, id, x, y, mass, color }
  state.food = [] // { x, y }
  for (let i = 0; i < NUM_FOOD; i++) {
    state.food.push({ id: i, x: parseInt(Math.random() * SPAN * 2 - SPAN), y: parseInt(Math.random() * SPAN * 2 - SPAN) })
  }
}
initState()

const server = createServer(async (req, res) => {
  try {
    let filePath = join('../client', req.url === '/' ? 'index.html' : req.url)
    const ext = extname(filePath)
    const contentType = CONTENT_TYPES[ext] || CONTENT_TYPES['default']
    const data = await fs.readFile(filePath)
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(data)
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found\n')
  }
})

// Uncomment to start the HTTP server
const interfaces = networkInterfaces()
for (const name of Object.keys(interfaces)) {
  for (const net of interfaces[name]) {
    if (net.family === 'IPv4' && !net.internal) {
      server.listen(HTTP_PORT, net.address, (e) => {
        if (e) {
          console.error(`An error occurred on ${net.address}:`, e)
        } else {
          console.log(`Listening on ${net.address}:${HTTP_PORT}`)
        }
      })
    }
  }
}

const app = new App()

app
  .ws('/budget-agario', {
    compression: 0,
    maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout: 10,

    open: (ws) => {
      ws.subscribe('test1channel')
    },
    message: (ws, message, isBinary) => {
      try {
        const str = Buffer.from(message).toString()
        const data = JSON.parse(str)

        if (data.type === 'join') {
          ws.id = data.joiner.id
          state.players.push(data.joiner)
          ws.send(JSON.stringify({ type: 'init-food', state }))
          app.publish('test1channel', JSON.stringify({ type: 'update-players', players: state.players }))
        } else if (data.type === 'move') {
          const player = state.players.find((p) => p.id === data.id)
          if (!player) return
          player.x = data.x
          player.y = data.y
          ws.publish('test1channel', JSON.stringify({ type: 'update-movement', id: player.id, x: player.x, y: player.y, s: data.s, d: data.d }))
        } else if (data.type === 'eat') {
          const player = state.players.find((p) => p.id === data.pid)
          const food = state.food.find((f) => f.id === data.fid)
          if (!player || !food) return
          player.mass += 1
          food.x = parseInt(Math.random() * SPAN * 2 - SPAN)
          food.y = parseInt(Math.random() * SPAN * 2 - SPAN)
          app.publish('test1channel', JSON.stringify({ type: 'update-eat', pid: player.id, fid: food.id, fNewX: food.x, fNewY: food.y }))
        } else if (data.type === 'leave') {
          state.players = state.players.filter((p) => p.id !== data.id)
        }
      } catch (error) {
        console.error('Error processing message:', error)
      }
    },
    close: (ws, code, message) => {
      state.players = state.players.filter((p) => p.id !== ws.id)
      app.publish('test1channel', JSON.stringify({ type: 'update-players', players: state.players }))
    },
  })
  .listen(WS_PORT, (listenSocket) => {
    if (listenSocket) {
      console.log(`Listening to port ${WS_PORT}`)
    }
  })
