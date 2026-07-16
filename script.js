const yearElement = document.getElementById('year');
if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
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
