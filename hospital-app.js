const express = require('express')
const app = express()
const http = require('http');
const cors = require('cors')
const PDFDocument = require('pdfkit');
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
  const { patientName, triageLevel,injuryType} = req.body
  const waitTime = 0
  const formattedWaitTime = formatTime(waitTime)
  const Doctor = ''
  if (!patientName || !triageLevel || !injuryType) {
    return res.status(400).send({ message: 'All fields are required.' })
  }

  const newPatient = {id: nextId++,patientName,triageLevel,injuryType,waitTime,Doctor,formattedWaitTime}

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

app.delete('/clearhistory',(req,res)=>{
  HospitalHistory = []
  io.emit('update', {
    list:[...HospitalInfoList],
    history:[...HospitalHistory]
  });
  res.send({message:"History cleared"})
})

app.get('/downloadhistory', (req, res) => {
  // Create a new PDF document
  const doc = new PDFDocument();
  
  // Set the response headers for PDF download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=hospital_history.pdf');
  
  // Pipe the PDF document to the response
  doc.pipe(res);
  
  // Add title to the PDF
  doc.fontSize(20).text('Hospital Patient History', {
    align: 'center'
  });
  
  // Add current date
  const currentDate = new Date().toLocaleDateString();
  doc.fontSize(12).text(`Generated on: ${currentDate}`, {
    align: 'center'
  });
  
  doc.moveDown(2);
  
  // If there's no history, show a message
  if (HospitalHistory.length === 0) {
    doc.fontSize(14).text('No patient history available.', {
      align: 'center'
    });
  } else {
    // Add header for table
    doc.fontSize(14).text('Patient History', {
      underline: true
    });
    doc.moveDown(1);
    
    // Create table headers
    const tableTop = 160;
    let yPosition = tableTop;
    
    // Draw table headers
    doc.fontSize(10).text('ID', 50, yPosition);
    doc.text('Patient Name', 100, yPosition);
    doc.text('Injury Type', 230, yPosition);
    doc.text('Triage Level', 350, yPosition);
    doc.text('Wait Time', 430, yPosition);
    doc.text('Doctor', 500, yPosition);
    
    yPosition += 20;
    doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
    yPosition += 10;
    
    // Add patient records
    HospitalHistory.forEach((patient, index) => {
      // Check if we need a new page
      if (yPosition > 750) {
        doc.addPage();
        yPosition = 50;
      }
      
      doc.fontSize(10).text(patient.HistoryId.toString(), 50, yPosition);
      doc.text(patient.patientName, 100, yPosition);
      doc.text(patient.injuryType || 'N/A', 230, yPosition);
      doc.text(patient.triageLevel.toString(), 350, yPosition);
      doc.text(patient.formattedWaitTime, 430, yPosition);
      doc.text(patient.Doctor || 'N/A', 500, yPosition);
      
      yPosition += 20;
      
      // Add a light gray line after each row except the last
      if (index < HospitalHistory.length - 1) {
        doc.moveTo(50, yPosition - 5).lineTo(550, yPosition - 5).strokeColor('#CCCCCC').stroke();
        doc.strokeColor('#000000'); // Reset stroke color to black
      }
    });
  }
  
  // Add footer with page numbers
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).text(
      `Page ${i + 1} of ${pageCount}`,
      50,
      doc.page.height - 50,
      { align: 'center' }
    );
  }
  
  // Finalize the PDF and end the response
  doc.end();
});
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
