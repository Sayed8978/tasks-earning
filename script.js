const $ = (selector) => document.querySelector(selector);
const authDialog = $('#authDialog');
const toast = $('#toast');
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

document.querySelectorAll('[data-open-auth]').forEach((button) => {
  button.addEventListener('click', () => {
    const isRegister = button.dataset.openAuth === 'register';
    $('#authTitle').textContent = isRegister ? 'অ্যাকাউন্ট খুলুন' : 'লগইন';
    authDialog.showModal();
  });
});

$('#closeAuth').addEventListener('click', () => authDialog.close());
$('#authNotice').addEventListener('click', () => {
  authDialog.close();
  showToast('সার্ভার সংযুক্ত না হওয়া পর্যন্ত অ্যাকাউন্ট তৈরি করা যাবে না।');
});
authDialog.addEventListener('click', (event) => {
  if (event.target === authDialog) authDialog.close();
});

$('#themeBtn').addEventListener('click', () => {
  document.body.classList.toggle('light');
  const light = document.body.classList.contains('light');
  $('#themeBtn').textContent = light ? '☾' : '☼';
  showToast(light ? 'লাইট মোড চালু হয়েছে' : 'ডার্ক মোড চালু হয়েছে');
});

$('#menuBtn').addEventListener('click', () => {
  $('.desktop-nav').classList.toggle('open');
});
document.querySelectorAll('.desktop-nav a').forEach((link) => {
  link.addEventListener('click', () => $('.desktop-nav').classList.remove('open'));
});
