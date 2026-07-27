const yearElement = document.getElementById('year');
if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

const footerYear = document.getElementById('footerYear');
if (footerYear) {
  footerYear.textContent = new Date().getFullYear();
}


const heroProductsButton = document.getElementById('heroProductsButton');
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

const isLoggedIn = () => Boolean(localStorage.getItem('customer'));

const advanceToCheckout = () => {
  // Garante que o fluxo vá direto para a finalização do pedido
  checkoutReady = true;
  cartCheckout.click();
};


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

const paymentFinalizationOverlay = document.getElementById('paymentFinalizationOverlay');
const paymentFinalizationClose = document.getElementById('paymentFinalizationClose');
const paymentFinalizationConfirm = document.getElementById('paymentFinalizationConfirm');
const paymentFinalizationEdit = document.getElementById('paymentFinalizationEdit');

const paymentSubtotal = document.getElementById('paymentSubtotal');
const paymentShipping = document.getElementById('paymentShipping');
const paymentTotal = document.getElementById('paymentTotal');

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

const menuToggle = document.getElementById('menuToggle');
const topLinks = document.getElementById('topLinks');

if (menuToggle && topLinks) {
  menuToggle.addEventListener('click', () => {
    topLinks.classList.toggle('active');
    menuToggle.setAttribute('aria-label', topLinks.classList.contains('active') ? 'Fechar menu' : 'Abrir menu');
  });

  // Fechar menu ao clicar em um link
  topLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      topLinks.classList.remove('active');
      menuToggle.setAttribute('aria-label', 'Abrir menu');
    });
  });
}

const purchaseChoiceOverlay = document.getElementById('purchaseChoiceOverlay');
const purchaseFinish = document.getElementById('purchaseFinish');
const purchaseContinue = document.getElementById('purchaseContinue');
const successOverlay = document.getElementById('successOverlay');
const successClose = document.getElementById('successClose');






const priceValue = (price) => Number(price.replace(/[^\d,]/g, '').replace(',', '.'));

const calcularFretePorCep = (cep, subtotal) => {
  // Proxy simples por prefixo do CEP (sem API real dos Correios)
  const cepDigits = String(cep || '').replace(/\D/g, '');
  if (cepDigits.length < 8) return 0;

  const prefix = Number(cepDigits.slice(0, 1));
  let frete = 0;

  // - 0-3 => 18
  // - 4-6 => 14
  // - 7-9 => 22
  if (prefix <= 3) frete = 18;
  else if (prefix <= 6) frete = 14;
  else frete = 22;

  // Se carrinho baixo, mantém mínimo proporcional
  frete = Math.max(frete, Math.round(subtotal * 0.08 * 100) / 100);
  return frete;
};


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

  // Render seguro (sem innerHTML) para evitar XSS via localStorage
  profileDetails.textContent = '';

  if (!customer) {
    const empty = document.createElement('p');
    empty.className = 'profile-empty';
    empty.textContent = 'Nenhum cadastro salvo ainda.';
    profileDetails.appendChild(empty);
  } else {
    const wrapper = document.createElement('div');
    wrapper.className = 'profile-details';

    const p1 = document.createElement('p');
    p1.innerHTML = '<strong>Nome:</strong> '; // safe (constante)
    p1.appendChild(document.createTextNode(customer.name || '—'));

    const p2 = document.createElement('p');
    p2.innerHTML = '<strong>Telefone:</strong> '; // safe (constante)
    p2.appendChild(document.createTextNode(customer.phone || '—'));

    const p3 = document.createElement('p');
    p3.innerHTML = '<strong>E-mail:</strong> '; // safe (constante)
    p3.appendChild(document.createTextNode(customer.email || '—'));

    const p4 = document.createElement('p');
    p4.innerHTML = '<strong>Endereço:</strong> '; // safe (constante)
    p4.appendChild(document.createTextNode(customer.address || '—'));

    const actions = document.createElement('div');
    actions.className = 'profile-actions';
    actions.style.display = 'flex';
    actions.style.gap = '0.75rem';
    actions.style.alignItems = 'center';
    actions.style.marginTop = '1rem';

    const editBtn = document.createElement('button');
    editBtn.className = 'payment-edit';
    editBtn.type = 'button';
    editBtn.id = 'profileEditAddress';
    editBtn.textContent = 'Editar cadastro';

    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'delete-account';
    logoutBtn.type = 'button';
    logoutBtn.id = 'profileLogout';
    logoutBtn.textContent = 'Sair';

    actions.appendChild(editBtn);
    actions.appendChild(logoutBtn);

    wrapper.appendChild(p1);
    wrapper.appendChild(p2);
    wrapper.appendChild(p3);
    wrapper.appendChild(p4);
    wrapper.appendChild(actions);

    profileDetails.appendChild(wrapper);
  }

  // Pedidos
  orderHistory.textContent = '';

  if (!Array.isArray(orders) || orders.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'profile-empty';
    empty.textContent = 'Você ainda não realizou pedidos.';
    orderHistory.appendChild(empty);
    return;
  }

  // limitar para não travar render em caso de histórico grande
  const safeOrders = orders.slice(0, 20);

  const fragment = document.createDocumentFragment();
  safeOrders.forEach((order) => {
    const article = document.createElement('article');
    article.className = 'order-history-item';

    const h4 = document.createElement('h4');
    h4.textContent = order?.date || '—';

    const pItems = document.createElement('p');
    const items = Array.isArray(order?.items) ? order.items : [];
    pItems.textContent = items.map((it) => it?.name).filter(Boolean).join(', ') || '—';

    const pTotal = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = order?.total || '—';
    pTotal.appendChild(strong);

    article.appendChild(h4);
    article.appendChild(pItems);
    article.appendChild(pTotal);

    fragment.appendChild(article);
  });

  orderHistory.appendChild(fragment);
};


const updateUserGreeting = () => {
  const customer = JSON.parse(localStorage.getItem('customer') || 'null');
  const firstName = customer?.name?.trim().split(/\s+/)[0];

  // userGreeting (span no topo): removido para não repetir "Olá" duas vezes
  userGreeting.hidden = true;
  userGreeting.textContent = '';


  // botão unificado no header (profileTrigger/id="profileTrigger")
  if (profileTrigger) {
    profileTrigger.textContent = firstName ? `Olá, ${firstName}` : 'Log-in';
  }

  // botão do hero ("Olá, NOME! Conheça nossos produtos" quando logado)
  if (heroProductsButton) {
    heroProductsButton.textContent = firstName
      ? `Olá, ${firstName}! Conheça nossos produtos`
      : 'Conheça nossos produtos';
  }
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

// Um único botão (id=profileTrigger) faz:
// - se logado: abre perfil
// - se não logado: abre cadastro
profileTrigger.addEventListener('click', () => {
  const savedCustomer = JSON.parse(localStorage.getItem('customer') || 'null');
  if (savedCustomer) {
    openProfile();
    return;

  }


  registrationOnly = true;

  closeCart();
  closeProfile();
  checkoutForm.reset();
  registrationOverlay.hidden = false;
  checkoutForm.querySelector('input').focus();
});

profileClose.addEventListener('click', closeProfile);

// Fechar perfil ao clicar em área não interativa do modal
profileModal.addEventListener('click', (e) => {
  const tag = e.target.tagName;
  const isInteractive = ['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT'].includes(tag)
    || e.target.closest('button')
    || e.target.closest('a')
    || e.target.closest('input')
    || e.target.closest('textarea')
    || e.target.closest('select');
  if (!isInteractive) {
    closeProfile();
  }
});


profileDetails.addEventListener('click', (event) => {
  const editBtn = event.target.closest('#profileEditAddress');
  if (editBtn) {
    // Reabre o cadastro para o usuário editar (mesmo fluxo do botão de editar cadastro do pagamento)
    closeProfile();
    registrationOnly = true;
    checkoutForm.reset();

    const customer = JSON.parse(localStorage.getItem('customer') || 'null');
    if (customer) {
      checkoutForm.querySelector('#customerName').value = customer.name || '';
      checkoutForm.querySelector('#customerPhone').value = customer.phone || '';
      checkoutForm.querySelector('#customerCep').value = customer.cep || '';
      checkoutForm.querySelector('#customerEmail').value = customer.email || '';
      checkoutForm.querySelector('#customerAddress').value = customer.address || '';
    }

    registrationOverlay.hidden = false;
    checkoutForm.querySelector('input')?.focus();
    return;
  }

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

  const savedCustomer = JSON.parse(localStorage.getItem('customer') || 'null');

  // Se não estiver logado, abre cadastro (precisa logar antes)
  if (!savedCustomer) {
    closeCart();
    registrationOnly = false;
    registrationOverlay.hidden = false;
    checkoutForm.querySelector('input').focus();
    return;
  }

  // Fecha o carrinho e abre o modal de finalização
  closeCart();

  const subtotal = cart.reduce((sum, item) => sum + priceValue(item.price), 0);

  // Frete por CEP (proxy simples: sem API dos Correios)
  const frete = calcularFretePorCep(savedCustomer?.cep, subtotal);
  const total = subtotal + frete;


  if (paymentSubtotal) paymentSubtotal.textContent = subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (paymentShipping) paymentShipping.textContent = frete.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (paymentTotal) paymentTotal.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });


  if (paymentFinalizationOverlay) paymentFinalizationOverlay.hidden = false;
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

  // Se o cliente estiver logado, vai direto para a finalização (modal de pagamento)
  cartCheckout.click();
});


// Fechar popup de sucesso
if (successClose) {
  successClose.addEventListener('click', () => {
    successOverlay.hidden = true;
  });
}

// ---------- Modal finalização do pagamento ----------
const closePaymentFinalization = () => {
  if (paymentFinalizationOverlay) paymentFinalizationOverlay.hidden = true;
};

if (paymentFinalizationClose) {
  paymentFinalizationClose.addEventListener('click', closePaymentFinalization);
}

if (paymentFinalizationEdit) {
  paymentFinalizationEdit.addEventListener('click', () => {
    closePaymentFinalization();
    // Reabre cadastro para editar
    registrationOnly = true;
    checkoutForm.reset();
    registrationOverlay.hidden = false;
    checkoutForm.querySelector('input')?.focus();
  });
}

const pixPaymentOverlay = document.getElementById('pixPaymentOverlay');
const pixPaymentClose = document.getElementById('pixPaymentClose');
const pixPaymentDone = document.getElementById('pixPaymentDone');
const pixPaymentTotal = document.getElementById('pixPaymentTotal');
const pixQrImage = document.getElementById('pixQrImage');
const pixCopyCode = document.getElementById('pixCopyCode');
const pixCopyButton = document.getElementById('pixCopyButton');

const closePixPayment = () => {
  if (pixPaymentOverlay) pixPaymentOverlay.hidden = true;
};

if (pixPaymentClose) {
  pixPaymentClose.addEventListener('click', () => {
    closePixPayment();
    if (paymentFinalizationOverlay) paymentFinalizationOverlay.hidden = false;
  });
}

const getPixCodePlaceholder = () => 'COPIAR_PIX_AQUI';

if (paymentFinalizationOverlay && paymentFinalizationConfirm) {
  paymentFinalizationConfirm.addEventListener('click', () => {
    // Usa o mesmo submit do formulário de cadastro: se já existe customer, envia direto.
    // Se não existe, força abrir o cadastro.
    const savedCustomer = JSON.parse(localStorage.getItem('customer') || 'null');

    if (!savedCustomer) {
      closePaymentFinalization();
      registrationOnly = false;
      registrationOverlay.hidden = false;
      checkoutForm.querySelector('input')?.focus();
      return;
    }

    // Atualiza valores do resumo com base no CEP atual
    const subtotal = cart.reduce((sum, item) => sum + priceValue(item.price), 0);
    const frete = calcularFretePorCep(savedCustomer.cep, subtotal);
    const total = subtotal + frete;

    // Prepara QR/código Pix (placeholder; você pode substituir depois por um valor real)
    if (pixPaymentTotal) pixPaymentTotal.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if (pixCopyCode) pixCopyCode.textContent = getPixCodePlaceholder();

    // Por enquanto, usamos uma imagem placeholder simples (não quebra layout).
    // Troque o src por um QR real quando tiver a geração do Pix.
    if (pixQrImage) pixQrImage.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
        <rect width="180" height="180" fill="#fff"/>
        <rect x="10" y="10" width="160" height="160" fill="#fff" stroke="#000" stroke-opacity="0.15"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="14" fill="#6f6f6f">QR Pix</text>
      </svg>
    `);

    // Fecha modal de pagamento e abre modal do QR
    if (paymentFinalizationOverlay) paymentFinalizationOverlay.hidden = true;
    if (pixPaymentOverlay) pixPaymentOverlay.hidden = false;
  });
}

if (pixPaymentDone) {
  pixPaymentDone.addEventListener('click', () => {
    // Aqui você pode, futuramente, validar o Pix. Por enquanto, apenas segue o fluxo de finalizar pedido.
    closePixPayment();

    // Solicita submit para registrar o pedido (usa o mesmo handler já existente)
    checkoutForm.requestSubmit();
  });
}



purchaseContinue.addEventListener('click', () => {

  purchaseChoiceOverlay.hidden = true;

  // Garante que o carrinho (lateral) não fique aberto, mas o produto clicado já está no carrinho.
  closeCart();

  // Atualiza o número do carrinho no topo
  renderCart();

  // Volta para a seção de produtos para continuar comprando
  document.getElementById('sabores')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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


  // Salva o pedido no histórico do perfil
  try {
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');

    const orderItems = cart.map((it) => ({
      name: it.name,
      size: it.size,
      price: it.price
    }));

    const newOrder = {
      date: new Date().toLocaleDateString('pt-BR'),
      items: orderItems,
      total: cartTotal?.textContent || ''
    };

    localStorage.setItem('orders', JSON.stringify([newOrder, ...(Array.isArray(orders) ? orders : [])]));
  } catch {
    // não impede o fluxo do pedido
  }

  // Mantém cliente logado e reseta fluxo
  localStorage.setItem('customer', JSON.stringify(customer));
  checkoutReady = true;
  registrationOverlay.hidden = true;
  updateUserGreeting();

  // Limpa o carrinho após finalizar
  cart = [];
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart();

  // Atualiza o perfil (caso esteja aberto)
  renderProfile();
  openCart();
});

// Envia e-mail via formsubmit quando o cliente clica em "Finalizar pedido" (logado ou após cadastro)
const enviarEmailCompra = async (customerName) => {
  try {
    await fetch('https://formsubmit.co/ajax/cafedellagnolo@gmail.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        _subject: 'Compra confirmada — Caffè Dell’Agnolo',
        nome: customerName || 'Cliente',
        mensagem: (() => {
          const customer = JSON.parse(localStorage.getItem('customer') || 'null');
          const orders = JSON.parse(localStorage.getItem('orders') || '[]');
          const lastOrder = orders[0];

          const itemsText = lastOrder?.items
            ? lastOrder.items.map((it) => `${it.name} (${it.size}) — ${it.price}`).join('\n')
            : '—';

          return [
            'Cadastro do cliente:',
            `Nome: ${customer?.name || '—'}`,
            `Telefone: ${customer?.phone || '—'}`,
            `E-mail: ${customer?.email || '—'}`,
            `CEP: ${customer?.cep || '—'}`,
            `Endereço: ${customer?.address || '—'}`,
            '',
            'Comprou:',
            itemsText,
            '',
            `Total: ${lastOrder?.total || '—'}`
          ].join('\n');
        })()
      })
    });
  } catch {
    // Silencioso: não deve impedir o fluxo do pedido
  }
};



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
    updateUserGreeting();

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

    // Fecha o carrinho lateral e abre a escolha (finalizar agora x continuar comprando)
    closeCart();
    renderCart();

    // Garante que a box de escolha apareça mesmo estando logado
    purchaseChoiceOverlay.hidden = false;
  });
});

// ================= FADE UP ANIMATION =================
const fadeElements = document.querySelectorAll('.fade-up');

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  fadeElements.forEach((el) => observer.observe(el));
} else {
  // Fallback for older browsers
  fadeElements.forEach((el) => el.classList.add('is-visible'));
}

// ================= CARROSSEL PARCEIROS =================
// O carrossel funciona via animação CSS (esteiraMovimento) no .carousel-track


