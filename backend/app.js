const express = require('express'); // pomaze da brzo napravis web server i API(rute)
const mongoose = require('mongoose'); // za povezivanje sa bazom
const cors = require('cors'); // omogucava da frontend moze da salje zahteve backendu, inace browser blokira te zahteve zbog bezbednosti
const http = require('http');
const multer = require('multer'); // za upload slika
const { CloudinaryStorage } = require('multer-storage-cloudinary'); // cloud za mongodb
const cloudinary = require('cloudinary').v2;

// Express i server
const app = express(); // pravimo instancu express aplikacije, sad mozemo da koristim app.get, app.post, app.use, app.listen..
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
mongoose.connect('mongodb+srv://ndobrosavljevic01:admin@haljine.usfr19e.mongodb.net/haljine_baza', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB konektovan'))
  .catch(err => console.error('❌ Greška pri konekciji:', err));


// Schema
const DressSchema = new mongoose.Schema({
  naziv: String,
  slika: String,
  cena: Number,
  lager: [
    {
      boja: String,
      kolicina: Number,
    },
  ],
});

const OrderSchema = new mongoose.Schema({
  haljinaId: mongoose.Schema.Types.ObjectId,
  naziv: String,
  slika: String,
  cena: Number,
  boja: String,
  kolicina: Number,
  ime: String,
  prezime: String,
  adresa: String,
  telefon: String,
  screenshot: String, // 📷 dodato polje
  vreme: { type: Date, default: Date.now },
});


const Order = mongoose.model('Order', OrderSchema);

const Dress = mongoose.model('Dress', DressSchema);

// Middleware
const corsOptions = {
  origin: function (origin, callback) { // origin je domen(haljine.netlify.app)
    console.log("Origin:", origin);
    const allowedOrigins = ['http://localhost:4200', 'https://haljine.onrender.com', 'https://haljine.netlify.app'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true); // ako je domen u listi allowedOrigins onda se poziva calback (dozvoljava se pristup)
    } else {
      callback(new Error('Not allowed by CORS')); // inace odbija
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // dozvoljava koje metode mogu da se koriste
  allowedHeaders: ['Content-Type', 'Authorization'],
  // mozes da saljes json ili auth(za login)
};

app.use(cors(corsOptions));
app.use(express.json());

// Anti-keš middleware
// Keširanje (cache) znači da browser pamti stari odgovor 
// sa servera da ne bi svaki put slalo novi zahtev.
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  // ovo znaci da dodaje HTTP header svakom odgovoru NE KEISRAJ NISTA!, uvel trazi nove podatke sa servera.
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
  const { boja, kolicina, ime, prezime, adresa, telefon, screenshot } = req.body;

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

  await Dress.updateOne(
    {_id: req.params.id},
    {$pull: {lager: {boja:boja, kolicina: {$lte:0}}}}
  );

  await Order.create({
    haljinaId: haljina._id,
    naziv: haljina.naziv,
    slika: haljina.slika,
    cena: haljina.cena,
    boja,
    kolicina,
    ime,
    prezime,
    adresa,
    telefon,
    screenshot,
  });

  res.json({ message: "Naručeno" });
});


app.get('/api/narudzbine', async (req, res) => {
  const narudzbine = await Order.find().sort({ vreme: -1 });
  res.json(narudzbine);
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

// DELETE brisanje haljine po ID-ju
app.delete('/api/haljine/:id', async (req, res) => {
  try {
    await Dress.findByIdAndDelete(req.params.id);
    res.json({ message: "Haljina obrisana" });
  } catch (err) {
    res.status(500).json({ error: "Greška pri brisanju haljine" });
  }
});

// DELETE narudžbine
app.delete('/api/narudzbine/:id', async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: "Narudžbina obrisana" });
  } catch (err) {
    res.status(500).json({ error: "Greška pri brisanju narudžbine" });
  }
});


app.get('/', (req, res) => {
  res.send('🎉 Backend API radi. Možeš koristiti /api/haljine kako bi dobio prikaz svih haljina.');
});

// Start servera
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server radi na portu ${PORT}`));

