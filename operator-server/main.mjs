import express from 'express'
import { exec } from 'child_process'

const app = express()
app.use(express.json())

const execWrapper = (command, res) => {
  console.log(`Running command: ${command}`)
  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error(stderr)
      res.status(500).send(err.message)
    } else {
      console.log(stdout)
      res.send(stdout)
    }
  })
}
const execWrapperReturn = async (command) => {
  console.log(`Running command: ${command}`)
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error(stderr)
        reject(err.message)
      } else {
        console.log(stdout)
        resolve(stdout)
      }
    })
  })
}

app.post('/node/start/:name', (req, res) => {
  const { name } = req.params
  const cmd = `minikube node add -p ${name}`
  execWrapper(cmd, res)
})

app.post('/node/stop/:name', (req, res) => {
  const { name } = req.params
  const cmd = `minikube node stop ${name}`
  execWrapper(cmd, res)
})

app.post('/node/delete/:name', (req, res) => {
  const { name } = req.params
  const cmd = `minikube node delete ${name}`
  execWrapper(cmd, res)
})

app.post('/node/add-pod', (req, res) => {
  const { name, ID, IP, Port } = req.body
  execWrapper(`add-pod ${name} ${ID} ${IP} ${Port}`, res)
})

app.post('/node/stop-pod/:name', (req, res) => {
  const { name } = req.params
  execWrapper(`stop-pod ${name}`, res)
})

app.post('/node/delete-pod/:name', (req, res) => {
  const { name } = req.params
  execWrapper(`delete-pod ${name}`, res)
})

app.post('/create-cluster', async (req, res) => {
  const profiles = await execWrapperReturn('minikube profile list')
  const profile = profiles.split('\n').find((profile) => profile.includes('petri-io-cluster'))
  if (profile) {
    await execWrapperReturn('minikube delete -p petri-io-cluster')
  } else {
    await execWrapperReturn('minikube start -p petri-io-cluster')
  }
  await execWrapperReturn('minikube profile petri-io-cluster')
})

// Disable cors
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

app.listen(5555, () => {
  console.log('Server running at http://localhost:5555/')
})
