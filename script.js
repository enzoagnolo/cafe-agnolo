const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const storage = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
};

const products = {
  'Café em Grãos': { image: 'grao.jpeg', size: '250g', price: 'R$ 29,90' },
  'Café Sabor da Roça': { image: 'sabor da roca.jpeg', size: '250g', price: 'R$ 29,90' },
  'Café Outono': { image: 'outono.jpeg', size: '250g', price: 'R$ 32,90' }
};

let cart = storage.get('cart', []);
let registrationOnly = false;
let toastTimer;
// Dados pessoais ficam apenas na memória desta aba e são descartados ao sair ou atualizar.
// Remove qualquer cadastro salvo pela versão anterior do site.
let customer = null;
localStorage.removeItem('customer');

const cartTrigger = $('#cartTrigger');
const cartModal = $('#cartModal');
const cartOverlay = $('#cartOverlay');
const cartItems = $('#cartItems');
const cartCount = $('#cartCount');
const cartTotal = $('#cartTotal');
const checkoutForm = $('#checkoutForm');
const profileModal = $('#profileModal');
const profileTrigger = $('#profileTrigger');
const mobileProfileTrigger = $('#mobileProfileTrigger');
const registrationOverlay = $('#registrationOverlay');
const paymentOverlay = $('#paymentFinalizationOverlay');
const pixOverlay = $('#pixPaymentOverlay');
const successOverlay = $('#successOverlay');
const toast = $('#toast');
const quickCheckout = $('#quickCheckout');
const quickCheckoutCount = $('#quickCheckoutCount');
const topLinks = $('#topLinks');
const menuToggle = $('#menuToggle');

$('#footerYear').textContent = new Date().getFullYear();

// Mantém a rolagem do fundo travada enquanto qualquer painel/modal está aberto,
// evitando o "scroll fantasma" atrás dos overlays em telas de celular.
const openOverlays = new Set();
function trackOverlay(id, isOpen) {
  if (isOpen) openOverlays.add(id); else openOverlays.delete(id);
  document.body.classList.toggle('modal-open', openOverlays.size > 0);
}

function money(value) { return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function priceValue(price) { return Number(String(price).replace(/[^\d,]/g, '').replace(',', '.')) || 0; }
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
}
function getCustomer() { return customer; }
function setOverlay(element, open) { element.hidden = !open; trackOverlay(element.id, open); }
function total() { return cart.reduce((sum, item) => sum + priceValue(item.price), 0); }
function shipping(cep, subtotal) {
  const first = Number(String(cep || '').replace(/\D/g, '').charAt(0));
  if (!Number.isFinite(first)) return 14;
  return Math.max(first <= 3 ? 18 : first <= 6 ? 14 : 22, Math.round(subtotal * .08 * 100) / 100);
}

function productGroups() {
  return Object.values(cart.reduce((groups, item) => {
    const key = `${item.name}|${item.price}|${item.size}`;
    groups[key] ||= { ...item, quantity: 0 };
    groups[key].quantity++;
    return groups;
  }, {}));
}

function renderCart() {
  const amount = total();
  cartCount.textContent = cart.length;
  cartTotal.textContent = money(amount);
  quickCheckout.hidden = cart.length === 0;
  quickCheckoutCount.textContent = cart.length;
  cartItems.replaceChildren();
  if (!cart.length) {
    const empty = document.createElement('p');
    empty.className = 'cart-empty';
    empty.textContent = 'Seu carrinho está esperando por um café especial.';
    cartItems.append(empty);
    return;
  }
  productGroups().forEach((item) => {
    const row = document.createElement('article');
    row.className = 'cart-item';
    row.innerHTML = `<img class="cart-item-image" src="${products[item.name]?.image || 'grao.jpeg'}" alt=""><div><h3>${item.name}</h3><p>${item.size} · ${item.price}</p><div class="cart-quantity"><button type="button" data-action="minus" data-key="${item.name}">−</button><span>${item.quantity}</span><button type="button" data-action="plus" data-key="${item.name}">+</button></div></div><button class="cart-delete-button" type="button" aria-label="Remover ${item.name}" data-action="remove" data-key="${item.name}">×</button>`;
    cartItems.append(row);
  });
}

function updateAccount() {
  const customer = getCustomer();
  const firstName = customer?.name?.trim().split(/\s+/)[0];
  const label = firstName ? `Olá, ${firstName}` : 'Log-in';
  profileTrigger.textContent = label;
  profileTrigger.setAttribute('aria-label', firstName ? 'Abrir perfil' : 'Fazer login ou cadastro');
  if (mobileProfileTrigger) {
    mobileProfileTrigger.textContent = firstName ? `Olá, ${firstName}` : 'Entrar / Cadastrar';
  }
  $('#heroProductsButton').innerHTML = firstName ? `Olá, ${firstName} <span>↘</span>` : `Escolher meu café <span>↘</span>`;
}

function renderProfile() {
  const customer = getCustomer();
  const details = $('#profileDetails');
  const history = $('#orderHistory');
  details.replaceChildren(); history.replaceChildren();
  if (!customer) {
    details.innerHTML = '<p class="profile-empty">Você ainda não tem dados cadastrados.</p>';
    return;
  }
  details.innerHTML = `<p><strong>${escapeHtml(customer.name)}</strong><br>${escapeHtml(customer.email)}<br>${escapeHtml(customer.phone)}<br>${escapeHtml(customer.address)} · ${escapeHtml(customer.cep)}</p><div class="profile-actions"><button id="editProfile" type="button">Editar dados</button><button id="logoutProfile" type="button">Sair desta conta</button></div>`;
  const orders = storage.get('orders', []);
  if (!orders.length) { history.innerHTML = '<p class="profile-empty">Ainda não há pedidos por aqui.</p>'; return; }
  orders.slice(0, 5).forEach(order => {
    const row = document.createElement('article');
    row.className = 'order-history-item';
    row.innerHTML = `<strong>${order.date}</strong><br>${order.items.map(item => item.name).join(', ')}<br><strong>${order.total}</strong>`;
    history.append(row);
  });
}

function openCart() { closeProfile(); renderCart(); cartModal.classList.add('is-open'); cartModal.setAttribute('aria-hidden', 'false'); cartTrigger.setAttribute('aria-expanded', 'true'); cartOverlay.hidden = false; trackOverlay('cartModal', true); }
function closeCart() { cartModal.classList.remove('is-open'); cartModal.setAttribute('aria-hidden', 'true'); cartTrigger.setAttribute('aria-expanded', 'false'); cartOverlay.hidden = true; trackOverlay('cartModal', false); }
function openProfile() { closeCart(); renderProfile(); profileModal.classList.add('is-open'); profileModal.setAttribute('aria-hidden', 'false'); cartOverlay.hidden = false; trackOverlay('profileModal', true); }
function closeProfile() { profileModal.classList.remove('is-open'); profileModal.setAttribute('aria-hidden', 'true'); cartOverlay.hidden = true; trackOverlay('profileModal', false); }
function populateForm() {
  const customer = getCustomer();
  checkoutForm.reset();
  if (!customer) return;
  ['name', 'phone', 'cep', 'email', 'address'].forEach(key => { $(`[name="${key}"]`, checkoutForm).value = customer[key] || ''; });
}
function openRegistration(only = false) {
  registrationOnly = only; closeCart(); closeProfile();
  if (topLinks.classList.contains('active')) { topLinks.classList.remove('active'); menuToggle.setAttribute('aria-expanded', 'false'); }
  populateForm(); setOverlay(registrationOverlay, true); $('#customerName').focus();
}

function addProduct(card, direct = false) {
  const name = $('h3', card).textContent;
  const product = products[name] || { name, price: $('.price', card).textContent, size: $('.produto-tamanho', card).textContent };
  cart.push({ name, price: product.price, size: product.size });
  storage.set('cart', cart); renderCart();
  if (direct) setOverlay($('#purchaseChoiceOverlay'), true);
  else showToast(`${name} foi adicionado ao carrinho.`);
}

$$('.produto-toggle').forEach(button => button.addEventListener('click', () => {
  const card = button.closest('.produto-card'); const details = $('.produto-detalhes', card); const isOpen = details.hidden;
  details.hidden = !isOpen; button.setAttribute('aria-expanded', isOpen); $('span', button).textContent = isOpen ? '−' : '+';
}));
$$('.add-cart').forEach(button => button.addEventListener('click', () => addProduct(button.closest('.produto-card'))));
$$('.buy-now').forEach(button => button.addEventListener('click', () => addProduct(button.closest('.produto-card'), true)));

cartItems.addEventListener('click', event => {
  const button = event.target.closest('[data-action]'); if (!button) return;
  const index = cart.findIndex(item => item.name === button.dataset.key);
  if (index < 0) return;
  if (button.dataset.action === 'plus') cart.push({ ...cart[index] });
  if (button.dataset.action === 'minus') cart.splice(index, 1);
  if (button.dataset.action === 'remove') cart = cart.filter(item => item.name !== button.dataset.key);
  storage.set('cart', cart); renderCart();
});

cartTrigger.addEventListener('click', openCart);
$('#cartClose').addEventListener('click', closeCart);
cartOverlay.addEventListener('click', () => { closeCart(); closeProfile(); });
function handleProfileTriggerClick() {
  if (getCustomer()) {
    openProfile();
    return;
  }
  openRegistration(true);
}
profileTrigger.addEventListener('click', handleProfileTriggerClick);
if (mobileProfileTrigger) mobileProfileTrigger.addEventListener('click', handleProfileTriggerClick);
$('#profileClose').addEventListener('click', closeProfile);
$('#profileDetails').addEventListener('click', event => {
  if (event.target.id === 'editProfile') openRegistration(true);
  if (event.target.id === 'logoutProfile') { customer = null; updateAccount(); renderProfile(); showToast('Você saiu desta conta.'); }
});

$('#cartCheckout').addEventListener('click', () => {
  if (!cart.length) return showToast('Adicione um café antes de continuar.');
  if (!getCustomer()) return openRegistration(false);
  closeCart(); const subtotal = total(), freight = shipping(getCustomer().cep, subtotal);
  $('#paymentSubtotal').textContent = money(subtotal); $('#paymentShipping').textContent = money(freight); $('#paymentTotal').textContent = money(subtotal + freight);
  setOverlay(paymentOverlay, true);
});

$('#registrationClose').addEventListener('click', () => setOverlay(registrationOverlay, false));
$('#skipRegistration').addEventListener('click', () => setOverlay(registrationOverlay, false));
registrationOverlay.addEventListener('click', event => { if (event.target === registrationOverlay) setOverlay(registrationOverlay, false); });
checkoutForm.addEventListener('submit', event => {
  event.preventDefault(); customer = Object.fromEntries(new FormData(checkoutForm)); updateAccount(); setOverlay(registrationOverlay, false);
  if (registrationOnly) { openProfile(); showToast('Login realizado com sucesso.'); return; }
  $('#cartCheckout').click();
});

$('#purchaseFinish').addEventListener('click', () => { setOverlay($('#purchaseChoiceOverlay'), false); $('#cartCheckout').click(); });
$('#purchaseContinue').addEventListener('click', () => setOverlay($('#purchaseChoiceOverlay'), false));
$('#purchaseChoiceOverlay').addEventListener('click', event => { if (event.target === $('#purchaseChoiceOverlay')) setOverlay($('#purchaseChoiceOverlay'), false); });
$('#paymentFinalizationClose').addEventListener('click', () => setOverlay(paymentOverlay, false));
$('#paymentFinalizationEdit').addEventListener('click', () => { setOverlay(paymentOverlay, false); openRegistration(true); });
$('#paymentFinalizationConfirm').addEventListener('click', () => { $('#pixPaymentTotal').textContent = $('#paymentTotal').textContent; setOverlay(paymentOverlay, false); setOverlay(pixOverlay, true); });
$('#pixPaymentClose').addEventListener('click', () => { setOverlay(pixOverlay, false); setOverlay(paymentOverlay, true); });
$('#pixCopyButton').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#pixCopyCode').textContent); showToast('Código Pix copiado.'); } catch { showToast('Selecione e copie o código Pix.'); }
});

// Confirmação do pagamento: registra o pedido, esvazia o carrinho e mostra a tela de sucesso.
$('#pixPaymentDone').addEventListener('click', () => {
  const orders = storage.get('orders', []);
  orders.unshift({
    date: new Date().toLocaleDateString('pt-BR'),
    items: productGroups(),
    total: $('#pixPaymentTotal').textContent
  });
  storage.set('orders', orders.slice(0, 20));
  cart = [];
  storage.set('cart', cart);
  renderCart();
  setOverlay(pixOverlay, false);
  setOverlay(successOverlay, true);
});
$('#successClose').addEventListener('click', () => setOverlay(successOverlay, false));
quickCheckout.addEventListener('click', openCart);
menuToggle.addEventListener('click', () => { const open = topLinks.classList.toggle('active'); menuToggle.setAttribute('aria-expanded', open); menuToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu'); });
$$('a', topLinks).forEach(link => link.addEventListener('click', () => topLinks.classList.remove('active')));
// Navegação interna sem alterar a URL (evita que o endereço HTTPS ganhe hashes como #sabores).
$$('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
  const target = $(link.getAttribute('href'));
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}));
if ('IntersectionObserver' in window) { const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }), { threshold: .12 }); $$('.reveal').forEach(element => observer.observe(element)); } else $$('.reveal').forEach(element => element.classList.add('is-visible'));

renderCart(); updateAccount();