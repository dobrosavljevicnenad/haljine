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
    folder: 'haljine',
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
  slika: String,
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

// Anti-keš middleware
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Upload slike na Cloudinary
app.post('/api/upload', upload.single('slika'), (req, res) => {
  if (!req.file) return res.status(400).send({ error: 'Fajl nije prosleđen' });
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

// ✅ POST naručivanje haljine (smanji količinu, atomarno)
app.post('/api/naruci/:id', async (req, res) => {
  const { boja, kolicina } = req.body;

  const haljina = await Dress.findOne({
    _id: req.params.id,
    "lager.boja": boja
  });

  if (!haljina) return res.status(404).send({ error: 'Haljina nije pronađena' });

  const bojaEntry = haljina.lager.find((e) => e.boja === boja);

  if (!bojaEntry || bojaEntry.kolicina < kolicina) {
    return res.status(400).send({ error: 'Nema dovoljno na lageru' });
  }

  await Dress.updateOne(
    { _id: req.params.id, "lager.boja": boja },
    { $inc: { "lager.$.kolicina": -kolicina } }
  );

  res.json({ message: "Naručeno" });
});

// ✅ POST dodavanje količine za boju (atomarno)
app.post('/api/dodajKolicinu/:id', async (req, res) => {
  const { boja, kolicina } = req.body;

  try {
    const result = await Dress.updateOne(
      { _id: req.params.id, "lager.boja": boja },
      { $inc: { "lager.$.kolicina": kolicina } }
    );

    // Ako boja ne postoji — dodaj novu
    if (result.modifiedCount === 0) {
      await Dress.updateOne(
        { _id: req.params.id },
        { $push: { lager: { boja, kolicina } } }
      );
    }

    res.json({ message: "Količina ažurirana" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Greška u dodavanju količine" });
  }
});

// PUT izmena haljine (oprezno koristiti, samo za ime/sliku)
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
