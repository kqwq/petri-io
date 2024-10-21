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
  state.players = [] // { name, id, x, y, mass, color, active }
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
              console.log(`Listening to http://${net.address}:${port}`)
              resolve(net.address)
            }
          })
        })
      }
    }
  }
}

async function generateQRCode(ip, port) {
  qrcode.generate(`${ip}:${port}`, { small: true })
}

async function startWsServer(ip, port) {
  const app = new App()

  app
    .ws('/petri-io', {
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
          } else if (data.type === 'rejoin') {
            const player = state.players.find((p) => p.id === data.joiner.id)
            if (!player) return
            player.active = true
            app.publish('test1channel', JSON.stringify({ type: 'update-players', players: state.players }))
          } else if (data.type === 'move') {
            const player = state.players.find((p) => p.id === data.id)
            if (!player) return
            player.x = data.x
            player.y = data.y
            app.publish('test1channel', JSON.stringify({ type: 'update-movement', id: player.id, x: player.x, y: player.y, s: data.s, d: data.d }))
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
        console.log(`Started websocket server on port ${port}`)
      } else {
        console.error(`Failed to listen to websocket server on port ${port}`)
      }
    })

  return app
}

function getPlayerRadius(mass) {
  return Math.sqrt(mass)
}
function getFoodRadius() {
  return 1
}

function serverGameLoop(app) {
  // Collision with players and food
  for (const player of state.players) {
    if (!player.active) continue
    for (const food of state.food) {
      const dx = player.x - food.x
      const dy = player.y - food.y
      const distanceSq = dx * dx + dy * dy
      if (distanceSq <= getPlayerRadius(player.mass) ** 2 - getFoodRadius() ** 2) {
        player.mass += 1
        const { x, y } = getSpawnXY()
        food.x = x
        food.y = y
        app.publish('test1channel', JSON.stringify({ type: 'update-eat', pid: player.id, fid: food.id, fNewX: food.x, fNewY: food.y }))
      }
    }
  }

  // Collision with other players
  for (const player of state.players) {
    if (!player.active) continue
    for (const other of state.players) {
      if (!other.active) continue
      if (player.id === other.id) continue
      // If player eats other player
      if (player.mass <= other.mass) continue
      const dx = player.x - other.x
      const dy = player.y - other.y
      const distanceSq = dx * dx + dy * dy
      if (distanceSq <= getPlayerRadius(player.mass) ** 2 - getPlayerRadius(other.mass) ** 2) {
        player.mass += other.mass
        other.active = false
        app.publish('test1channel', JSON.stringify({ type: 'update-players', players: state.players }))
      }
    }
  }
}

async function main() {
  try {
    const ip = await startHttpServer(HTTP_PORT)
    await generateQRCode(ip, HTTP_PORT)
    const app = await startWsServer(ip, WS_PORT)
    const interval = setInterval(() => {
      serverGameLoop(app)
    }, 1000 / 60)
  } catch (error) {
    console.error('Error starting servers:', error)
  }
}

main()
