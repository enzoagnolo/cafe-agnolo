const yearElement = document.getElementById('year');
if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

const scrollTopButton = document.getElementById('scrollTopBtn');

if (scrollTopButton) {
  const toggleScrollTopButton = () => {
    scrollTopButton.style.display = window.scrollY > 300 ? 'flex' : 'none';
  };

  window.addEventListener('scroll', toggleScrollTopButton, { passive: true });
  toggleScrollTopButton();

  scrollTopButton.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

const cards = document.querySelectorAll('.produto-card');

cards.forEach((card) => {
  card.addEventListener('click', (event) => {
    if (event.target.closest('.produto-toggle')) {
      return;
    }

    const details = card.querySelector('.produto-detalhes');
    const toggle = card.querySelector('.produto-toggle');
    const isOpen = card.classList.toggle('is-open');

    details.hidden = !isOpen;
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.textContent = isOpen ? 'Ocultar características' : 'Ver características';
  });
});

const toggleButtons = document.querySelectorAll('.produto-toggle');

toggleButtons.forEach((button) => {
  button.addEventListener('click', (event) => {
    event.stopPropagation();

    const card = button.closest('.produto-card');
    const details = card.querySelector('.produto-detalhes');
    const isOpen = card.classList.toggle('is-open');

    details.hidden = !isOpen;
    button.setAttribute('aria-expanded', String(isOpen));
    button.textContent = isOpen ? 'Ocultar características' : 'Ver características';
  });
});

let cart;
let checkoutReady = false;
let registrationOnly = false;

try {
  cart = JSON.parse(localStorage.getItem('cart') || '[]');
} catch {
  cart = [];
}

const cartTrigger = document.getElementById('cartTrigger');
const cartCount = document.getElementById('cartCount');
const cartModal = document.getElementById('cartModal');
const cartOverlay = document.getElementById('cartOverlay');
const cartClose = document.getElementById('cartClose');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const cartCheckout = document.getElementById('cartCheckout');
const checkoutForm = document.getElementById('checkoutForm');
const registrationOverlay = document.getElementById('registrationOverlay');
const registrationClose = document.getElementById('registrationClose');
const skipRegistration = document.getElementById('skipRegistration');
const profileTrigger = document.getElementById('profileTrigger');
const profileModal = document.getElementById('profileModal');
const profileClose = document.getElementById('profileClose');
const profileDetails = document.getElementById('profileDetails');
const orderHistory = document.getElementById('orderHistory');
const loginTrigger = document.getElementById('loginTrigger');
const userGreeting = document.getElementById('userGreeting');
const purchaseChoiceOverlay = document.getElementById('purchaseChoiceOverlay');
const purchaseFinish = document.getElementById('purchaseFinish');
const purchaseContinue = document.getElementById('purchaseContinue');

const priceValue = (price) => Number(price.replace(/[^\d,]/g, '').replace(',', '.'));

const getCartProducts = () => {
  const products = new Map();

  cart.forEach((item) => {
    const key = `${item.name}|${item.price}|${item.size}`;
    const current = products.get(key) || { product: item, quantity: 0 };
    current.quantity += 1;
    products.set(key, current);
  });

  return [...products.values()];
};

const renderCart = () => {
  const total = cart.reduce((sum, item) => sum + priceValue(item.price), 0);
  const groupedItems = getCartProducts();
  cartCount.textContent = cart.length;
  cartTotal.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  cartItems.innerHTML = cart.length
    ? groupedItems.map(({ product, quantity }, index) => `
      <article class="cart-item">
        <div><h3>${product.name}</h3><p>${product.size} · ${product.price}</p></div>
        <div class="cart-quantity">
          <button class="cart-quantity-button" type="button" data-action="decrease" data-index="${index}" aria-label="Diminuir quantidade">−</button>
          <span>${quantity}</span>
          <button class="cart-quantity-button" type="button" data-action="increase" data-index="${index}" aria-label="Adicionar mais uma unidade">+</button>
          <button class="cart-delete-button" type="button" data-action="delete" data-index="${index}" aria-label="Remover produto do carrinho">&#128465;</button>
        </div>
      </article>`).join('')
    : '<p class="cart-empty">Seu carrinho está vazio.</p>';

  cartCheckout.classList.toggle('is-disabled', cart.length === 0);
  cartCheckout.disabled = cart.length === 0;
};

const openCart = () => {
  renderCart();
  registrationOverlay.hidden = true;
  closeProfile();
  cartModal.classList.add('is-open');
  cartModal.setAttribute('aria-hidden', 'false');
  cartTrigger.setAttribute('aria-expanded', 'true');
  cartOverlay.hidden = false;
  document.body.classList.add('cart-open');
};

const closeCart = () => {
  cartModal.classList.remove('is-open');
  cartModal.setAttribute('aria-hidden', 'true');
  cartTrigger.setAttribute('aria-expanded', 'false');
  cartOverlay.hidden = true;
  document.body.classList.remove('cart-open');
};

const renderProfile = () => {
  const customer = JSON.parse(localStorage.getItem('customer') || 'null');
  const orders = JSON.parse(localStorage.getItem('orders') || '[]');

  profileDetails.innerHTML = customer
    ? `<div class="profile-details">
        <p><strong>Nome:</strong> ${customer.name}</p>
        <p><strong>Telefone:</strong> ${customer.phone}</p>
        <p><strong>E-mail:</strong> ${customer.email}</p>
        <p><strong>Endereço:</strong> ${customer.address}</p>
        <button class="delete-account" type="button">Sair</button>
      </div>`
    : '<p class="profile-empty">Nenhum cadastro salvo ainda.</p>';

  orderHistory.innerHTML = orders.length
    ? orders.map((order) => `<article class="order-history-item">
        <h4>${order.date}</h4>
        <p>${order.items.map((item) => item.name).join(', ')}</p>
        <p><strong>${order.total}</strong></p>
      </article>`).join('')
    : '<p class="profile-empty">Você ainda não realizou pedidos.</p>';
};

const updateUserGreeting = () => {
  const customer = JSON.parse(localStorage.getItem('customer') || 'null');
  const firstName = customer?.name?.trim().split(/\s+/)[0];

  userGreeting.hidden = !firstName;
  loginTrigger.hidden = Boolean(firstName);
  userGreeting.textContent = firstName ? `Olá, ${firstName}` : '';
};

const openProfile = () => {
  closeCart();
  renderProfile();
  profileModal.classList.add('is-open');
  profileModal.setAttribute('aria-hidden', 'false');
  profileTrigger.setAttribute('aria-expanded', 'true');
  cartOverlay.hidden = false;
};

const closeProfile = () => {
  profileModal.classList.remove('is-open');
  profileModal.setAttribute('aria-hidden', 'true');
  profileTrigger.setAttribute('aria-expanded', 'false');
  cartOverlay.hidden = true;
};

cartTrigger.addEventListener('click', openCart);
cartClose.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', () => {
  closeCart();
  closeProfile();
});
profileTrigger.addEventListener('click', openProfile);
profileClose.addEventListener('click', closeProfile);
loginTrigger.addEventListener('click', () => {
  registrationOnly = true;
  closeCart();
  closeProfile();
  checkoutForm.reset();
  registrationOverlay.hidden = false;
  checkoutForm.querySelector('input').focus();
});

profileDetails.addEventListener('click', (event) => {
  if (!event.target.closest('.delete-account')) return;

  const confirmed = window.confirm('Deseja excluir seus dados e histórico de pedidos deste dispositivo?');
  if (!confirmed) return;

  localStorage.removeItem('customer');
  localStorage.removeItem('orders');
  localStorage.removeItem('cart');
  cart = [];
  checkoutReady = false;
  renderCart();
  renderProfile();
  updateUserGreeting();
});

cartCheckout.addEventListener('click', (event) => {
  if (cart.length === 0) return;
  registrationOnly = false;

  if (checkoutReady) {
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    orders.unshift({
      date: new Date().toLocaleDateString('pt-BR'),
      items: [...cart],
      total: cartTotal.textContent
    });
    localStorage.setItem('orders', JSON.stringify(orders));
    cart = [];
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    closeCart();
    alert('Pedido finalizado com sucesso! Entraremos em contato em breve.');
    return;
  }

  const savedCustomer = JSON.parse(localStorage.getItem('customer') || 'null');
  if (savedCustomer) {
    Object.entries(savedCustomer).forEach(([field, value]) => {
      const input = checkoutForm.elements[field];
      if (input) input.value = value;
    });
  }

  closeCart();
  registrationOverlay.hidden = false;
  checkoutForm.querySelector('input').focus();
});

registrationClose.addEventListener('click', () => {
  registrationOnly = false;
  registrationOverlay.hidden = true;
});

registrationOverlay.addEventListener('click', (event) => {
  if (event.target === registrationOverlay) {
    registrationOnly = false;
    registrationOverlay.hidden = true;
  }
});

skipRegistration.addEventListener('click', () => {
  registrationOnly = false;
  registrationOverlay.hidden = true;
});

purchaseFinish.addEventListener('click', () => {
  purchaseChoiceOverlay.hidden = true;
  cartCheckout.click();
});

purchaseContinue.addEventListener('click', () => {
  purchaseChoiceOverlay.hidden = true;
  closeCart();
});

purchaseChoiceOverlay.addEventListener('click', (event) => {
  if (event.target === purchaseChoiceOverlay) {
    purchaseChoiceOverlay.hidden = true;
    closeCart();
  }
});

checkoutForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const customer = Object.fromEntries(new FormData(checkoutForm));
  const submitButton = checkoutForm.querySelector('button[type="submit"]');

  if (registrationOnly) {
    localStorage.setItem('customer', JSON.stringify(customer));
    registrationOnly = false;
    registrationOverlay.hidden = true;
    updateUserGreeting();
    openProfile();
    return;
  }

  const orderItems = cart
    .map((item) => `${item.name} (${item.size}) — ${item.price}`)
    .join('\n');

  submitButton.disabled = true;
  submitButton.textContent = 'Enviando pedido...';

  try {
    const response = await fetch('https://formsubmit.co/ajax/cafedellagnolo@gmail.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        _subject: 'Novo pedido — Caffè Dell’Agnolo',
        nome: customer.name,
        telefone: customer.phone,
        cep: customer.cep,
        email: customer.email,
        endereco: customer.address,
        itens_do_pedido: orderItems,
        total: cartTotal.textContent
      })
    });

    if (!response.ok) throw new Error('Falha ao enviar o pedido');
  } catch (error) {
    alert('Não foi possível enviar o pedido. Tente novamente em alguns instantes.');
    return;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Salvar e continuar';
  }

  localStorage.setItem('customer', JSON.stringify(customer));
  checkoutReady = true;
  registrationOverlay.hidden = true;
  updateUserGreeting();
  openCart();
});

cartItems.addEventListener('click', (event) => {
  const quantityButton = event.target.closest('.cart-quantity-button, .cart-delete-button');
  if (!quantityButton) return;

  const { product } = getCartProducts()[Number(quantityButton.dataset.index)];

  if (quantityButton.dataset.action === 'increase') {
    cart.push({ ...product });
  } else if (quantityButton.dataset.action === 'delete') {
    cart = cart.filter((item) => (
      item.name !== product.name || item.price !== product.price || item.size !== product.size
    ));
  } else {
    const productIndex = cart.findIndex((item) => (
      item.name === product.name && item.price === product.price && item.size === product.size
    ));
    cart.splice(productIndex, 1);
  }

  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart();
});

renderCart();
updateUserGreeting();

document.querySelectorAll('.add-cart').forEach((button) => {
  button.addEventListener('click', (event) => {
    event.stopPropagation();

    const card = button.closest('.produto-card');
    const product = {
      name: card.querySelector('h3').textContent,
      price: card.querySelector('.price').textContent,
      size: card.querySelector('.produto-tamanho').textContent
    };

    cart.push(product);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();

    button.textContent = 'Adicionado!';
    button.classList.add('is-added');

    setTimeout(() => {
      button.textContent = 'Adicionar ao carrinho';
      button.classList.remove('is-added');
    }, 1600);
  });
});

document.querySelectorAll('.buy-now').forEach((button) => {
  button.addEventListener('click', (event) => {
    event.stopPropagation();

    const card = button.closest('.produto-card');
    cart.push({
      name: card.querySelector('h3').textContent,
      price: card.querySelector('.price').textContent,
      size: card.querySelector('.produto-tamanho').textContent
    });
    localStorage.setItem('cart', JSON.stringify(cart));
    openCart();
    purchaseChoiceOverlay.hidden = false;
  });
});
