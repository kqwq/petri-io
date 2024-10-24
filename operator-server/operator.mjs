/**
 * On startup, this file runs "minikube start"
 * It listens on http port 5555 for incoming text messages
 * It executes the text message as a shell command and logs the output in console logs here
 */

import { createServer } from 'http'
import { exec } from 'child_process'

const server = createServer((req, res) => {
  let data = ''
  req.on('data', (chunk) => {
    data += chunk
  })
  req.on('end', () => {
    exec(data, (err, stdout, stderr) => {
      if (err) {
        console.error(err)
        res.end(err.message)
      } else {
        console.log(stdout)
        res.end(stdout)
      }
    })
  })
})

server.listen(5555, () => {
  console.log('Server running at http://localhost:5555/')
})

function main() {
  exec('minikube start', (err, stdout, stderr) => {
    if (err) {
      console.error(err)
    } else {
      console.log(stdout)
    }
  })
}
main()
