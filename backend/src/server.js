const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { nanoid } = require('nanoid');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3');
const { z } = require('zod');

const app = express();

// --------- Middleware ---------
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '64kb' }));

// Ajuste o origin conforme seu domínio/site
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false
  })
);

// --------- SQLite ---------
const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, 'orders.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      deviceId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      customerName TEXT,
      customerPhone TEXT,
      customerEmail TEXT,
      customerCep TEXT,
      customerAddress TEXT,
      itemsJson TEXT NOT NULL,
      totalCents INTEGER NOT NULL
    )
  `);
});

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) reject(err);
    else resolve(this);
  });
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

// --------- Helpers ---------
function normalizeMoneyToCents(total) {
  // aceita string 'R$ 29,90' ou '29,90' ou 29.90
  if (typeof total === 'number' && Number.isFinite(total)) return Math.round(total * 100);
  const s = String(total || '').trim();
  if (!s) return 0;

  const cleaned = s
    .replace(/R\$\s?/gi, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

const OrderItemSchema = z.object({
  name: z.string().min(1).max(80),
  size: z.string().min(1).max(40),
  price: z.string().min(1).max(20)
});

const CreateOrderSchema = z.object({
  deviceId: z.string().min(10).max(100),
  customer: z
    .object({
      name: z.string().min(1).max(120).optional().nullable(),
      phone: z.string().min(6).max(30).optional().nullable(),
      email: z.string().email().max(200).optional().nullable(),
      cep: z.string().min(5).max(20).optional().nullable(),
      address: z.string().min(3).max(200).optional().nullable()
    })
    .optional(),
  items: z.array(OrderItemSchema).min(1).max(50),
  total: z.union([z.string(), z.number()])
});

// --------- Routes ---------
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/orders', async (req, res) => {
  try {
    const payload = CreateOrderSchema.parse(req.body || {});

    const createdAt = new Date().toISOString();
    const id = nanoid();

    const totalCents = normalizeMoneyToCents(payload.total);
    if (totalCents <= 0) {
      return res.status(400).json({ error: 'total inválido' });
    }

    // Persist
    await run(
      `INSERT INTO orders (
        id, deviceId, createdAt,
        customerName, customerPhone, customerEmail, customerCep, customerAddress,
        itemsJson, totalCents
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        payload.deviceId,
        createdAt,
        payload.customer?.name ?? null,
        payload.customer?.phone ?? null,
        payload.customer?.email ?? null,
        payload.customer?.cep ?? null,
        payload.customer?.address ?? null,
        JSON.stringify(payload.items),
        totalCents
      ]
    );

    return res.json({ ok: true, orderId: id });
  } catch (err) {
    return res.status(400).json({ error: 'request inválida', details: String(err?.message || err) });
  }
});

app.get('/api/orders', async (req, res) => {
  const deviceId = String(req.query.deviceId || '').trim();
  if (!deviceId || deviceId.length < 10) return res.status(400).json({ error: 'deviceId inválido' });

  try {
    const rows = await all(
      `SELECT id, createdAt, itemsJson, totalCents, customerName, customerPhone, customerEmail, customerCep, customerAddress
       FROM orders
       WHERE deviceId = ?
       ORDER BY createdAt DESC
       LIMIT 20`,
      [deviceId]
    );

    const orders = rows.map((r) => ({
      id: r.id,
      date: new Date(r.createdAt).toLocaleDateString('pt-BR'),
      items: (() => {
        try {
          return JSON.parse(r.itemsJson);
        } catch {
          return [];
        }
      })(),
      total: `R$ ${(r.totalCents / 100).toFixed(2).replace('.', ',')}`,
      customer: {
        name: r.customerName ?? null,
        phone: r.customerPhone ?? null,
        email: r.customerEmail ?? null,
        cep: r.customerCep ?? null,
        address: r.customerAddress ?? null
      }
    }));

    return res.json({ orders });
  } catch {
    return res.status(500).json({ error: 'falha ao buscar pedidos' });
  }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});

