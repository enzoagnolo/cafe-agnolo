// //-------------------- DEPENDENCIAS E CONFIGURACAO --------------------
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const express = require('express');
const helmet = require('helmet');
const multer = require('multer');

const app = express();
const root = __dirname;
const dataDir = process.env.VERCEL ? path.join('/tmp', 'cafe-agnolo') : path.join(root, 'data');
const proofDir = path.join(dataDir, 'proofs');
fs.mkdirSync(proofDir, { recursive: true });

const database = new DatabaseSync(path.join(dataDir, 'cafe-agnolo.sqlite'));
database.exec('PRAGMA journal_mode = WAL');
database.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_cpf TEXT NOT NULL DEFAULT '',
    customer_address TEXT NOT NULL,
    customer_cep TEXT NOT NULL,
    total TEXT NOT NULL,
    items_json TEXT NOT NULL,
    proof_name TEXT,
    proof_path TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'sent', 'cancelled'))
  );
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    size TEXT NOT NULL,
    price TEXT NOT NULL,
    image TEXT,
    active INTEGER NOT NULL DEFAULT 1
  );
`);
const orderColumns = database.prepare('PRAGMA table_info(orders)').all().map(column => column.name);
if (!orderColumns.includes('residence_type')) database.exec('ALTER TABLE orders ADD COLUMN residence_type TEXT NOT NULL DEFAULT \'Casa\'');
if (!orderColumns.includes('address_number')) database.exec('ALTER TABLE orders ADD COLUMN address_number TEXT NOT NULL DEFAULT \'s/n\'');
if (!orderColumns.includes('reference')) database.exec('ALTER TABLE orders ADD COLUMN reference TEXT');
if (!orderColumns.includes('condominium_house_number')) database.exec('ALTER TABLE orders ADD COLUMN condominium_house_number TEXT');
if (!orderColumns.includes('unit_number')) database.exec('ALTER TABLE orders ADD COLUMN unit_number TEXT');
if (!orderColumns.includes('customer_cpf')) database.exec("ALTER TABLE orders ADD COLUMN customer_cpf TEXT NOT NULL DEFAULT ''");

// //-------------------- CATALOGO INICIAL E UPLOADS --------------------
const seedProducts = database.prepare('INSERT OR IGNORE INTO products (name, size, price, image) VALUES (?, ?, ?, ?)');
[
  ['Café em Grãos', '250g', 'R$ 29,90', 'grao.jpeg'],
  ['Café Sabor da Roça', '250g', 'R$ 29,90', 'sabor da roca.jpeg'],
  ['Café Outono', '250g', 'R$ 32,90', 'outono.jpeg']
].forEach(product => seedProducts.run(...product));

const upload = multer({
  storage: multer.diskStorage({
    destination: proofDir,
    filename: (_request, file, callback) => callback(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => callback(null, /^(image\/(jpeg|png|webp)|application\/pdf)$/.test(file.mimetype))
});

// //-------------------- MIDDLEWARES E SEGURANCA --------------------
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '100kb' }));
app.use((request, response, next) => request.path.startsWith('/server') || request.path.startsWith('/data') ? response.sendStatus(404) : next());
app.use(express.static(root, { dotfiles: 'deny', index: 'index.html' }));

function clean(value, max = 300) { return String(value ?? '').trim().slice(0, max); }
function parseItems(value) {
  if (!Array.isArray(value) || !value.length || value.length > 30) throw new Error('Itens do pedido invalidos.');
  return value.map(item => ({ name: clean(item.name, 120), size: clean(item.size, 30), price: clean(item.price, 30), quantity: Math.max(1, Math.min(99, Number(item.quantity) || 1)) }));
}
function parseMoney(value) { return Number(String(value).replace(/[^0-9,.-]/g, '').replace(',', '.')) || 0; }
function isValidEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value); }
function isValidPhone(value) {
  const raw = String(value).trim();
  const countryCode = raw.match(/^\+(\d{1,3})\s*/)?.[1] || '';
  if (countryCode && countryCode !== '55') return false;
  const allDigits = raw.replace(/\D/g, '');
  const digits = raw.startsWith('+55') || (!raw.includes('+') && allDigits.length > 11 && allDigits.startsWith('55')) ? allDigits.slice(2) : allDigits;
  return digits.length >= 10 && digits.length <= 11 && !/^([0-9])\1+$/.test(digits);
}
function isValidCpf(value) {
  const digits = String(value).replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  for (let index = 0; index < 9; index++) sum += Number(digits[index]) * (10 - index);
  let digit = (sum * 10) % 11; if (digit === 10) digit = 0;
  if (digit !== Number(digits[9])) return false;
  sum = 0;
  for (let index = 0; index < 10; index++) sum += Number(digits[index]) * (11 - index);
  digit = (sum * 10) % 11; if (digit === 10) digit = 0;
  return digit === Number(digits[10]);
}

// //-------------------- RECEBIMENTO DE PEDIDOS --------------------
app.post('/api/orders', upload.single('proof'), async (request, response) => {
  let order;
  try {
    order = JSON.parse(request.body.order || '{}');
    const customer = order.customer || {};
    const items = parseItems(order.items);
    const required = ['name', 'email', 'cpf', 'phone', 'address', 'cep', 'residenceType'];
    if (required.some(key => !clean(customer[key]))) throw new Error('Dados do cliente incompletos.');
    if (clean(customer.name).split(/\s+/).length < 2) throw new Error('Informe nome e sobrenome.');
    if (!isValidPhone(clean(customer.phone))) throw new Error('Telefone invalido.');
    if (!isValidCpf(clean(customer.cpf))) throw new Error('CPF invalido.');
    if (!isValidEmail(clean(customer.email))) throw new Error('E-mail invalido.');
    if (clean(customer.cep).replace(/\D/g, '').length !== 8) throw new Error('CEP invalido.');
    if (clean(customer.address).length < 5) throw new Error('Endereco invalido.');
    if (!['Casa', 'Apartamento', 'Sobrado', 'Condomínio'].includes(clean(customer.residenceType))) throw new Error('Tipo de residencia invalido.');
    if (!/^\d+[A-Za-z]?$/.test(clean(customer.addressNumber))) throw new Error('Numero da residencia invalido.');
    if (['Apartamento', 'Condomínio'].includes(clean(customer.residenceType)) && !/^\d+[A-Za-z]?$/.test(clean(customer.unitNumber))) throw new Error('Numero da unidade invalido.');
    if (!clean(order.total, 30)) throw new Error('Total do pedido ausente.');
    const result = database.prepare(`INSERT INTO orders (customer_name, customer_email, customer_cpf, customer_phone, customer_address, customer_cep, residence_type, address_number, reference, condominium_house_number, unit_number, total, items_json, proof_name, proof_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      clean(customer.name, 120), clean(customer.email, 254), clean(customer.cpf, 14), clean(customer.phone, 30), clean(customer.address, 300), clean(customer.cep, 12), clean(customer.residenceType, 20), clean(customer.addressNumber, 10), clean(customer.reference, 160), null, clean(customer.unitNumber, 10), clean(order.total, 30), JSON.stringify(items), request.file?.originalname ? clean(request.file.originalname, 180) : null, request.file?.path || null
    );
    response.status(201).json({ ok: true, id: result.lastInsertRowid });
  } catch (error) {
    if (request.file?.path) fs.rmSync(request.file.path, { force: true });
    response.status(400).json({ error: 'Confira os dados informados e tente novamente.' });
  }
});

// //-------------------- INICIALIZACAO --------------------
const port = Number(process.env.PORT) || 3000;
if (require.main === module) app.listen(port, () => console.log(`Caffe Dell'Agnolo em http://localhost:${port}`));
module.exports = app;
