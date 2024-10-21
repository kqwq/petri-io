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
  constructor(name, id = Math.random(), x = 0, y = 0, mass = 10, color = undefined) {
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
    this.active = false // If the player is still in the game
  }
  getMaxSpeed() {
    return (1 / Math.sqrt(this.mass)) * 2.5
  }
  getRadius() {
    return Math.sqrt(this.mass)
  }
  repr() {
    return {
      active: this.active,
      name: this.name,
      id: this.id,
      x: this.x,
      y: this.y,
      mass: this.mass,
      color: this.color,
    }
  }

  draw(ctx, X, Y, S) {
    if (!this.active) return
    // Movement
    // console.log(this.x, this.y, this.direction, this.speed)
    const gotoVelX = Math.cos(this.direction) * this.speed
    const gotoVelY = Math.sin(this.direction) * this.speed
    this.velX += (gotoVelX - this.velX) * 0.25
    this.velY += (gotoVelY - this.velY) * 0.25
    // console.log(this.x)
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
    ctx.font = `bold 15px Arial`
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.strokeText(this.name, X(this.x), Y(this.y) - 16)
    ctx.fillText(this.name, X(this.x), Y(this.y) - 16)
    ctx.strokeText(this.mass, X(this.x), Y(this.y))
    ctx.fillText(this.mass, X(this.x), Y(this.y))
  }
}

class GameManager {
  constructor(ctx, socket) {
    this.ctx = ctx
    this.socket = socket
    this.you = new Player('Unnamed', tools.randId(), 0, 0, 10)
    this.players = []
    this.food = []
    this.mouse = { x: 0, y: 0, out: false }
    this.cam = { x: 0, y: 0, zoom: 20 }
    this.keys = {}
    this.tick = 0
  }

  join() {
    this.you.name = document.getElementById('name').value
    this.you.active = true
    if (this.players.find((p) => p.id === this.you.id)) {
      this.socket.send(JSON.stringify({ type: 'rejoin', joiner: this.you.repr() }))
    } else {
      this.players.push(this.you)
      this.socket.send(JSON.stringify({ type: 'join', joiner: this.you.repr() }))
    }
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

  youDied() {
    console.log('You died')
    const overlayDiv = document.getElementById('overlay')
    const deathInfoDiv = document.getElementById('death-info')
    overlayDiv.style.display = 'flex'
    deathInfoDiv.style.display = 'block'
  }

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
        const p = this.players.find((p) => p.id === data.id)
        if (!p) return
        p.x = data.x
        p.y = data.y
        p.speed = data.s
        p.direction = data.d
        break
      case 'update-players':
        console.log('update-players', this.players)
        const incomingPlayerIds = data.players.map((p) => p.id)
        for (const { active, name, id, x, y, mass, color } of data.players) {
          const p = this.players.find((p) => p.id === id)
          if (id === this.you.id && this.you.active && !active) {
            this.youDied()
          }
          if (p) {
            p.active = active
            p.x = x
            p.y = y
            p.mass = mass
            p.color = color
          } else {
            const newP = new Player(name, id, x, y, mass, color)
            newP.active = true
            this.players.push(newP)
          }
        }
        // If a player is not in the incoming list, remove it
        this.players = this.players.filter((p) => incomingPlayerIds.includes(p.id))
        // Finally, sort the players by mass
        this.players.sort((a, b) => b.mass - a.mass)
        break

      case 'update-eat':
        const player = this.players.find((p) => p.id === data.pid)
        const food = this.food.find((f) => f.id === data.fid)
        player.mass += 1
        player.score += 1
        food.x = data.fNewX
        food.y = data.fNewY
        // Sort the players by mass
        this.players.sort((a, b) => b.mass - a.mass)
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
    this.tick++
    if (this.you.active) {
      let sendDirection = 0
      let sendSpeed = 0
      if (this.mouse.out) {
        this.you.speed *= 0.9
        sendSpeed = this.you.speed
        sendDirection = this.you.direction
      } else {
        let cx = 0,
          cy = 0
        if (this.keys['w'] || this.keys['ArrowUp']) cy = -1
        if (this.keys['s'] || this.keys['ArrowDown']) cy = 1
        if (this.keys['a'] || this.keys['ArrowLeft']) cx = -1
        if (this.keys['d'] || this.keys['ArrowRight']) cx = 1
        if (cx || cy) {
          sendDirection = Math.atan2(cy, cx)
          sendSpeed = this.you.getMaxSpeed()
        } else {
          // Mouse controls
          const dx = this.mouse.x - this.X(this.you.x)
          const dy = this.mouse.y - this.Y(this.you.y)
          const mouseDistanceRatio = (Math.sqrt(dx * dx + dy * dy) / Math.min(innerWidth, innerHeight)) * 4 // Reach from half the screen
          sendDirection = Math.atan2(dy, dx)
          if (mouseDistanceRatio < 0.1) {
            sendSpeed = 0
          } else {
            sendSpeed = this.you.getMaxSpeed() * Math.min(1, mouseDistanceRatio)
          }
        }
      }
      // Send your player movement to socket
      if (this.tick % 10 === 0) {
        this.socket.send(
          JSON.stringify({
            type: 'move',
            id: this.you.id,
            x: this.you.x,
            y: this.you.y,
            s: sendSpeed,
            d: sendDirection,
          })
        )
      }
    }

    // Update logic -> camera
    this.cam.x = this.you.x
    this.cam.y = this.you.y

    // // Update logic -> collision with food
    // if (this.you.active) {
    //   for (const f of this.food) {
    //     const chX = this.you.x - f.x
    //     const chY = this.you.y - f.y
    //     if (chX * chX + chY * chY < this.you.getRadius() * this.you.getRadius() + f.getRadius() * f.getRadius()) {
    //       this.socket.send(JSON.stringify({ type: 'eat', pid: this.you.id, fid: f.id }))
    //     }
    //   }
    // }

    // // Update logic -> collision with other players
    // if (this.you.active) {
    //   for (const p of this.players) {
    //     if (p.id === this.you.id) continue
    //     const chX = this.you.x - p.x
    //     const chY = this.you.y - p.y
    //     if (chX * chX + chY * chY < this.you.getRadius() * this.you.getRadius() + p.getRadius() * p.getRadius()) {
    //       if (this.you.mass > p.mass) {
    //         this.socket.send(JSON.stringify({ type: 'leave', id: p.id }))
    //         this.you.mass += p.mass
    //         this.you.score += p.score
    //       }
    //     }
    //   }
    // }

    // // Socket logic
    // if (this.you.active) {
    //   if (this.tick % 10 === 0) {
    //     this.socket.send(
    //       JSON.stringify({
    //         type: 'move',
    //         id: this.you.id,
    //         x: this.you.x,
    //         y: this.you.y,
    //         s: this.you.speed,
    //         d: this.you.direction,
    //       })
    //     )
    //   }
    //   this.tick++
    // }

    // Draw logic

    // Draw background
    this.ctx.clearRect(0, 0, innerWidth, innerHeight)
    this.ctx.fillStyle = 'white'
    this.ctx.fillRect(0, 0, innerWidth, innerHeight)

    // Draw gridlines
    this.ctx.strokeStyle = '#ddd'
    this.ctx.lineWidth = this.S(0.2)
    for (let i = -BORDER_RADIUS; i <= BORDER_RADIUS; i += 10) {
      this.ctx.beginPath()
      const traceCircle = Math.sqrt(BORDER_RADIUS * BORDER_RADIUS - i * i)
      this.ctx.moveTo(this.X(i), this.Y(-traceCircle))
      this.ctx.lineTo(this.X(i), this.Y(traceCircle))
      this.ctx.stroke()
      this.ctx.beginPath()
      this.ctx.moveTo(this.X(-traceCircle), this.Y(i))
      this.ctx.lineTo(this.X(traceCircle), this.Y(i))
      this.ctx.stroke()
    }

    // Draw surrounding circular border
    this.ctx.beginPath()
    this.ctx.arc(this.X(0), this.Y(0), this.S(BORDER_RADIUS + BORDER_THICKNESS / 2), 0, 2 * Math.PI)
    this.ctx.strokeStyle = '#ddd'
    this.ctx.lineWidth = this.S(BORDER_THICKNESS)
    this.ctx.stroke()

    // Draw elements
    for (const f of this.food) {
      f.draw(this.ctx, this.X.bind(this), this.Y.bind(this), this.S.bind(this))
    }
    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i]
      p.draw(this.ctx, this.X.bind(this), this.Y.bind(this), this.S.bind(this))
    }

    // Every 1 second, update score and leaderboard
    if (this.tick % 60 === 0) {
      this.updateScoreAndLeaderboard()
    }
  }
}

export { GameManager }
