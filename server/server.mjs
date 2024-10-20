import { createServer } from 'node:http'
import { promises as fs } from 'node:fs'
import { join, extname } from 'node:path'
import { App } from 'uWebSockets.js'
import { networkInterfaces } from 'node:os'
import qrcode from 'qrcode-terminal'
import { FOOD_SPAWN_RADIUS, NUM_FOOD_PARTICLES } from './constants.mjs'

const CONTENT_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  default: 'text/plain',
}

const HTTP_PORT = 3000
const WS_PORT = 3001

const state = {
  players: {},
  food: [],
}

function getSpawnXY() {
  const theta = Math.random() * Math.PI * 2
  const r = Math.random() ** 0.5 * FOOD_SPAWN_RADIUS
  return { x: r * Math.cos(theta), y: r * Math.sin(theta) }
}

function initState() {
  state.players = [] // { name, id, x, y, mass, color }
  state.food = [] // { x, y }
  for (let i = 0; i < NUM_FOOD_PARTICLES; i++) {
    const { x, y } = getSpawnXY()
    state.food.push({ id: i, x, y })
  }
}
initState()

async function startHttpServer(port) {
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

  const interfaces = networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return new Promise((resolve, reject) => {
          server.listen(port, net.address, (e) => {
            if (e) {
              reject(`An error occurred on ${net.address}: ${e}`)
            } else {
              console.log(`Listening on ${net.address}:${port}`)
              resolve(net.address)
            }
          })
        })
      }
    }
  }
}

async function generateQRCode(ip, port) {
  qrcode.generate(`http://${ip}:${port}`, { small: true })
}

async function startWsServer(ip, port) {
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
            const { x, y } = getSpawnXY()
            food.x = x
            food.y = y
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
    .listen(port, (listenSocket) => {
      if (listenSocket) {
        console.log(`Listening to ws://${ip}:${port}`)
      } else {
        console.error(`Failed to listen to ws://${ip}:${port}`)
      }
    })
}

async function main() {
  try {
    const ip = await startHttpServer(HTTP_PORT)
    await generateQRCode(ip, HTTP_PORT)
    await startWsServer(ip, WS_PORT)
  } catch (error) {
    console.error('Error starting servers:', error)
  }
}

main()
