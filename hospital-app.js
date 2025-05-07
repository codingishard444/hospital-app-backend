const express = require('express')
const app = express()
const port = 8080
const http = require('http')
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
    res.send(updatedPatient)
  })
  
app.delete('/deleteListById/:id', (req, res) => {
    const id = parseInt(req.params.id)
    const initialLength = HospitalInfoList.length
    HospitalInfoList = HospitalInfoList.filter((p) => p.id !== id)
  
    if (HospitalInfoList.length === initialLength) {
      return res.status(404).send({ message: 'Patient not found.' })
    }
    res.send({ message: 'Patient deleted.' })
})
  
server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`)
})