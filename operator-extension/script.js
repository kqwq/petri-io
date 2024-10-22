class Node {
  constructor(name) {
    this.name = name
    this.pods = []
  }
}
class Pod {
  constructor(name, ip, port) {
    this.name = name
    this.ip = ip ?? ''
    this.port = port ?? ''
  }
}
const nodes = []

function btnAddNode(e) {
  const nodeName = prompt('Enter node name')
  const node = new Node(nodeName)
  nodes.push(node)
  renderHtml()
}
function addPod(nodeName, podName, ip, port) {
  const node = nodes.find((node) => node.name === nodeName)
  if (node) {
    const pod = new Pod(podName, ip, port)
    node.pods.push(pod)
  }
}

function renderHtml() {
  // Output as <div class="node">
  //             <div class="pod">
  //               <button>View as Operator</button>
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
          return `<div class="pod">
                <button>View as Operator</button>
                <a href="http://localhost:${pod.ip}:${pod.port}" title="${pod.ip}">${pod.name}</a>
                <div class="pod-control">
                  <button>View logs</button>
                  <button>Stop</button>
                  <button>Delete</button>
                </div>
              </div>`
        })
        .join('')
      return `<div class="node">
              ${podsHtml}
            </div>`
    })
    .join('')
  document.getElementById('nodes').innerHTML = nodesHtml
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
fetchData()
