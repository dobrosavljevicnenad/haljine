const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Express i server
const app = express();
const server = http.createServer(app);

// Cloudinary konfiguracija
cloudinary.config({
  cloud_name: 'dnz2tb20t',
  api_key: '458595913545267',
  api_secret: 'bFowaB8jtnz44QhBZTVgTI29pWw',
});

// Multer storage za Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'haljine', // folder u Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png'],
  },
});

const upload = multer({ storage });

// MongoDB konekcija
mongoose.connect('mongodb+srv://ndobrosavljevic01:admin@haljine.usfr19e.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB konektovan'))
  .catch(err => console.error('❌ Greška pri konekciji:', err));

// Schema
const DressSchema = new mongoose.Schema({
  naziv: String,
  slika: String, // URL slike sa Cloudinary
  lager: [
    {
      boja: String,
      kolicina: Number,
    },
  ],
});

const Dress = mongoose.model('Dress', DressSchema);

// Middleware
const corsOptions = {
  origin: function (origin, callback) {
    console.log("Origin:", origin);
    const allowedOrigins = ['http://localhost:4200', 'https://haljine.onrender.com', 'https://haljine.netlify.app'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

app.use(express.json());

// Upload slike na Cloudinary
app.post('/api/upload', upload.single('slika'), (req, res) => {
  if (!req.file) return res.status(400).send({ error: 'Fajl nije prosleđen' });
  // URL do slike na Cloudinary
  res.json({ url: req.file.path });
});

// GET sve haljine
app.get('/api/haljine', async (req, res) => {
  const haljine = await Dress.find();
  res.json(haljine);
});

// POST nova haljina
app.post('/api/haljine', async (req, res) => {
  const nova = new Dress(req.body);
  await nova.save();
  res.json({ message: "OK" });
});

// POST naručivanje haljine (smanji količinu)
app.post('/api/naruci/:id', async (req, res) => {
  const { boja, kolicina } = req.body;
  const haljina = await Dress.findById(req.params.id);

  if (!haljina) return res.status(404).send({ error: 'Haljina nije pronađena' });

  const entry = haljina.lager.find((e) => e.boja === boja);

  if (!entry || entry.kolicina < kolicina) {
    return res.status(400).send({ error: 'Nema dovoljno na lageru' });
  }

  entry.kolicina -= kolicina;
  await haljina.save();
  res.json({ message: "OK" });
});

// PUT izmena haljine
app.put('/api/haljine/:id', async (req, res) => {
  try {
    await Dress.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ message: "Izmenjeno" });
  } catch (err) {
    res.status(500).json({ error: 'Greška pri izmeni' });
  }
});

app.get('/', (req, res) => {
  res.send('🎉 Backend API radi. Možeš koristiti /api/haljine kako bi dobio prikaz svih haljina.');
});

// Start servera
server.listen(3000, () => console.log('🚀 Server radi na portu 3000'));
