// //-------------------- SELETORES E ESTADO --------------------
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
let pendingOrder = null;
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
const proofOverlay = $('#proofOverlay');
const successOverlay = $('#successOverlay');
const toast = $('#toast');
const quickCheckout = $('#quickCheckout');
const quickCheckoutCount = $('#quickCheckoutCount');
const topLinks = $('#topLinks');
const menuToggle = $('#menuToggle');
const proofSend = $('#proofSend');
const partnerCarousel = $('#partnerCarousel');
const validationOverlay = $('#validationOverlay');
const validationMessage = $('#validationMessage');
const residenceType = $('#customerResidenceType');
const addressNumberField = $('#addressNumberField');
const addressNumber = $('#customerAddressNumber');
const addressNumberLabel = $('#addressNumberLabel');
const unitNumberField = $('#unitNumberField');
const unitNumber = $('#customerUnitNumber');
const unitNumberLabel = $('#unitNumberLabel');
const customerPhone = $('#customerPhone');
const customerCpf = $('#customerCpf');
const residenceSelectButton = $('#residenceSelectButton');
const residenceOptions = $('#residenceOptions');
$('#footerYear').textContent = new Date().getFullYear();

// Mantém a rolagem do fundo travada enquanto qualquer painel/modal está aberto,
// evitando o "scroll fantasma" atrás dos overlays em telas de celular.
// //-------------------- UTILITARIOS E FRETE --------------------
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
function showValidation(message) {
  validationMessage.textContent = message;
  setOverlay(validationOverlay, true);
}
function replaceArrowText() {
  const icons = {
    '↗': 'M3 13L13 3M6 3h7v7',
    '↘': 'M3 3l10 10M7 13h6V7',
    '↓': 'M8 2v11M4 9l4 4 4-4',
    '⌄': 'M3 5l5 5 5-5'
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach(node => {
    const key = node.nodeValue.trim();
    if (!icons[key]) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon-arrow');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', icons[key]);
    svg.append(path);
    node.replaceWith(svg);
  });
}
function getCustomer() { return customer; }
function setOverlay(element, open) { element.hidden = !open; trackOverlay(element.id, open); }
function total() { return cart.reduce((sum, item) => sum + priceValue(item.price), 0); }
const shippingOrigin = { latitude: -23.4205, longitude: -51.9333 };
const shippingMinimum = 8;
const shippingRatePerKm = .5;
function distanceInKm(origin, destination) {
  const earthRadiusKm = 6371;
  const latitudeDelta = (destination.latitude - origin.latitude) * Math.PI / 180;
  const longitudeDelta = (destination.longitude - origin.longitude) * Math.PI / 180;
  const originLatitude = origin.latitude * Math.PI / 180;
  const destinationLatitude = destination.latitude * Math.PI / 180;
  const value = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(originLatitude) * Math.cos(destinationLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}
function shipping(customer) {
  if (normalizeText(customer.city) === 'maringa') return 0;
  if (!customer.latitude || !customer.longitude) return shippingMinimum;
  const distance = distanceInKm(shippingOrigin, { latitude: customer.latitude, longitude: customer.longitude });
  return Math.max(shippingMinimum, Math.round(distance * shippingRatePerKm * 100) / 100);
}

// //-------------------- VALIDACAO DE CLIENTE --------------------
function normalizeText(value = '') { return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function isValidEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim()); }
function isValidPhone(value) {
  const raw = String(value).trim();
  const prefix = raw.match(/^\+(\d{1,3})\s*/)?.[1];
  if (prefix && prefix !== '55') return false;
  const allDigits = raw.replace(/\D/g, '');
  const digits = raw.startsWith('+55') || (!raw.includes('+') && allDigits.length > 11 && allDigits.startsWith('55')) ? allDigits.slice(2) : allDigits;
  return digits.length >= 10 && digits.length <= 11 && !/^([0-9])\1+$/.test(digits);
}
function formatBrazilPhone(value) {
  const raw = String(value).trim();
  const allDigits = raw.replace(/\D/g, '');
  const digits = raw.startsWith('+55') || (!raw.includes('+') && allDigits.length > 11 && allDigits.startsWith('55')) ? allDigits.slice(2) : allDigits;
  if (digits.length <= 2) return `+55 (${digits}`;
  const area = digits.slice(0, 2);
  const number = digits.slice(2);
  if (number.length <= 8) return `+55 (${area}) ${number.slice(0, 4)}${number.length > 4 ? `-${number.slice(4)}` : ''}`;
  return `+55 (${area}) ${number.slice(0, 5)}-${number.slice(5, 9)}`;
}
function formatCpf(value) {
  const digits = String(value).replace(/\D/g, '').slice(0, 11);
  return digits.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
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
const genericValidationMessage = 'Confira os dados informados e tente novamente.';
async function validateCustomer(customer) {
  if (String(customer.name || '').trim().split(/\s+/).length < 2) return genericValidationMessage;
  if (!isValidPhone(customer.phone)) return genericValidationMessage;
  if (!isValidCpf(customer.cpf)) return genericValidationMessage;
  if (!isValidEmail(customer.email)) return genericValidationMessage;
  const cep = String(customer.cep || '').replace(/\D/g, '');
  if (cep.length !== 8) return genericValidationMessage;
  if (String(customer.address || '').trim().length < 5) return genericValidationMessage;
  if (!['Casa', 'Apartamento', 'Sobrado', 'Condomínio'].includes(customer.residenceType)) return genericValidationMessage;
  if (!/^\d+[A-Za-z]?$/.test(String(customer.addressNumber || '').trim())) return genericValidationMessage;
  if (['Apartamento', 'Condomínio'].includes(customer.residenceType) && !/^\d+[A-Za-z]?$/.test(String(customer.unitNumber || '').trim())) return genericValidationMessage;
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) return genericValidationMessage;
    const result = await response.json();
    if (result.erro) return genericValidationMessage;
    const address = normalizeText(customer.address);
    const street = normalizeText(result.logradouro);
    if (street && !address.includes(street)) return genericValidationMessage;
    customer.city = result.localidade || '';
    try {
      const coordinatesResponse = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
      if (coordinatesResponse.ok) {
        const coordinatesResult = await coordinatesResponse.json();
        const coordinates = coordinatesResult.location?.coordinates;
        customer.latitude = Number(coordinates?.latitude);
        customer.longitude = Number(coordinates?.longitude);
        if (!Number.isFinite(customer.latitude) || !Number.isFinite(customer.longitude)) {
          delete customer.latitude;
          delete customer.longitude;
        }
      }
    } catch {}
  } catch { return genericValidationMessage; }
  return '';
}

// //-------------------- CARRINHO E PERFIL --------------------
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
  $('#heroProductsButton').innerHTML = firstName ? `Olá, ${firstName}` : 'Escolher meu café';
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
  details.innerHTML = `<p><strong>${escapeHtml(customer.name)}</strong><br>${escapeHtml(customer.email)}<br>${escapeHtml(customer.phone)}<br>${escapeHtml(customer.residenceType)} · ${escapeHtml(customer.address)}, ${escapeHtml(customer.addressNumber)}${customer.unitNumber ? ` · Unidade: ${escapeHtml(customer.unitNumber)}` : ''} · ${escapeHtml(customer.cep)}${customer.reference ? `<br>Ref.: ${escapeHtml(customer.reference)}` : ''}</p><div class="profile-actions"><button id="editProfile" type="button">Editar dados</button><button id="logoutProfile" type="button">Sair desta conta</button></div>`;
  const orders = storage.get('orders', []);
  if (!orders.length) { history.innerHTML = '<p class="profile-empty">Ainda não há pedidos por aqui.</p>'; return; }
  orders.slice(0, 5).forEach(order => {
    const row = document.createElement('article');
    row.className = 'order-history-item';
    row.innerHTML = `<strong>${order.date}</strong><br>${order.items.map(item => item.name).join(', ')}<br><strong>${order.total}</strong>`;
    history.append(row);
  });
}

// //-------------------- CADASTRO E ENDERECO --------------------
function openCart() { closeProfile(); renderCart(); cartModal.classList.add('is-open'); cartModal.setAttribute('aria-hidden', 'false'); cartTrigger.setAttribute('aria-expanded', 'true'); cartOverlay.hidden = false; trackOverlay('cartModal', true); }
function closeCart() { cartModal.classList.remove('is-open'); cartModal.setAttribute('aria-hidden', 'true'); cartTrigger.setAttribute('aria-expanded', 'false'); cartOverlay.hidden = true; trackOverlay('cartModal', false); }
function openProfile() { closeCart(); renderProfile(); profileModal.classList.add('is-open'); profileModal.setAttribute('aria-hidden', 'false'); cartOverlay.hidden = false; trackOverlay('profileModal', true); }
function closeProfile() { profileModal.classList.remove('is-open'); profileModal.setAttribute('aria-hidden', 'true'); cartOverlay.hidden = true; trackOverlay('profileModal', false); }
function populateForm() {
  const customer = getCustomer();
  checkoutForm.reset();
  if (!customer) return;
  ['name', 'cpf', 'cep', 'email', 'address', 'residenceType', 'addressNumber', 'unitNumber', 'reference'].forEach(key => { $(`[name="${key}"]`, checkoutForm).value = customer[key] || ''; });
  customerPhone.value = formatBrazilPhone(customer.phone || '');
  updateResidenceFields();
}
function updateResidenceFields() {
  const needsNumber = ['Casa', 'Apartamento', 'Sobrado', 'Condomínio'].includes(residenceType.value);
  const needsUnit = ['Apartamento', 'Condomínio'].includes(residenceType.value);
  addressNumberField.hidden = !needsNumber;
  addressNumber.required = needsNumber;
  unitNumberField.hidden = !needsUnit;
  unitNumber.required = needsUnit;
  addressNumberLabel.textContent = needsUnit ? 'Número do local' : 'Número';
  unitNumberLabel.textContent = residenceType.value === 'Condomínio' ? 'Número da casa' : 'Número do apartamento';
  residenceSelectButton.querySelector('span').textContent = residenceType.value || 'Selecione';
  residenceOptions.querySelectorAll('[role="option"]').forEach(option => option.setAttribute('aria-selected', String(option.dataset.value === residenceType.value)));
}
function closeResidenceOptions() {
  residenceOptions.hidden = true;
  residenceSelectButton.setAttribute('aria-expanded', 'false');
}
residenceSelectButton.addEventListener('click', () => {
  const isOpen = !residenceOptions.hidden;
  residenceOptions.hidden = isOpen;
  residenceSelectButton.setAttribute('aria-expanded', String(!isOpen));
});
residenceOptions.addEventListener('click', event => {
  const option = event.target.closest('[data-value]');
  if (!option) return;
  residenceType.value = option.dataset.value;
  residenceSelectButton.querySelector('span').textContent = option.dataset.value;
  residenceOptions.querySelectorAll('[role="option"]').forEach(item => item.setAttribute('aria-selected', String(item === option)));
  closeResidenceOptions();
  residenceType.dispatchEvent(new Event('change'));
});
function openRegistration(only = false) {
  registrationOnly = only; closeCart(); closeProfile();
  if (topLinks.classList.contains('active')) { topLinks.classList.remove('active'); menuToggle.setAttribute('aria-expanded', 'false'); }
  populateForm(); setOverlay(registrationOverlay, true); $('#customerName').focus();
}

// //-------------------- PRODUTOS E EVENTOS DO CARRINHO --------------------
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

// //-------------------- CHECKOUT E PAGAMENTO --------------------
$('#cartCheckout').addEventListener('click', () => {
  if (!cart.length) return showToast('Adicione um café antes de continuar.');
  if (!getCustomer()) return openRegistration(false);
  closeCart(); const subtotal = total(), freight = shipping(getCustomer());
  $('#paymentSubtotal').textContent = money(subtotal); $('#paymentShipping').textContent = money(freight); $('#paymentTotal').textContent = money(subtotal + freight);
  setOverlay(paymentOverlay, true);
});

$('#registrationClose').addEventListener('click', () => setOverlay(registrationOverlay, false));
$('#skipRegistration').addEventListener('click', () => setOverlay(registrationOverlay, false));
registrationOverlay.addEventListener('click', event => { if (event.target === registrationOverlay) setOverlay(registrationOverlay, false); });
residenceType.addEventListener('change', updateResidenceFields);
updateResidenceFields();
document.addEventListener('click', event => { if (!event.target.closest('#residenceSelect')) closeResidenceOptions(); });
$('#validationClose').addEventListener('click', () => { setOverlay(validationOverlay, false); residenceSelectButton.focus(); });
validationOverlay.addEventListener('click', event => { if (event.target === validationOverlay) setOverlay(validationOverlay, false); });
checkoutForm.addEventListener('submit', async event => {
  event.preventDefault();
  const formCustomer = Object.fromEntries(new FormData(checkoutForm));
  const validationMessage = await validateCustomer(formCustomer);
  if (validationMessage) return showValidation(validationMessage);
  formCustomer.phone = formatBrazilPhone(formCustomer.phone);
  formCustomer.cpf = formatCpf(formCustomer.cpf);
  customer = formCustomer; updateAccount(); setOverlay(registrationOverlay, false);
  if (registrationOnly) { openProfile(); showToast('Login realizado com sucesso.'); return; }
  $('#cartCheckout').click();
});
customerPhone.addEventListener('input', () => { customerPhone.value = formatBrazilPhone(customerPhone.value); });
customerCpf.addEventListener('input', () => { customerCpf.value = formatCpf(customerCpf.value); });

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

// //-------------------- COMPROVANTE E FINALIZACAO --------------------
// Confirmação do pagamento: registra o pedido, esvazia o carrinho e mostra a tela de sucesso.
$('#pixPaymentDone').addEventListener('click', () => {
  const orders = storage.get('orders', []);
  pendingOrder = {
    date: new Date().toLocaleDateString('pt-BR'),
    items: productGroups(),
    total: $('#pixPaymentTotal').textContent,
    customer: { ...getCustomer() }
  };
  orders.unshift(pendingOrder);
  storage.set('orders', orders.slice(0, 20));
  cart = [];
  storage.set('cart', cart);
  renderCart();
  setOverlay(pixOverlay, false);
  setOverlay(proofOverlay, true);
});
function whatsappOrderMessage(order) {
  const customer = order.customer;
  const items = order.items.map(item => `Café: ${item.name} | Quantidade: ${item.quantity} | Tamanho: ${item.size} | Preço: ${item.price}`).join('\n');
  return `Olá! Acabei de realizar o pagamento e estou enviando o comprovante.

DADOS DO CLIENTE
Nome completo: ${customer.name}
CPF: ${customer.cpf}
Telefone: ${customer.phone}
Endereço: ${customer.address}
Tipo de local: ${customer.residenceType}
Número do local/casa: ${customer.addressNumber}
Número do apartamento: ${customer.unitNumber || 'Não se aplica'}
CEP: ${customer.cep}
${customer.unitNumber ? `Unidade: ${customer.unitNumber}\n` : ''}${customer.reference ? `Referência: ${customer.reference}\n` : ''}
PEDIDO
${items}
Total: ${order.total}
Para concluir o pedido, envie o comprovante do Pix nesta conversa.`;
}
proofSend.addEventListener('click', async () => {
  if (!pendingOrder) return;
  proofSend.disabled = true;
  proofSend.textContent = 'Enviando pedido...';
  const formData = new FormData();
  formData.append('order', JSON.stringify(pendingOrder));
  try {
    const response = await fetch('/api/orders', { method: 'POST', body: formData });
    if (!response.ok) throw new Error('Não foi possível registrar o pedido no servidor.');
  } catch (error) {
    proofSend.disabled = false;
    proofSend.textContent = 'Enviar comprovante pelo WhatsApp';
    showToast(error.message);
    return;
  }
  const message = whatsappOrderMessage(pendingOrder);
  window.location.href = `https://wa.me/5544999166089?text=${encodeURIComponent(message)}`;
  pendingOrder = null;
  setOverlay(proofOverlay, false);
  setOverlay(successOverlay, true);
});
// //-------------------- NAVEGACAO E INICIALIZACAO --------------------
$('#proofClose').addEventListener('click', () => setOverlay(proofOverlay, false));
$('#successClose').addEventListener('click', () => setOverlay(successOverlay, false));
$('#partnerPrevious').addEventListener('click', () => partnerCarousel.scrollBy({ left: -partnerCarousel.clientWidth * .72, behavior: 'smooth' }));
$('#partnerNext').addEventListener('click', () => partnerCarousel.scrollBy({ left: partnerCarousel.clientWidth * .72, behavior: 'smooth' }));
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

replaceArrowText();
renderCart(); updateAccount();