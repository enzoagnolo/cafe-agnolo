require('dotenv').config();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const express = require('express');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const multer = require('multer');

const app = express();
const root = __dirname;
const dataDir = path.join(root, 'data');
const proofDir = path.join(dataDir, 'proofs');
const adminEmail = process.env.ADMIN_EMAIL || 'enzousava@gmail.com';
fs.mkdirSync(proofDir, { recursive: true });

if (!process.env.SESSION_SECRET || !process.env.ADMIN_PASSWORD) {
  throw new Error('Configure SESSION_SECRET e ADMIN_PASSWORD no arquivo .env.');
}
if (process.env.ADMIN_PASSWORD.length < 12) {
  throw new Error('ADMIN_PASSWORD precisa ter pelo menos 12 caracteres.');
}

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

const seedProducts = database.prepare('INSERT OR IGNORE INTO products (name, size, price, image) VALUES (?, ?, ?, ?)');
[
  ['Café em Grãos', '250g', 'R$ 29,90', 'grao.jpeg'],
  ['Café Sabor da Roça', '250g', 'R$ 29,90', 'sabor da roca.jpeg'],
  ['Café Outono', '250g', 'R$ 32,90', 'outono.jpeg']
].forEach(product => seedProducts.run(...product));

const adminPasswordHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12);
const allowedStatuses = new Set(['pending', 'confirmed', 'sent', 'cancelled']);
const upload = multer({
  storage: multer.diskStorage({
    destination: proofDir,
    filename: (_request, file, callback) => callback(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => callback(null, /^(image\/(jpeg|png|webp)|application\/pdf)$/.test(file.mimetype))
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '100kb' }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000 }
}));
app.use((request, response, next) => request.path.startsWith('/server') || request.path.startsWith('/data') ? response.sendStatus(404) : next());
app.use(express.static(root, { dotfiles: 'deny', index: 'index.html' }));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });
function requireAdmin(request, response, next) {
  if (request.session.isAdmin) return next();
  return response.status(401).json({ error: 'AUTH_REQUIRED' });
}
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

app.get('/admin', (request, response) => {
  if (request.query.login === '1') return request.session.destroy(() => response.sendFile(path.join(root, 'server', 'admin.html')));
  response.sendFile(path.join(root, 'server', 'admin.html'));
});
app.post('/admin/login', loginLimiter, async (request, response) => {
  const email = clean(request.body.email, 254).toLowerCase();
  const password = String(request.body.password || '');
  if (email !== adminEmail.toLowerCase() || !(await bcrypt.compare(password, adminPasswordHash))) return response.status(401).json({ error: 'E-mail ou senha invalidos.' });
  request.session.regenerate(error => {
    if (error) return response.status(500).json({ error: 'Nao foi possivel iniciar a sessao.' });
    request.session.isAdmin = true;
    response.json({ ok: true });
  });
});
app.post('/admin/logout', (request, response) => request.session.destroy(() => response.json({ ok: true })));
app.get('/admin/api/me', (request, response) => request.session.isAdmin ? response.json({ ok: true }) : response.sendStatus(401));
app.get('/admin/api/products', requireAdmin, (_request, response) => response.json({ products: database.prepare('SELECT * FROM products ORDER BY id').all() }));
app.post('/admin/api/products', requireAdmin, (request, response) => {
  const product = { name: clean(request.body.name, 120), size: clean(request.body.size, 30), price: clean(request.body.price, 30), image: clean(request.body.image, 180) };
  if (!product.name || !product.size || !product.price) return response.status(400).json({ error: 'Nome, tamanho e preco sao obrigatorios.' });
  try {
  const result = database.prepare('INSERT INTO products (name, size, price, image) VALUES (?, ?, ?, ?)').run(product.name, product.size, product.price, product.image || null);
  response.status(201).json({ product: database.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid) });
  } catch (error) { response.status(400).json({ error: error.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 'Ja existe um produto com esse nome.' : 'Nao foi possivel criar o produto.' }); }
});
app.patch('/admin/api/products/:id', requireAdmin, (request, response) => {
  const product = { name: clean(request.body.name, 120), size: clean(request.body.size, 30), price: clean(request.body.price, 30), image: clean(request.body.image, 180) };
  if (!product.name || !product.size || !product.price) return response.status(400).json({ error: 'Nome, tamanho e preco sao obrigatorios.' });
  try {
    const result = database.prepare('UPDATE products SET name = ?, size = ?, price = ?, image = ? WHERE id = ?').run(product.name, product.size, product.price, product.image || null, Number(request.params.id));
    if (!result.changes) return response.sendStatus(404);
    response.json({ product: database.prepare('SELECT * FROM products WHERE id = ?').get(Number(request.params.id)) });
  } catch (error) { response.status(400).json({ error: error.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 'Ja existe um produto com esse nome.' : 'Nao foi possivel atualizar o produto.' }); }
});
app.delete('/admin/api/products/:id', requireAdmin, (request, response) => {
  const result = database.prepare('DELETE FROM products WHERE id = ?').run(Number(request.params.id));
  if (!result.changes) return response.sendStatus(404);
  response.json({ ok: true });
});

app.post('/api/orders', upload.single('proof'), (request, response) => {
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

app.get('/admin/api/orders', requireAdmin, (_request, response) => {
  const rows = database.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 100').all();
  const orders = rows.map(row => ({ ...row, customer_address: [row.residence_type, `${row.customer_address}, ${row.address_number}`, row.unit_number ? `Unidade: ${row.unit_number}` : '', row.reference ? `Ref.: ${row.reference}` : ''].filter(Boolean).join(' · '), items: JSON.parse(row.items_json) }));
  const stats = database.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending FROM orders").get();
  const allOrders = database.prepare('SELECT total, status FROM orders').all();
  const gross = allOrders.reduce((sum, order) => sum + parseMoney(order.total), 0);
  const net = allOrders.filter(order => order.status !== 'cancelled').reduce((sum, order) => sum + parseMoney(order.total), 0);
  response.json({ orders, stats: { total: stats.total, pending: stats.pending || 0, gross, net, revenue: net } });
});
app.get('/admin/api/customers', requireAdmin, (_request, response) => {
  const customers = database.prepare(`
    SELECT customer_email, MAX(customer_name) AS name, MAX(customer_cpf) AS cpf,
      MAX(customer_phone) AS phone, MAX(customer_address) AS address,
      MAX(customer_cep) AS cep, MAX(residence_type) AS residence_type,
      MAX(address_number) AS address_number, MAX(reference) AS reference,
      COUNT(*) AS order_count, MAX(created_at) AS last_order
    FROM orders
    WHERE customer_email <> ''
    GROUP BY customer_email
    ORDER BY last_order DESC
  `).all();
  response.json({ customers });
});
app.delete('/admin/api/customers/:email', requireAdmin, (request, response) => {
  const email = clean(request.params.email, 254);
  const result = database.prepare(`UPDATE orders SET customer_name = 'Cadastro removido', customer_email = '', customer_cpf = '', customer_phone = '', customer_address = '', customer_cep = '', residence_type = '', address_number = '', reference = NULL, unit_number = NULL WHERE customer_email = ?`).run(email);
  if (!result.changes) return response.sendStatus(404);
  response.json({ ok: true });
});
app.patch('/admin/api/orders/:id', requireAdmin, (request, response) => {
  const status = clean(request.body.status, 20);
  if (!allowedStatuses.has(status)) return response.status(400).json({ error: 'Status invalido.' });
  const result = database.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, Number(request.params.id));
  if (!result.changes) return response.sendStatus(404);
  response.json({ ok: true });
});
app.get('/admin/api/orders/:id/proof', requireAdmin, (request, response) => {
  const order = database.prepare('SELECT proof_path, proof_name FROM orders WHERE id = ?').get(Number(request.params.id));
  if (!order?.proof_path || !fs.existsSync(order.proof_path)) return response.sendStatus(404);
  response.download(order.proof_path, order.proof_name || 'comprovante');
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`Caffe Dell'Agnolo em http://localhost:${port}`));
