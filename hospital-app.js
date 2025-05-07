const express = require('express')
const app = express()
const port = 8080
app.use(express.json())
const server = http.createServer(app);

let HospitalInfoList = []
let nextId = 1 

app.post('/addPatient', (req, res) => {
    const { patientName, triageLevel, Doctor } = req.body
    const waitTime = 0
    if (!patientName || !triageLevel || !Doctor) {
      return res.status(400).send({ message: 'All fields are required.' })
    }
  
    const newPatient = {id: nextId++,patientName,triageLevel,waitTime,Doctor}
  
    HospitalInfoList.push(newPatient)
    res.status(201).send(newPatient)
  })