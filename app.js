// ============================================
// تطبيق منصة زيوت السيارات الذكية
// مدعوم بـ MCP & Claude AI
// ============================================

const CONFIG = {
  WHATSAPP: '201019388501',
  ITEMS_PER_PAGE: 50,
  CACHE_DURATION: 3600000, // 1 hour
  AI_ENABLED: true
};

let allData = { products: [], categories: [] };
let filteredProducts = [];
let currentPage = 1;
let cart = [];
let currentView = 'table';

// ============================================
// تحميل البيانات والتهيئة
// ============================================

async function init() {
  showLoading(true);
  try {
    const response = await fetch('oil_shop_complete.json');
    allData = await response.json();
    
    // Load cart from storage
    await loadCart();
    
    // Initialize UI
    populateCategories();
    updateStats();
    applyFilters();
    setupInstallButton();
    
    showLoading(false);
  } catch (error) {
    console.error('خطأ في تحميل البيانات:', error);
    showLoading(false);
    alert('حدث خطأ في تحميل البيانات. يرجى تحديث الصفحة.');
  }
}

function showLoading(show) {
  document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

// ============================================
// إحصائيات
// ============================================

function updateStats() {
  const products = allData.products || [];
  
  document.getElementById('totalProducts').textContent = products.length;
  document.getElementById('totalCategories').textContent = (allData.categories || []).length;
  
  const avgPrice = products.length > 0 
    ? Math.round(products.reduce((sum, p) => sum + (p.wholesale_price || 0), 0) / products.length)
    : 0;
  document.getElementById('avgPrice').textContent = avgPrice + ' ج.م';
  
  document.getElementById('filteredCount').textContent = filteredProducts.length;
}

function populateCategories() {
  const select = document.getElementById('categoryFilter');
  const categories = allData.categories || [];
  
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = cat.name;
    select.appendChild(option);
  });
}

// ============================================
// الفلترة والبحث
// ============================================

function applyFilters() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const categoryId = document.getElementById('categoryFilter').value;
  const packSize = document.getElementById('packFilter').value;
  const minPrice = parseFloat(document.getElementById('minPrice').value) || 0;
  const maxPrice = parseFloat(document.getElementById('maxPrice').value) || Infinity;
  const sortOrder = document.getElementById('sortOrder').value;
  
  let filtered = [...(allData.products || [])];
  
  // البحث النصي
  if (searchTerm) {
    filtered = filtered.filter(p => 
      (p.product_name || '').toLowerCase().includes(searchTerm) ||
      (p.category_name || '').toLowerCase().includes(searchTerm)
    );
  }
  
  // فلتر الفئة
  if (categoryId !== 'all') {
    filtered = filtered.filter(p => String(p.category_id) === categoryId);
  }
  
  // فلتر حجم العبوة
  if (packSize !== 'all') {
    filtered = filtered.filter(p => String(p.liters) === packSize);
  }
  
  // فلتر السعر
  filtered = filtered.filter(p => {
    const price = p.wholesale_price || 0;
    return price >= minPrice && price <= maxPrice;
  });
  
  // الترتيب
  filtered.sort((a, b) => {
    switch (sortOrder) {
      case 'name-asc': return (a.product_name || '').localeCompare(b.product_name || '', 'ar');
      case 'name-desc': return (b.product_name || '').localeCompare(a.product_name || '', 'ar');
      case 'price-asc': return (a.wholesale_price || 0) - (b.wholesale_price || 0);
      case 'price-desc': return (b.wholesale_price || 0) - (a.wholesale_price || 0);
      case 'size-asc': return (a.liters || 0) - (b.liters || 0);
      case 'size-desc': return (b.liters || 0) - (a.liters || 0);
      default: return 0;
    }
  });
  
  filteredProducts = filtered;
  currentPage = 1;
  updateStats();
  renderCurrentView();
  renderPagination();
}

function resetFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('categoryFilter').value = 'all';
  document.getElementById('packFilter').value = 'all';
  document.getElementById('minPrice').value = '';
  document.getElementById('maxPrice').value = '';
  document.getElementById('sortOrder').value = 'name-asc';
  applyFilters();
}

// ============================================
// عرض المنتجات
// ============================================

function renderCurrentView() {
  switch (currentView) {
    case 'table':
      renderTableView();
      break;
    case 'grid':
      renderGridView();
      break;
    case 'cards':
      renderCardsView();
      break;
  }
}

function renderTableView() {
  const tbody = document.getElementById('productsBody');
  const start = (currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
  const end = start + CONFIG.ITEMS_PER_PAGE;
  const pageProducts = filteredProducts.slice(start, end);
  
  tbody.innerHTML = pageProducts.map((p, idx) => {
    const pricePerLiter = p.liters > 0 ? (p.wholesale_price / p.liters).toFixed(2) : 'N/A';
    return `
      <tr>
        <td>${start + idx + 1}</td>
        <td>
          <strong>${p.product_name || 'غير محدد'}</strong>
          <br><small style="color:#666;">${p.category_name || ''}</small>
        </td>
        <td><span class="badge">${p.category_name || 'غير محدد'}</span></td>
        <td>${p.liters || 0} لتر</td>
        <td><strong style="color:#2563eb;">${p.wholesale_price || 0} ج.م</strong></td>
        <td>${pricePerLiter} ج.م</td>
        <td>
          <button class="btn-icon" onclick="addToCart(${p.id})" title="إضافة للسلة">🛒</button>
          <button class="btn-icon" onclick="showProductDetails(${p.id})" title="التفاصيل">ℹ️</button>
          <button class="btn-icon" onclick="orderDirect(${p.id})" title="طلب مباشر">📱</button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderGridView() {
  const container = document.getElementById('gridView');
  const start = (currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
  const end = start + CONFIG.ITEMS_PER_PAGE;
  const pageProducts = filteredProducts.slice(start, end);
  
  container.innerHTML = pageProducts.map(p => {
    const pricePerLiter = p.liters > 0 ? (p.wholesale_price / p.liters).toFixed(2) : 'N/A';
    return `
      <div class="product-grid-item">
        <div class="product-badge">${p.category_name || 'غير محدد'}</div>
        <h3>${p.product_name || 'غير محدد'}</h3>
        <div class="product-info">
          <div class="info-row">
            <span>الحجم:</span>
            <strong>${p.liters || 0} لتر</strong>
          </div>
          <div class="info-row">
            <span>السعر:</span>
            <strong style="color:#2563eb;">${p.wholesale_price || 0} ج.م</strong>
          </div>
          <div class="info-row">
            <span>السعر/لتر:</span>
            <strong>${pricePerLiter} ج.م</strong>
          </div>
        </div>
        <div class="product-actions">
          <button class="btn primary" onclick="addToCart(${p.id})">🛒 إضافة</button>
          <button class="btn secondary" onclick="showProductDetails(${p.id})">التفاصيل</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderCardsView() {
  const container = document.getElementById('cardsView');
  const start = (currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
  const end = start + CONFIG.ITEMS_PER_PAGE;
  const pageProducts = filteredProducts.slice(start, end);
  
  container.innerHTML = pageProducts.map(p => {
    const pricePerLiter = p.liters > 0 ? (p.wholesale_price / p.liters).toFixed(2) : 'N/A';
    return `
      <div class="product-card">
        <div class="card-header">
          <h3>${p.product_name || 'غير محدد'}</h3>
          <span class="badge">${p.category_name || ''}</span>
        </div>
        <div class="card-body">
          <div class="price-section">
            <div class="main-price">${p.wholesale_price || 0} ج.م</div>
            <div class="sub-price">${pricePerLiter} ج.م/لتر</div>
          </div>
          <div class="size-section">
            <span>📦 العبوة:</span>
            <strong>${p.liters || 0} لتر</strong>
          </div>
        </div>
        <div class="card-footer">
          <button class="btn primary" onclick="addToCart(${p.id})">🛒 إضافة للسلة</button>
          <button class="btn ghost" onclick="orderDirect(${p.id})">📱 طلب مباشر</button>
        </div>
      </div>
    `;
  }).join('');
}

function switchView(view) {
  currentView = view;
  
  // Update button states
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.view === view) btn.classList.add('active');
  });
  
  // Show/hide containers
  document.getElementById('tableView').style.display = view === 'table' ? 'block' : 'none';
  document.getElementById('gridView').style.display = view === 'grid' ? 'grid' : 'none';
  document.getElementById('cardsView').style.display = view === 'cards' ? 'grid' : 'none';
  
  renderCurrentView();
}

function renderPagination() {
  const totalPages = Math.ceil(filteredProducts.length / CONFIG.ITEMS_PER_PAGE);
  const container = document.getElementById('pagination');
  
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  
  let html = '<div class="pagination-controls">';
  
  // Previous button
  html += `<button class="page-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>السابق</button>`;
  
  // Page numbers
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  
  if (startPage > 1) {
    html += `<button class="page-btn" onclick="changePage(1)">1</button>`;
    if (startPage > 2) html += '<span>...</span>';
  }
  
  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) html += '<span>...</span>';
    html += `<button class="page-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
  }
  
  // Next button
  html += `<button class="page-btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>التالي</button>`;
  
  html += '</div>';
  container.innerHTML = html;
}

function changePage(page) {
  const totalPages = Math.ceil(filteredProducts.length / CONFIG.ITEMS_PER_PAGE);
  if (page < 1 || page > totalPages) return;
  
  currentPage = page;
  renderCurrentView();
  renderPagination();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// السلة
// ============================================

async function loadCart() {
  try {
    const stored = await window.storage.get('cart');
    cart = stored ? JSON.parse(stored.value) : [];
    updateCartUI();
  } catch (e) {
    cart = [];
  }
}

async function saveCart() {
  try {
    await window.storage.set('cart', JSON.stringify(cart));
  } catch (e) {
    console.error('خطأ في حفظ السلة:', e);
  }
}

function addToCart(productId) {
  const product = allData.products.find(p => p.id === productId);
  if (!product) return;
  
  const existingItem = cart.find(item => item.id === productId);
  
  if (existingItem) {
    existingItem.quantity++;
  } else {
    cart.push({
      id: product.id,
      name: product.product_name,
      category: product.category_name,
      liters: product.liters,
      price: product.wholesale_price,
      quantity: 1
    });
  }
  
  saveCart();
  updateCartUI();
  showNotification('تمت الإضافة إلى السلة ✅');
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  updateCartUI();
  renderCartItems();
}

function updateQuantity(productId, change) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  
  item.quantity += change;
  
  if (item.quantity <= 0) {
    removeFromCart(productId);
  } else {
    saveCart();
    updateCartUI();
    renderCartItems();
  }
}

function updateCartUI() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById('cartCount').textContent = count;
}

function showCart() {
  renderCartItems();
  document.getElementById('cartModal').classList.add('show');
}

function closeCart() {
  document.getElementById('cartModal').classList.remove('show');
}

function renderCartItems() {
  const container = document.getElementById('cartItems');
  
  if (cart.length === 0) {
    container.innerHTML = '<p class="empty-cart">السلة فارغة</p>';
    document.getElementById('cartTotal').textContent = '0 ج.م';
    return;
  }
  
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="item-info">
        <strong>${item.name}</strong>
        <small>${item.category} | ${item.liters} لتر</small>
      </div>
      <div class="item-quantity">
        <button onclick="updateQuantity(${item.id}, -1)">-</button>
        <span>${item.quantity}</span>
        <button onclick="updateQuantity(${item.id}, 1)">+</button>
      </div>
      <div class="item-price">${(item.price * item.quantity).toFixed(2)} ج.م</div>
      <button class="btn-remove" onclick="removeFromCart(${item.id})">🗑️</button>
    </div>
  `).join('');
  
  document.getElementById('cartTotal').textContent = total.toFixed(2) + ' ج.م';
}

function clearCart() {
  if (confirm('هل تريد إفراغ السلة؟')) {
    cart = [];
    saveCart();
    updateCartUI();
    renderCartItems();
  }
}

function checkoutCart() {
  if (cart.length === 0) {
    alert('السلة فارغة');
    return;
  }
  
  const orderText = cart.map(item => 
    `• ${item.name}\n  الكمية: ${item.quantity}\n  العبوة: ${item.liters} لتر\n  السعر: ${(item.price * item.quantity).toFixed(2)} ج.م`
  ).join('\n\n');
  
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const message = `🛒 *طلب جديد من الموزع المعتمد*\n\n${orderText}\n\n📊 *الإجمالي: ${total.toFixed(2)} ج.م*\n\nيرجى تأكيد الطلب وتحديد موعد التسليم.`;
  
  window.open(`https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(message)}`);
}

// ============================================
// الطلب المباشر
// ============================================

function orderDirect(productId) {
  const product = allData.products.find(p => p.id === productId);
  if (!product) return;
  
  const message = `أنا موزع معتمد\nأرغب في:\n\n${product.product_name}\nعبوة: ${product.liters} لتر\nسعر الجملة: ${product.wholesale_price} ج.م\n\nيرجى التأكيد وتحديد موعد التسليم.`;
  
  window.open(`https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(message)}`);
}

function bulkInquiry() {
  const message = 'أنا موزع معتمد وأرغب في قائمة أسعار الجملة الكاملة والعروض الحالية.';
  window.open(`https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(message)}`);
}

// ============================================
// تفاصيل المنتج
// ============================================

function showProductDetails(productId) {
  const product = allData.products.find(p => p.id === productId);
  if (!product) return;
  
  const pricePerLiter = product.liters > 0 ? (product.wholesale_price / product.liters).toFixed(2) : 'N/A';
  
  const html = `
    <div class="product-details">
      <h2>${product.product_name}</h2>
      <div class="detail-section">
        <div class="detail-row">
          <span>الفئة:</span>
          <strong>${product.category_name || 'غير محدد'}</strong>
        </div>
        <div class="detail-row">
          <span>حجم العبوة:</span>
          <strong>${product.liters || 0} ${product.unit || 'لتر'}</strong>
        </div>
        <div class="detail-row">
          <span>سعر الجملة:</span>
          <strong style="color:#2563eb;font-size:1.2em;">${product.wholesale_price || 0} ج.م</strong>
        </div>
        <div class="detail-row">
          <span>السعر لكل لتر:</span>
          <strong>${pricePerLiter} ج.م</strong>
        </div>
      </div>
      <div class="detail-actions">
        <button class="btn primary" onclick="addToCart(${product.id}); closeDetails();">🛒 إضافة للسلة</button>
        <button class="btn secondary" onclick="orderDirect(${product.id})">📱 طلب مباشر</button>
      </div>
    </div>
  `;
  
  document.getElementById('productDetails').innerHTML = html;
  document.getElementById('detailsModal').classList.add('show');
}

function closeDetails() {
  document.getElementById('detailsModal').classList.remove('show');
}

// ============================================
// مساعد الذكاء الاصطناعي (MCP)
// ============================================

let aiConversation = [];

function openAIAssistant() {
  document.getElementById('aiPanel').style.display = 'block';
  document.getElementById('aiInput').focus();
}

function closeAIAssistant() {
  document.getElementById('aiPanel').style.display = 'none';
}

function quickAsk(question) {
  document.getElementById('aiInput').value = question;
  sendAIMessage();
}

async function sendAIMessage() {
  const input = document.getElementById('aiInput');
  const message = input.value.trim();
  
  if (!message) return;
  
  // Add user message
  addAIMessage(message, 'user');
  input.value = '';
  
  // Show typing indicator
  const typingId = addAIMessage('جاري الكتابة...', 'bot', true);
  
  try {
    const response = await queryAI(message);
    removeAIMessage(typingId);
    addAIMessage(response, 'bot');
  } catch (error) {
    removeAIMessage(typingId);
    addAIMessage('عذراً، حدث خطأ. حاول مرة أخرى.', 'bot');
  }
}

async function queryAI(userMessage) {
  // Build context with product data
  const context = {
    totalProducts: allData.products.length,
    categories: allData.categories.map(c => c.name),
    priceRange: {
      min: Math.min(...allData.products.map(p => p.wholesale_price)),
      max: Math.max(...allData.products.map(p => p.wholesale_price))
    },
    sizes: [...new Set(allData.products.map(p => p.liters))].sort((a, b) => a - b)
  };
  
  aiConversation.push({
    role: 'user',
    content: userMessage
  });
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `أنت مساعد ذكي لمنصة زيوت السيارات. لديك معلومات عن:
- ${context.totalProducts} منتج
- الفئات: ${context.categories.join('، ')}
- نطاق الأسعار: ${context.priceRange.min} - ${context.priceRange.max} ج.م
- أحجام العبوات المتاحة: ${context.sizes.join('، ')} لتر

ساعد العميل في:
1. البحث عن منتجات مناسبة
2. مقارنة الأسعار
3. تقديم توصيات
4. الإجابة عن الاستفسارات

كن مختصراً ومفيداً وودوداً.`,
        messages: aiConversation
      })
    });
    
    const data = await response.json();
    const aiResponse = data.content
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join('\n');
    
    aiConversation.push({
      role: 'assistant',
      content: aiResponse
    });
    
    // Check if AI suggests specific products
    processAIResponse(aiResponse);
    
    return aiResponse;
    
  } catch (error) {
    console.error('AI Error:', error);
    return 'عذراً، لم أتمكن من معالجة طلبك الآن. حاول مرة أخرى.';
  }
}

function processAIResponse(response) {
  // Extract product recommendations and apply filters
  const lowerResponse = response.toLowerCase();
  
  // Check for category mentions
  allData.categories.forEach(cat => {
    if (lowerResponse.includes(cat.name.toLowerCase())) {
      document.getElementById('categoryFilter').value = cat.id;
    }
  });
  
  // Check for size mentions
  const sizeMatch = response.match(/(\d+)\s*لتر/);
  if (sizeMatch) {
    document.getElementById('packFilter').value = sizeMatch[1];
  }
  
  // Auto-apply filters if AI made suggestions
  if (lowerResponse.includes('توصي') || lowerResponse.includes('أقترح')) {
    setTimeout(() => applyFilters(), 500);
  }
}

function addAIMessage(text, sender, isTyping = false) {
  const chat = document.getElementById('aiChat');
  const messageId = 'msg-' + Date.now();
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `ai-message ${sender}`;
  messageDiv.id = messageId;
  
  if (isTyping) {
    messageDiv.innerHTML = `
      <div class="message-content typing">
        <span></span><span></span><span></span>
      </div>
    `;
  } else {
    messageDiv.innerHTML = `<div class="message-content">${text}</div>`;
  }
  
  chat.appendChild(messageDiv);
  chat.scrollTop = chat.scrollHeight;
  
  return messageId;
}

function removeAIMessage(messageId) {
  const msg = document.getElementById(messageId);
  if (msg) msg.remove();
}

// ============================================
// تصدير البيانات
// ============================================

function exportResults() {
  const csvContent = [
    ['المنتج', 'الفئة', 'الحجم', 'سعر الجملة', 'السعر/لتر'].join(','),
    ...filteredProducts.map(p => [
      p.product_name,
      p.category_name,
      p.liters,
      p.wholesale_price,
      (p.wholesale_price / p.liters).toFixed(2)
    ].join(','))
  ].join('\n');
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `products_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  
  showNotification('تم تصدير البيانات ✅');
}

// ============================================
// إضافات
// ============================================

function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => notification.classList.add('show'), 10);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function setupInstallButton() {
  let deferredPrompt;
  const btn = document.getElementById('installAppBtn');
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btn.style.display = 'block';
  });
  
  btn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    btn.style.display = 'none';
  });
}

function showAbout() {
  alert('منصة زيوت السيارات الذكية\nنظام متقدم للموزعين المعتمدين\nمدعوم بتقنيات MCP والذكاء الاصطناعي');
}

function showHelp() {
  alert('للمساعدة:\n- استخدم الفلاتر للبحث\n- اضغط على 🤖 للمساعد الذكي\n- أضف المنتجات للسلة\n- اتصل بنا عبر واتساب');
}

function showContact() {
  window.open(`https://wa.me/${CONFIG.WHATSAPP}?text=مرحباً، أحتاج مساعدة`);
}

// ============================================
// تهيئة التطبيق
// ============================================

document.addEventListener('DOMContentLoaded', init);

// Modal close on outside click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('show');
  }
});

// ESC key to close modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
    closeAIAssistant();
  }
});

// Enter key in AI input
document.getElementById('aiInput')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendAIMessage();
});
