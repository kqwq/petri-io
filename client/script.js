import { GameManager } from './game.js'

function addEventListeners(gm, canvas) {
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  })
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  const overlayDiv = document.getElementById('overlay')
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
    gm.join()
    overlayDiv.style.display = 'none'
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
}

function main() {
  // Create socket object
  const url = new URL(window.location.href)
  const socket = new WebSocket(`ws://${url.hostname}:3001/petri-io`)

  // Set connection text
  const ct = document.getElementById('connection-text')
  const spinner = document.getElementById('connection-loading')
  ct.textContent = 'Connecting to server...'

  // Create Game Manager instance and set up game loop
  const canvas = document.getElementsByTagName('canvas')[0]
  const ctx = canvas.getContext('2d')
  const gm = new GameManager(ctx, socket)
  const gameLoop = () => {
    gm.draw()
    requestAnimationFrame(gameLoop)
  }
  gameLoop()

  // Window/document event listeners
  addEventListeners(gm, canvas)

  // Add socket event listeners
  socket.addEventListener('open', () => {
    ct.textContent = 'Connected to server'
    spinner.style.display = 'none'
    gm.onSocketOpen()
  })
  socket.addEventListener('message', gm.onSocketMessage.bind(gm))
  socket.addEventListener('close', () => {
    gm.you.active = false
    const overlayDiv = document.getElementById('overlay')
    overlayDiv.style.display = 'flex'
    ct.textContent = 'Disconnected from server'
  })
}
document.addEventListener('DOMContentLoaded', main)
