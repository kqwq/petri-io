// Helper functions
$ = (x) => document.querySelector(x)
$$ = (x) => document.querySelectorAll(x)
const et = {
  randFullSaturationColor: () => {
    const h = Math.floor(Math.random() * 360)
    const s = 1
    const l = 0.5
    const c = (1 - Math.abs(2 * l - 1)) * s
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = l - c / 2
    let r, g, b
    if (h < 60) {
      ;[r, g, b] = [c, x, 0]
    } else if (h < 120) {
      ;[r, g, b] = [x, c, 0]
    } else if (h < 180) {
      ;[r, g, b] = [0, c, x]
    } else if (h < 240) {
      ;[r, g, b] = [0, x, c]
    } else if (h < 300) {
      ;[r, g, b] = [x, 0, c]
    } else {
      ;[r, g, b] = [c, 0, x]
    }
    r = Math.floor((r + m) * 255)
      .toString(16)
      .padStart(2, '0')
    g = Math.floor((g + m) * 255)
      .toString(16)
      .padStart(2, '0')
    b = Math.floor((b + m) * 255)
      .toString(16)
      .padStart(2, '0')
    return `#${r}${g}${b}`
  },
  lerpColor: (aIn, bIn, amount) => {
    const aHex = parseInt(aIn.slice(1), 16)
    const bHex = parseInt(bIn.slice(1), 16)
    const r1 = aHex >> 16
    const g1 = (aHex >> 8) & 0xff
    const b1 = aHex & 0xff
    const r2 = bHex >> 16
    const g2 = (bHex >> 8) & 0xff
    const b2 = bHex & 0xff
    const r = Math.round(r1 + (r2 - r1) * amount)
    const g = Math.round(g1 + (g2 - g1) * amount)
    const b = Math.round(b1 + (b2 - b1) * amount)
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  },
}
const getRandomId = () => Math.random().toString(36).slice(2)
const icons = {
  stop: '<i class="material-icons" style="color: red;">stop</i>',
  delete: '<i class="material-icons" style="color: gray;">delete</i>',
  play: `<i class="material-icons" style="color: green;">play_arrow</i>`,
  wysiwyg: `<i class="material-icons" style="color: navy;">wysiwyg</i>`,
}

class Node {
  constructor(name) {
    this.id = getRandomId()
    this.bgColor = et.lerpColor(et.randFullSaturationColor(), '#ffffff', 0.9)
    this.name = name
    this.pods = []
  }
}
class Pod {
  constructor(name, ip, port) {
    this.id = getRandomId()
    this.name = name
    this.ip = ip ?? ''
    this.port = port ?? ''
  }
}
const nodes = []

function btnAddNode(optionalName) {
  const nodeName = optionalName ?? prompt('Enter node name')
  const node = new Node(nodeName)
  nodes.push(node)
  renderHtml()
  return node
}
function btnAddPod(id, optionalName, optionalIp, optionalPort) {
  const node = nodes.find((node) => node.id === id)
  const name = optionalName ?? $(`#node-${id} .new-pod-name`).value
  const ip = optionalIp ?? $(`#node-${id} .new-pod-ip`).value
  const port = optionalPort ?? $(`#node-${id} .new-pod-port`).value
  if (node) {
    const pod = new Pod(name, ip, port)
    node.pods.push(pod)
    renderHtml()
    return pod
  } else {
    throw new Error(`No node found with id ${id}`)
  }
}

function debugOnly() {
  const n = btnAddNode('North America Servers')
  btnAddPod(n.id, 'NA Server 1', '192.168.1.1', '5000')
  btnAddPod(n.id, 'NA Server 2', '192.168.1.2', '5001')
  btnAddPod(n.id, 'NA Server 3', '192.168.1.3', '5002')
  const e = btnAddNode('Europe Servers')
  btnAddPod(e.id, 'EU Server 1', '192.168.2.1', '5003')
  btnAddPod(e.id, 'EU Server 2', '192.168.2.2', '5004')
}
document.addEventListener('DOMContentLoaded', () => {
  debugOnly()
})

function renderHtml() {
  // Output as <div class="node">
  //             <div class="pod">
  //               <a>View as Operator</a>
  //               <a href="http://localhost:pod.ip:pod.port" title="pod.ip">pod.name</a>
  //               <div class="pod-control">
  //                 <button>View logs</button>
  //                 <button>Stop</button>
  //                 <button>Delete</button>
  //               </div>
  //             </div>
  //             ...
  //           </div>
  //           ...

  const nodesHtml = nodes
    .map((node) => {
      const podsHtml = node.pods
        .map((pod) => {
          return `<div class="row pod" id="pod-${pod.id}">
            <a class="pod-view" href="http://localhost:${pod.ip}:${pod.port}?admin=true">View as Operator</a>
            <a class="pod-title" href="http://localhost:${pod.ip}:${pod.port}" title="${pod.ip}">${pod.name}</a>
            <div class="pod-control">
          <button title="View Logs">${icons.wysiwyg}</button>
          <button title="Stop Pod">${icons.stop}</button>
          <button title="Delete Pod">${icons.delete}</button>
            </div>
          </div>`
        })
        .join('')
      return `<div class="node" id="node-${node.id}">
            <div class="row">
          <h2>${node.name}</h2>
          <div>
            <button title="Stop Node">${icons.stop}</button>
            <button title="Delete Node">${icons.delete}</button>
          </div>
            </div>
            ${podsHtml}
            <div class="row new-pod">
              <input type="text" placeholder="Name" class="new-pod-name" />
              <input type="text" placeholder="IP" class="new-pod-ip" />
              <input type="number" placeholder="Port" class="new-pod-port" />
              <a onclick="btnAddPod('${node.id}')" href="#" class="new-pod-add">Add Pod</a>
            </div>
        </div>`
    })
    .join('')
  document.getElementById('nodes').innerHTML = nodesHtml
  for (const node of nodes) {
    $(`#node-${node.id}`).style.backgroundColor = node.bgColor
  }
}

async function addNode() {
  const res = await fetch('https://api.coronavirus.data.gov.uk/v1/data')
  const record = await res.json()
  console.log(record)
  document.getElementById('date').innerHTML = record.data[0].date
  document.getElementById('areaName').innerHTML = record.data[0].areaName
  document.getElementById('latestBy').innerHTML = record.data[0].latestBy
  document.getElementById('deathNew').innerHTML = record.data[0].deathNew
}
