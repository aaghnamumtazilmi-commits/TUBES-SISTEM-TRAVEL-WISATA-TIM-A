const express = require("express");
const mongoose = require("mongoose");
 
const app = express();
const PORT = 3002;
 
app.use(express.json());
 
const PACKAGE_SERVICE_URL =
  process.env.PACKAGE_SERVICE_URL ||
  "http://package-service:3001";
 
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://booking_user:booking_password@booking-db:27017/booking_db?authSource=admin";
 
/* Model Definition */
const bookingSchema = new mongoose.Schema(
  {
    nama_pelanggan: {
      type: String,
      required: true,
    },
 
    nomor_telepon: {
      type: String,
      required: true,
    },
 
    package_id: {
      type: Number,
      required: true,
    },
 
    jumlah_peserta: {
      type: Number,
      required: true,
      min: 1,
    },
 
    package_snapshot: {
      id: Number,
      nama_paket: String,
      harga: Number,
    },
 
    total_harga: {
      type: Number,
      required: true,
    },
 
    status: {
      type: String,
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);
 
const Booking = mongoose.model("Booking", bookingSchema);
 
/* Database Connection */
async function connectWithRetry(retries = 20, delay = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(MONGO_URI);
 
      console.log("Booking Service berhasil terhubung ke MongoDB");
 
      return;
    } catch (error) {
      console.log(
        `Menunggu MongoDB siap... percobaan ${attempt}`
      );
 
      console.log(error.message);
 
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
 
  throw new Error("Booking Service gagal terhubung ke MongoDB");
}
 
/* Get Package By ID */
async function getPackageById(packageId) {
  const response = await fetch(
    `${PACKAGE_SERVICE_URL}/packages/${packageId}`
  );
 
  if (!response.ok) {
    throw new Error("Paket wisata tidak ditemukan");
  }
 
  const packageResponse = await response.json();
 
  return packageResponse.data;
}
 
/* Wait For Package Service */
async function waitForPackageService(retries = 20, delay = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(
        `${PACKAGE_SERVICE_URL}/health`
      );
 
      if (response.ok) {
        console.log("Package Service sudah siap");
        return;
      }
    } catch (error) {
      console.log(
        `Menunggu Package Service siap... percobaan ${attempt}`
      );
    }
 
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
 
  throw new Error(
    "Booking Service gagal terhubung ke Package Service setelah beberapa percobaan"
  );
}
 

/* Seed Booking (Idempotent) */
async function seedBooking() {
  const seeds = [
    { nama_pelanggan: "Aghna", nomor_telepon: "081234567890", jumlah_peserta: 2, package_id: 1 },
    { nama_pelanggan: "Aryaputra Maulana Fauzi", nomor_telepon: "081234567891", jumlah_peserta: 1, package_id: 2 },
    { nama_pelanggan: "Sahal Dafa Maulana", nomor_telepon: "081234567892", jumlah_peserta: 3, package_id: 3 },
    { nama_pelanggan: "David Andreas Marpaung", nomor_telepon: "081234567893", jumlah_peserta: 2, package_id: 1 },
  ];

  try {
    for (const s of seeds) {
      let paket;
      try {
        paket = await getPackageById(s.package_id);
      } catch (err) {
        console.log(`Peringatan: paket id=${s.package_id} tidak ditemukan, pakai id=1 sebagai fallback`);
        paket = await getPackageById(1);
      }

      await Booking.findOneAndUpdate(
        { nomor_telepon: s.nomor_telepon },
        {
          $setOnInsert: {
            nama_pelanggan: s.nama_pelanggan,
            nomor_telepon: s.nomor_telepon,
            package_id: paket.id,
            jumlah_peserta: s.jumlah_peserta,
            package_snapshot: {
              id: paket.id,
              nama_paket: paket.nama_paket,
              harga: paket.harga,
            },
            total_harga: paket.harga * s.jumlah_peserta,
            status: "pending",
          },
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }

    console.log("Seed idempotent selesai: memastikan 4 booking ada dengan package berbeda");
  } catch (error) {
    console.log("Gagal melakukan seed idempotent:", error.message);
  }
}
 
/* Health Check */
app.get("/health", (req, res) => {
  res.json({
    service: "booking-service",
    database: "mongodb",
    status: "running",
  });
});
 
/* Get All Bookings */
app.get("/bookings", async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
 
    res.json({
      service: "booking-service",
      database: "mongodb",
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil data booking",
      error: error.message,
    });
  }
});
 
/* Get Booking By ID */
app.get("/bookings/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
 
    if (!booking) {
      return res.status(404).json({
        message: "Booking tidak ditemukan",
      });
    }
 
    res.json({
      service: "booking-service",
      database: "mongodb",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil detail booking",
      error: error.message,
    });
  }
});
 
/* Create Booking (with validation) */
app.post("/bookings", async (req, res) => {
  try {
    const {
      nama_pelanggan,
      nomor_telepon,
      package_id,
      jumlah_peserta,
    } = req.body;
 
    if (!nama_pelanggan || !nomor_telepon || !package_id || !jumlah_peserta) {
      return res.status(400).json({
        message:
          "nama_pelanggan, nomor_telepon, package_id, dan jumlah_peserta wajib diisi",
      });
    }
 
    const paket = await getPackageById(package_id);
 
    const total_harga = paket.harga * jumlah_peserta;
 
    const booking = await Booking.create({
      nama_pelanggan,
      nomor_telepon,
      package_id,
      jumlah_peserta,
      package_snapshot: {
        id: paket.id,
        nama_paket: paket.nama_paket,
        harga: paket.harga,
      },
      total_harga,
      status: "pending",
    });
 
    res.status(201).json({
      service: "booking-service",
      message: "Booking berhasil dibuat",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal membuat booking",
      error: error.message,
    });
  }
});
 
/* Update Booking Status */
app.put("/bookings/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
 
    if (!status) {
      return res.status(400).json({
        message: "Status wajib diisi",
      });
    }
 
    const allowedStatus = [
      "pending",
      "dibayar",
      "diproses",
      "selesai",
      "dibatalkan",
    ];
 
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        message: "Status tidak valid",
        allowed_status: allowedStatus,
      });
    }
 
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
 
    if (!booking) {
      return res.status(404).json({
        message: "Booking tidak ditemukan",
      });
    }
 
    res.json({
      service: "booking-service",
      message: "Status booking berhasil diperbarui",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal memperbarui status booking",
      error: error.message,
    });
  }
});
 
/* Delete Booking */
app.delete("/bookings/:id", async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
 
    if (!booking) {
      return res.status(404).json({
        message: "Booking tidak ditemukan",
      });
    }
 
    res.json({
      service: "booking-service",
      message: "Booking berhasil dihapus",
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal menghapus booking",
      error: error.message,
    });
  }
});
 
/* Start Server */
async function startServer() {
  await connectWithRetry();
 
  await waitForPackageService();

  await seedBooking();
 
  app.listen(PORT, () => {
    console.log(`Booking Service berjalan pada port ${PORT}`);
  });
}
 
startServer();