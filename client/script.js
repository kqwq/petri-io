const BORDER_RADIUS = 400
const BORDER_THICKNESS = 2
import { tools } from './tools.js'

class Food {
  constructor(id, x, y, mass = 1) {
    this.id = id
    this.x = x
    this.y = y
    this.mass = mass
    this.color = tools.randFullSaturationColor()
  }

  getRadius() {
    return 1
  }

  draw(ctx, X, Y, S) {
    // Draw a circle
    const radius = Math.sqrt(this.mass)
    ctx.beginPath()
    ctx.arc(X(this.x), Y(this.y), S(radius), 0, 2 * Math.PI)
    ctx.fillStyle = this.color
    ctx.fill()
  }
}

class Player {
  constructor(name, id = Math.random(), x = 0, mass = 10, y = 0, color = undefined) {
    this.name = name
    this.id = id
    this.mass = mass
    this.score = 0
    this.x = x
    this.y = y
    this.velX = 0
    this.velY = 0
    this.score = 0
    this.color = color ?? tools.randFullSaturationColor()
    this.outline = tools.lerpColor(this.color, '#000000', 0.25)
    this.direction = 0
    this.speed = 0
  }

  getMaxSpeed() {
    return (1 / Math.sqrt(this.mass)) * 2.5
  }
  getRadius() {
    return Math.sqrt(this.mass)
  }

  repr() {
    return {
      name: this.name,
      id: this.id,
      x: this.x,
      y: this.y,
      mass: this.mass,
      color: this.color,
    }
  }

  draw(ctx, X, Y, S) {
    // Movement
    const gotoVelX = Math.cos(this.direction) * this.speed
    const gotoVelY = Math.sin(this.direction) * this.speed
    this.velX += (gotoVelX - this.velX) * 0.25
    this.velY += (gotoVelY - this.velY) * 0.25
    this.x += this.velX
    this.y += this.velY

    // Collide with border
    const dist = Math.sqrt(this.x * this.x + this.y * this.y)
    if (dist > BORDER_RADIUS - this.getRadius()) {
      const angle = Math.atan2(this.y, this.x)
      this.x = Math.cos(angle) * (BORDER_RADIUS - this.getRadius())
      this.y = Math.sin(angle) * (BORDER_RADIUS - this.getRadius())
    }

    // Draw a circle
    const radius = this.getRadius()
    ctx.beginPath()
    ctx.arc(X(this.x), Y(this.y), S(radius), 0, 2 * Math.PI)
    ctx.fillStyle = this.color
    ctx.fill()
    ctx.lineWidth = S(radius * 0.05)
    ctx.strokeStyle = this.outline
    ctx.stroke()

    // Name tag
    ctx.font = `12px Arial`
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(this.name, X(this.x), Y(this.y) - 16)
    ctx.fillText(this.mass, X(this.x), Y(this.y))
  }
}

class GameManager {
  constructor() {
    this.you = null
    this.players = []
    this.food = []
    this.mouse = { x: 0, y: 0, out: false }
    this.cam = { x: 0, y: 0, zoom: 20 }
    this.keys = {}
    this.tick = 0
  }

  init(canvasContext, isDebug) {
    this.ctx = canvasContext
    const yourName = document.getElementById('name').value
    this.you = new Player(yourName)
    this.players.push(this.you)
    if (isDebug) {
      // Scatter food everywhere from -1000 to 1000
      const span = 400
      for (let i = 0; i < 1000; i++) {
        this.food.push(new Food(Math.random(), tools.rantInt(-span, span), tools.rantInt(-span, span)))
      }
    }
    socket.send(JSON.stringify({ type: 'join', joiner: this.you.repr() }))
  }
  handleKeyDown(e) {
    this.keys[e.key] = true
  }
  handleKeyUp(e) {
    this.keys[e.key] = false
  }
  updateMouse(e) {
    this.mouse = { x: e.clientX, y: e.clientY, out: false }
  }
  handleWheel(e) {
    const zoomPower = e.deltaY > 0 ? 0.9 : 1.1
    this.cam.zoom *= zoomPower
  }
  handleMouseOut() {
    this.mouse.out = true
  }
  onSocketOpen() {}

  onSocketMessage(e) {
    const data = JSON.parse(e.data)
    // console.log(data)
    switch (data.type) {
      case 'init-food':
        this.food = []
        for (const { id, x, y } of data.state.food) {
          this.food.push(new Food(id, x, y))
        }
        break
      case 'update-movement':
        const player2 = this.players.find((p) => p.id === data.id)
        if (!player2) return
        player2.x = data.x
        player2.y = data.y
        player2.speed = data.s
        player2.direction = data.d
        break
      case 'update-players':
        console.log('update-players', data.players, gm.players, gm.you)
        const incomingPlayerIds = data.players.map((p) => p.id)
        for (const { name, id, x, y, mass, color } of data.players) {
          const p = this.players.find((p) => p.id === id)

          if (p) {
            p.x = x
            p.y = y
            p.mass = mass
            p.color = color
            console.log('original')
          } else {
            this.players.push(new Player(name, id, x, mass, y, color))
            console.log('new')
          }
        }
        // If a player is not in the incoming list, remove it
        this.players = this.players.filter((p) => incomingPlayerIds.includes(p.id))
        break

      case 'update-eat':
        const player = this.players.find((p) => p.id === data.pid)
        const food = this.food.find((f) => f.id === data.fid)
        player.mass += 1
        player.score += 1
        food.x = data.fNewX
        food.y = data.fNewY
        break
    }
  }
  updateScoreAndLeaderboard() {
    const leaderboard = document.getElementById('leaderboard-contents')
    leaderboard.innerHTML = ''
    this.players.sort((a, b) => b.mass - a.mass)
    for (const p of this.players) {
      const li = document.createElement('li')
      li.innerText = `${p.name} - ${p.mass}`
      leaderboard.appendChild(li)
    }
    const score = document.getElementById('score')
    score.innerText = this.you.score
  }

  X(pos) {
    // Convert x position to screen position
    return (pos - this.cam.x) * this.cam.zoom + innerWidth / 2
  }
  Y(pos) {
    // Convert y position to screen position
    return (pos - this.cam.y) * this.cam.zoom + innerHeight / 2
  }
  S(pos) {
    // Convert size to screen size
    return pos * this.cam.zoom
  }
  RevX(pos) {
    // Convert screen position to x position
    return (pos - innerWidth / 2) / this.cam.zoom + this.cam.x
  }
  RevY(pos) {
    // Convert screen position to y position
    return (pos - innerHeight / 2) / this.cam.zoom + this.cam.y
  }
  RevS(pos) {
    // Convert screen size to size
    return pos / this.cam.zoom
  }

  draw() {
    if (this.mouse.out) {
      this.you.speed *= 0.9
    } else {
      let cx = 0,
        cy = 0
      if (this.keys['w'] || this.keys['ArrowUp']) cy = -1
      if (this.keys['s'] || this.keys['ArrowDown']) cy = 1
      if (this.keys['a'] || this.keys['ArrowLeft']) cx = -1
      if (this.keys['d'] || this.keys['ArrowRight']) cx = 1
      if (cx || cy) {
        this.you.direction = Math.atan2(cy, cx)
        this.you.speed = this.you.getMaxSpeed()
      } else {
        // Mouse controls
        const dx = this.mouse.x - this.X(this.you.x)
        const dy = this.mouse.y - this.Y(this.you.y)
        const mouseDistanceRatio = (Math.sqrt(dx * dx + dy * dy) / Math.min(innerWidth, innerHeight)) * 4 // Reach from half the screen
        this.you.direction = Math.atan2(dy, dx)
        if (mouseDistanceRatio < 0.1) {
          this.you.speed = 0
        } else {
          this.you.speed = this.you.getMaxSpeed() * Math.min(1, mouseDistanceRatio)
        }
      }
    }

    // Update logic -> camera
    this.cam.x = this.you.x
    this.cam.y = this.you.y

    // Update logic -> collision with food
    for (const f of this.food) {
      const chX = this.you.x - f.x
      const chY = this.you.y - f.y
      if (chX * chX + chY * chY < this.you.getRadius() * this.you.getRadius() + f.getRadius() * f.getRadius()) {
        socket.send(JSON.stringify({ type: 'eat', pid: this.you.id, fid: f.id }))
      }
    }

    // Update and draw score and leaderboard HTML
    this.updateScoreAndLeaderboard()

    // Socket logic
    if (this.tick % 10 === 0) {
      socket.send(
        JSON.stringify({
          type: 'move',
          id: this.you.id,
          x: this.you.x,
          y: this.you.y,
          s: this.you.speed,
          d: this.you.direction,
        })
      )
    }
    this.tick++

    // Draw logic

    // Draw background
    this.ctx.clearRect(0, 0, innerWidth, innerHeight)
    this.ctx.fillStyle = '#111'
    this.ctx.fillRect(0, 0, innerWidth, innerHeight)

    // Draw surrounding circular border
    this.ctx.beginPath()
    this.ctx.arc(this.X(0), this.Y(0), this.S(BORDER_RADIUS + BORDER_THICKNESS / 2), 0, 2 * Math.PI)
    this.ctx.strokeStyle = '#fff'
    this.ctx.lineWidth = this.S(BORDER_THICKNESS)
    this.ctx.stroke()

    // Draw elements
    for (const f of this.food) {
      f.draw(this.ctx, this.X.bind(this), this.Y.bind(this), this.S.bind(this))
    }
    for (const p of this.players) {
      p.draw(this.ctx, this.X.bind(this), this.Y.bind(this), this.S.bind(this))
    }
  }
}

const gm = new GameManager()
const url = new URL(window.location.href)
const socket = new WebSocket(`ws://${url.hostname}:3001/budget-agario`)
socket.addEventListener('open', () => {
  console.log('Connected to server')
  gm.onSocketOpen()
})
socket.addEventListener('message', gm.onSocketMessage.bind(gm))
socket.addEventListener('close', () => {
  console.log('Disconnected from server')
  alert('Disconnected from server')
  // Force reload page
  // location.reload();
})

function gameLoop() {
  gm.draw()
  requestAnimationFrame(gameLoop)
}

function onResize() {
  const canvas = document.getElementsByTagName('canvas')[0]
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}
document.addEventListener('resize', onResize)
document.addEventListener('DOMContentLoaded', () => {
  onResize()
  const sgbOverlay = document.getElementById('overlay')
  const startButton = document.getElementById('start-game-button')
  const nameInput = document.getElementById('name')
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      startButton.click()
    }
  })
  startButton.addEventListener('click', () => {
    if (!nameInput.checkValidity()) {
      alert('Invalid name')
      return
    }
    const canvas = document.getElementsByTagName('canvas')[0]
    const ctx = canvas.getContext('2d')
    gm.init(ctx)
    requestAnimationFrame(gameLoop)
    sgbOverlay.style.display = 'none'
  })
})
document.addEventListener('keydown', (e) => {
  gm.handleKeyDown(e)
})
document.addEventListener('keyup', (e) => {
  gm.handleKeyUp(e)
})
document.addEventListener('mousemove', (e) => {
  gm.updateMouse(e)
})
document.addEventListener('wheel', (e) => {
  gm.handleWheel(e)
})
document.addEventListener('mouseout', () => {
  gm.handleMouseOut()
})
