const express = require("express");
const mysql = require("mysql2/promise");

const app = express();
const PORT = 3001;

app.use(express.json());

const dbConfig = {
  host: process.env.DB_HOST || "package-db",
  user: process.env.DB_USER || "package_user",
  password: process.env.DB_PASSWORD || "package_password",
  database: process.env.DB_NAME || "package_db",
  port: 3306,
};

let db;

/* Validation Helper */
function validatePackage(data) {
  const {
    nama_paket,
    destinasi,
    durasi,
    harga,
  } = data;

  if (
    !nama_paket ||
    !destinasi ||
    !durasi ||
    harga === undefined
  ) {
    return "nama_paket, destinasi, durasi, dan harga wajib diisi";
  }

  if (
    !Number.isInteger(Number(harga)) ||
    Number(harga) <= 0
  ) {
    return "harga harus berupa angka dan lebih dari 0";
  }

  return null;
}

/* Database Connection */
async function connectWithRetry(retries = 20, delay = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      db = await mysql.createConnection(dbConfig);

      console.log(
        "Package Service berhasil terhubung ke MySQL"
      );

      return;
    } catch (error) {
      console.log(
        `Menunggu MySQL siap... percobaan ${attempt}`
      );

      await new Promise((resolve) =>
        setTimeout(resolve, delay)
      );
    }
  }

  throw new Error(
    "Package Service gagal terhubung ke MySQL"
  );
}

/* Initialize Database */
async function initDatabase() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS packages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nama_paket VARCHAR(100) NOT NULL,
      destinasi VARCHAR(100) NOT NULL,
      durasi VARCHAR(50) NOT NULL,
      harga BIGINT NOT NULL,
      deskripsi TEXT,
      transportasi VARCHAR(100),
      akomodasi VARCHAR(100),
      tersedia BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const [rows] = await db.execute(
    "SELECT COUNT(*) AS total FROM packages"
  );

  if (rows[0].total === 0) {
    await db.execute(`
      INSERT INTO packages
      (
        nama_paket,
        destinasi,
        durasi,
        harga,
        deskripsi,
        transportasi,
        akomodasi
      )
      VALUES
      (
        'Paket Bali 3H2M',
        'Bali',
        '3 Hari 2 Malam',
        2500000,
        'Menjelajahi destinasi wisata populer di Bali termasuk Tanah Lot, Ubud, dan Kuta',
        'Bus Pariwisata',
        'Hotel Bintang 3'
      ),
      (
        'Paket Lombok 4H3M',
        'Lombok',
        '4 Hari 3 Malam',
        3200000,
        'Eksplorasi Pantai Senggigi, Gili Trawangan, dan Gunung Rinjani',
        'Pesawat + Speedboat',
        'Resort Bintang 4'
      ),
      (
        'Paket Yogyakarta Heritage',
        'Yogyakarta',
        '3 Hari 2 Malam',
        1500000,
        'Mengunjungi Candi Borobudur, Prambanan, dan wisata budaya Keraton',
        'Bus Pariwisata',
        'Hotel Bintang 3'
      )
    `);

    console.log(
      "Data awal paket wisata berhasil dibuat"
    );
  }
}

/* Health Check */
app.get("/health", (req, res) => {
  res.json({
    service: "package-service",
    database: "mysql",
    status: "running",
  });
});

/* Get All Packages */
app.get("/packages", async (req, res) => {
  try {
    const [packages] = await db.execute(
      "SELECT * FROM packages ORDER BY id ASC"
    );

    res.json({
      service: "package-service",
      database: "mysql",
      data: packages,
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil data paket wisata",
      error: error.message,
    });
  }
});

/* Search Package By Destinasi */
app.get("/packages/search", async (req, res) => {
  try {
    const { destinasi } = req.query;

    if (!destinasi) {
      return res.status(400).json({
        message:
          "Query parameter 'destinasi' wajib diisi",
      });
    }

    const [packages] = await db.execute(
      `
      SELECT *
      FROM packages
      WHERE destinasi LIKE ?
      ORDER BY id ASC
      `,
      [`%${destinasi}%`]
    );

    res.json({
      service: "package-service",
      database: "mysql",
      keyword: destinasi,
      data: packages,
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal mencari paket wisata",
      error: error.message,
    });
  }
});

/* Get Package By ID */
app.get("/packages/:id", async (req, res) => {
  try {
    const [packages] = await db.execute(
      "SELECT * FROM packages WHERE id = ?",
      [req.params.id]
    );

    if (packages.length === 0) {
      return res.status(404).json({
        message: "Paket wisata tidak ditemukan",
      });
    }

    res.json({
      service: "package-service",
      database: "mysql",
      data: packages[0],
    });
  } catch (error) {
    res.status(500).json({
      message:
        "Gagal mengambil detail paket wisata",
      error: error.message,
    });
  }
});

/* Create Package */
app.post("/packages", async (req, res) => {
  try {
    const validationError =
      validatePackage(req.body);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const {
      nama_paket,
      destinasi,
      durasi,
      harga,
      deskripsi,
      transportasi,
      akomodasi,
    } = req.body;

    const [result] = await db.execute(
      `
      INSERT INTO packages
      (
        nama_paket,
        destinasi,
        durasi,
        harga,
        deskripsi,
        transportasi,
        akomodasi
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        nama_paket,
        destinasi,
        durasi,
        harga,
        deskripsi || null,
        transportasi || null,
        akomodasi || null,
      ]
    );

    res.status(201).json({
      service: "package-service",
      message:
        "Paket wisata berhasil ditambahkan",
      data: {
        id: result.insertId,
        nama_paket,
        destinasi,
        durasi,
        harga,
        deskripsi,
        transportasi,
        akomodasi,
      },
    });
  } catch (error) {
    res.status(500).json({
      message:
        "Gagal menambahkan paket wisata",
      error: error.message,
    });
  }
});

/* Update Package */
app.put("/packages/:id", async (req, res) => {
  try {
    const validationError =
      validatePackage(req.body);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const {
      nama_paket,
      destinasi,
      durasi,
      harga,
      deskripsi,
      transportasi,
      akomodasi,
      tersedia,
    } = req.body;

    const [result] = await db.execute(
      `
      UPDATE packages
      SET
        nama_paket = ?,
        destinasi = ?,
        durasi = ?,
        harga = ?,
        deskripsi = ?,
        transportasi = ?,
        akomodasi = ?,
        tersedia = ?
      WHERE id = ?
      `,
      [
        nama_paket,
        destinasi,
        durasi,
        harga,
        deskripsi || null,
        transportasi || null,
        akomodasi || null,
        tersedia !== undefined
          ? tersedia
          : true,
        req.params.id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Paket wisata tidak ditemukan",
      });
    }

    res.json({
      service: "package-service",
      message:
        "Paket wisata berhasil diperbarui",
    });
  } catch (error) {
    res.status(500).json({
      message:
        "Gagal memperbarui paket wisata",
      error: error.message,
    });
  }
});

/* Delete Package */
app.delete("/packages/:id", async (req, res) => {
  try {
    const [result] = await db.execute(
      "DELETE FROM packages WHERE id = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Paket wisata tidak ditemukan",
      });
    }

    res.json({
      service: "package-service",
      message:
        "Paket wisata berhasil dihapus",
    });
  } catch (error) {
    res.status(500).json({
      message:
        "Gagal menghapus paket wisata",
      error: error.message,
    });
  }
});

/* Start Server */
async function startServer() {
  await connectWithRetry();
  await initDatabase();

  app.listen(PORT, () => {
    console.log(
      `Package Service berjalan pada port ${PORT}`
    );
  });
}

startServer();