const express = require('express')
const app = express()
const http = require('http');
const cors = require('cors')
const { Server } = require('socket.io');
const port = 8080

app.use(cors({
  origin: ['https://clever-preferably-bird.ngrok-free.app','https://hospital-app-ashy.vercel.app'],
  methods: ['GET', 'POST', 'DELETE'],
}));


app.use(express.json())

// Create HTTP server using the Express app
const server = http.createServer(app);

// Attach Socket.IO to the HTTP server
const io = new Server(server, {
  cors: {
    origin: ['https://clever-preferably-bird.ngrok-free.app','https://hospital-app-ashy.vercel.app'],
    methods: ['GET', 'POST', 'DELETE'],
  },
});

let HospitalInfoList = []
let nextId = 1 

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send current patient list immediately
  socket.emit('update', HospitalInfoList);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

setInterval(() => {
  HospitalInfoList.forEach((patient) => {
    patient.waitTime += 1

    if (patient.waitTime % 60 === 0) {
      const currentLevel = parseInt(patient.triageLevel)
      if (!isNaN(currentLevel) && currentLevel > 1) {
        patient.triageLevel = currentLevel - 1
      }
    }
    // console.log(
    //   `Patient ${patient.id}: waitTime=${patient.waitTime}, triageLevel=${patient.triageLevel}`
    // )
  })
  HospitalInfoList.sort((a, b) => {
    return parseInt(a.triageLevel) - parseInt(b.triageLevel);
  });
  io.emit('update', [...HospitalInfoList]);
}, 1000)


app.post('/addList', (req, res) => {
  const { patientName, triageLevel, Doctor } = req.body
  const waitTime = 0
  if (!patientName || !triageLevel || !Doctor) {
    return res.status(400).send({ message: 'All fields are required.' })
  }

  const newPatient = {id: nextId++,patientName,triageLevel,waitTime,Doctor}

  HospitalInfoList.push(newPatient)
  io.emit('update', [...HospitalInfoList]);
  res.status(201).send(newPatient)
})

app.get('/getallList', (req, res) => {
  res.send(HospitalInfoList)
})

app.get('/getListById/:id', (req, res) => {
  const id = parseInt(req.params.id)
  const patient = HospitalInfoList.find((p) => p.id === id)

  if (!patient) {
    return res.status(404).send({ message: 'Patient not found.' })
  }

  res.send(patient)
})

app.put('/updateListById/:id', (req, res) => {
  const id = parseInt(req.params.id)
  const patientIndex = HospitalInfoList.findIndex((p) => p.id === id)

  if (patientIndex === -1) {
    return res.status(404).send({ message: 'Patient not found.' })
  }

  const { patientName, triageLevel, Doctor } = req.body
  const updatedPatient = {
    ...HospitalInfoList[patientIndex],
    patientName: patientName || HospitalInfoList[patientIndex].patientName,
    triageLevel: triageLevel || HospitalInfoList[patientIndex].triageLevel,
    Doctor: Doctor || HospitalInfoList[patientIndex].Doctor,
  }

  HospitalInfoList[patientIndex] = updatedPatient
  io.emit('update', [...HospitalInfoList]);
  res.send(updatedPatient)
})

app.delete('/deleteListById/:id', (req, res) => {
  const id = parseInt(req.params.id)
  const initialLength = HospitalInfoList.length
  HospitalInfoList = HospitalInfoList.filter((p) => p.id !== id)

  if (HospitalInfoList.length === initialLength) {
    return res.status(404).send({ message: 'Patient not found.' })
  }
  io.emit('update', [...HospitalInfoList]);
  res.send({ message: 'Patient deleted.' })
})

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
