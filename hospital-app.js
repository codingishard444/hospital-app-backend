const express = require('express')
const app = express()
const http = require('http');
const cors = require('cors')
const { Server } = require('socket.io');
const port = 8080

app.use(cors({
  origin: ['http://localhost:8080','https://clever-preferably-bird.ngrok-free.app','https://hospital-app-alpha.vercel.app'],
  methods: ['GET', 'POST', 'DELETE'],
}));


app.use(express.json())

// Create HTTP server using the Express app
const server = http.createServer(app);

// Attach Socket.IO to the HTTP server
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:8080','https://clever-preferably-bird.ngrok-free.app','https://hospital-app-alpha.vercel.app'],
    methods: ['GET', 'POST', 'DELETE'],
  },
});
let HospitalHistory = [] 
let historyId = 1
let HospitalInfoList = []
let nextId = 1 

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send current patient list immediately
  socket.emit('update', {
    list:[...HospitalInfoList],
    history:[...HospitalHistory]
});

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

function formatTime(seconds) {
    const hrs = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
}

setInterval(() => {
  HospitalInfoList.forEach((patient) => {
    patient.waitTime += 1

    patient.formattedWaitTime = formatTime(patient.waitTime);

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
  if (HospitalInfoList.length > 1) {
  HospitalInfoList.sort((a, b) => {
    return parseInt(a.triageLevel) - parseInt(b.triageLevel);
  });
  }
  io.emit('update', {
    list:[...HospitalInfoList],
    history:[...HospitalHistory]
  });
}, 1000)


app.post('/addList', (req, res) => {
  const { patientName, triageLevel} = req.body
  const waitTime = 0
  const formattedWaitTime = formatTime(waitTime)
  const Doctor = ''
  if (!patientName || !triageLevel) {
    return res.status(400).send({ message: 'All fields are required.' })
  }

  const newPatient = {id: nextId++,patientName,triageLevel,waitTime,Doctor,formattedWaitTime}

  HospitalInfoList.push(newPatient)
  io.emit('update', {
    list:[...HospitalInfoList],
    history:[...HospitalHistory]
  });
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

app.put('/updateTriageLevelById/:id', (req, res) => {
  const id = parseInt(req.params.id)
  const patientIndex = HospitalInfoList.findIndex((p) => p.id === id)

  if (patientIndex === -1) {
    return res.status(404).send({ message: 'Patient not found.' })
  }

  const {triageLevel} = req.body
  const updatedPatient = {
    ...HospitalInfoList[patientIndex],
    triageLevel: triageLevel || HospitalInfoList[patientIndex].triageLevel,
  }

  HospitalInfoList[patientIndex] = updatedPatient
  io.emit('update', {
    list:[...HospitalInfoList],
    history:[...HospitalHistory]
  });
  res.send(updatedPatient)
})

app.delete('/admitPatient/:id', (req, res) => {
  const id = parseInt(req.params.id)
  const {enteredDoctor} = req.body
  const patientIndex = HospitalInfoList.findIndex((p) => p.id === id)
  if (patientIndex === -1) {
    return res.status(404).send({ message: 'Patient not found.' });
  }
  admittedPatient = HospitalInfoList[patientIndex]
  admittedPatient.Doctor = enteredDoctor
  const newAdmittedPatient = { HistoryId: historyId++,...admittedPatient }
  HospitalHistory.push(newAdmittedPatient)
  HospitalInfoList.splice(patientIndex, 1);
  io.emit('update', {
    list:[...HospitalInfoList],
    history:[...HospitalHistory]
  });
  res.send({ message: 'Patient deleted.' })
})

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
