
// API Configuration - Use your actual API endpoint
const API_BASE = 'http://localhost:5001'; // Replace with your actual API URL
// const API_BASE = 'https://laithhajhosin.github.io/host_api'; // Replace with your actual API URL

let currentUser = null;
let allProducts = [];
let aiRecommendations = [];
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let currentFilter = 'for-you';

// ========== Helper Functions ==========
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function updateCartCount() {
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    const cartCountSpan = document.getElementById('cartCount');
    if (cartCountSpan) cartCountSpan.innerText = count;
    localStorage.setItem('cart', JSON.stringify(cart));
}

function renderCart() {
    const container = document.getElementById('cartItems');
    const totalSpan = document.getElementById('cartTotal');
    if (!container) return;
    
    if (cart.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 2rem;">🛒 Your cart is empty</div>';
        if (totalSpan) totalSpan.innerText = '0';
        return;
    }
    
    let total = 0;
    container.innerHTML = cart.map(item => {
        total += item.price * item.quantity;
        return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                </div>
                <div class="cart-item-controls">
                    <button onclick="updateQuantity(${item.id}, -1)">-</button>
                    <span class="cart-item-quantity">${item.quantity}</span>
                    <button onclick="updateQuantity(${item.id}, 1)">+</button>
                    <button onclick="removeFromCart(${item.id})" style="background: #ff5722;">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
    if (totalSpan) totalSpan.innerText = total.toFixed(2);
}

function updateQuantity(productId, change) {
    const item = cart.find(i => i.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            cart = cart.filter(i => i.id !== productId);
        }
        updateCartCount();
        renderCart();
    }
}

function addToCart(product) {
    const existing = cart.find(i => i.id === product.product_id);
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ 
            id: product.product_id, 
            name: product.product_name, 
            price: product.price, 
            quantity: 1 
        });
    }
    updateCartCount();
    renderCart();
    showToast(`✨ ${product.product_name} added to cart!`);
}

function removeFromCart(productId) {
    cart = cart.filter(i => i.id !== productId);
    updateCartCount();
    renderCart();
    showToast('Item removed from cart', 'info');
}

function openCart() {
    renderCart();
    document.getElementById('cartSidebar').classList.add('open');
}

function closeCart() {
    document.getElementById('cartSidebar').classList.remove('open');
}

function checkout() {
    if (cart.length === 0) {
        showToast('Your cart is empty!', 'error');
        return;
    }
    showToast(`🎉 Order placed! Total: $${document.getElementById('cartTotal').innerText}`);
    cart = [];
    updateCartCount();
    renderCart();
    closeCart();
}

// ========== API Calls ==========
async function loadAllProducts() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        const data = await response.json();
        if (data.products) {
            allProducts = data.products;
        } else if (Array.isArray(data)) {
            allProducts = data;
        } else {
            allProducts = [];
        }
        return true;
    } catch(e) { 
        console.error('Error loading products:', e);
        allProducts = [];
        return false;
    }
}

async function loadAIRecommendations(userId) {
    try {
        const response = await fetch(`${API_BASE}/recommendations/${userId}`);
        const data = await response.json();
        
        // Handle different response formats
        if (data.recommendations) {
            aiRecommendations = data.recommendations;
        } else if (data.data && data.data.recommendations) {
            aiRecommendations = data.data.recommendations;
        } else if (Array.isArray(data)) {
            aiRecommendations = data;
        } else {
            aiRecommendations = [];
        }
        
        return aiRecommendations;
    } catch(e) {
        console.error('Error loading AI recommendations:', e);
        aiRecommendations = [];
        return [];
    }
}

async function regenerateRecommendations() {
    if (!currentUser) return;
    
    showToast('🔄 Running Genetic Algorithm...', 'info');
    const container = document.getElementById('forYouContainer');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Genetic Algorithm is finding the best recommendations for you...</p></div>';
    
    try {
        const response = await fetch(`${API_BASE}/recommendations/generate/${currentUser.id}`, {
            method: 'POST'
        });
        const data = await response.json();
        
        if (data.recommendations) {
            aiRecommendations = data.recommendations;
        } else if (data.data && data.data.recommendations) {
            aiRecommendations = data.data.recommendations;
        }
        
        showToast('✅ New recommendations generated!', 'success');
        showProducts('for-you');
    } catch(e) {
        console.error('Error regenerating:', e);
        showToast('Error generating recommendations', 'error');
        showProducts('for-you');
    }
}

async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/users`);
        const data = await response.json();
        return data.users || data;
    } catch(e) {
        console.error('Error loading users:', e);
        return [];
    }
}

// ========== Products Display ==========
async function showProducts(filter) {
    currentFilter = filter;
    const container = document.getElementById('forYouContainer');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading products...</p></div>';
    
    await loadAllProducts();
    
    if (filter === 'for-you') {
        await loadAIRecommendations(currentUser.id);
        
        if (aiRecommendations.length > 0) {
            renderProductsWithAISection(aiRecommendations);
        } else {
            container.innerHTML = `
                <div class="hero">
                    <h1>🤖 No Recommendations Yet</h1>
                    <p>Click the "Regenerate" button to get AI-powered recommendations!</p>
                </div>
            `;
        }
    } else if (filter === 'all') {
        renderProducts(allProducts, false);
    }
}
async function showallProducts() {
    const container = document.getElementById('forYouContainer');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading products...</p></div>';
    
    await loadAllProducts();
    
    renderProducts(allProducts, false);
}
showallProducts();

function renderProductsWithAISection(products) {
    const container = document.getElementById('forYouContainer');
    
    const highScoreProducts = products.filter(p => (p.recommendation_score || 0) > 70);
    const regularProducts = products.filter(p => (p.recommendation_score || 0) <= 70);
    
    let html = '';
    
    if (highScoreProducts.length > 0) {
        html += `
            <div class="section-header">
                <span>🔥 Top Picks</span>
            </div>
            <div class="products-grid">
                ${renderProductCards(highScoreProducts, true)}
            </div>
        `;
    }
    
    if (regularProducts.length > 0) {
        html += `
            <div class="section-header">
                <span>📦 Recommendations for you</span>
            </div>
            <div class="products-grid">
                ${renderProductCards(regularProducts, false)}
            </div>
        `;
    }
    
    if (products.length === 0) {
        html = '<div class="hero"><p>No products found. Try regenerating recommendations!</p></div>';
    }
    
    container.innerHTML = html;
}

function renderProducts(products, showFireTag = false) {
    const container = document.getElementById('ProductsContainer');
    if (!products || !products.length) {
        container.innerHTML = '<div class="hero"><p>No products found</p></div>';
        return;
    }
    
    container.innerHTML = `
        <div class="products-grid">
            ${renderProductCards(products, showFireTag)}
        </div>
    `;
}

function renderProductCards(products, showFireTag = false) {
    if (!products || !products.length) return '<p>No products found</p>';
    return products.map(p => {
        const avgRating = typeof p.avg_rating === 'number' ? p.avg_rating : parseFloat(p.avg_rating) || 0;
        const ratingCount = typeof p.rating_count === 'number' ? p.rating_count : parseInt(p.rating_count) || 0;
        const price = typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0;
        const score = typeof p.recommendation_score === 'number' ? p.recommendation_score : parseFloat(p.recommendation_score) || 0;
        
        return `
            <div class="product-card" onclick="viewProduct(${p.product_id})">
                ${(showFireTag && score > 70) ? '<div class="fire-tag">🔥 HOT</div>' : ''}
                <div class="product-image">${getIcon(p.category)}</div>
                <div class="product-info">
                    <div class="product-name">${p.product_name || `Product ${p.product_id}`}</div>
                    <div class="product-category">${p.category || p.subcategory || 'General'}</div>
                    <div class="product-price">$${price.toFixed(2)}</div>
                    <div class="product-rating">⭐ ${avgRating.toFixed(1)} (${ratingCount} reviews)</div>
                    ${score ? `<div class="ai-score">🤖 Match: ${score.toFixed(1)}%</div>` : ''}
                    <button class="add-to-cart" onclick="event.stopPropagation(); addToCart({product_id:${p.product_id}, product_name:'${(p.product_name || 'Product').replace(/'/g, "\\'")}', price:${price}})">Add to Cart</button>
                </div>
            </div>
        `;
    }).join('');
}

function getIcon(category) {
    const icons = { 
        Electronics:'📱', Clothes:'👕', Books:'📚', Sports:'⚽', 
        'Home Appliances':'🏠', Perfumes:'🌸', Toys:'🧸' 
    };
    return icons[category] || '🎁';
}

function viewProduct(id) {
    const product = [...allProducts, ...aiRecommendations].find(p => p.product_id === id);
    if (product) {
        showToast(`${product.product_name}\n$${product.price}\nCategory: ${product.category}`);
    }
}

function setFilter(filter) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    showProducts(filter);
}

// ========== Authentication ==========
async function login(email, password) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.innerText = '';
    
    try {
        const response = await fetch('http://localhost:5001/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Assuming the API returns user data and possibly a token
            currentUser = {
                id: data.user.id,
                name: data.user.name || data.user.email,
                email: data.user.email,
                token: data.token // if token is provided
            };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            document.getElementById('loginView').style.display = 'none';
            document.getElementById('appView').style.display = 'block';
            document.getElementById('userName').innerText = currentUser.name;
            await loadAllProducts();
            await showProducts('for-you');
            showToast(`Welcome, ${currentUser.name}! 🎉`);
        } else {
            errorDiv.innerText = data.message || 'Invalid email or password';
        }
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.innerText = 'Network error. Please try again.';
    }
}


function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    document.getElementById('appView').style.display = 'none';
    document.getElementById('loginView').style.display = 'block';
    cart = [];
    updateCartCount();
    showToast('Logged out successfully');
}

async function openProfile() {
    const modal = document.getElementById('profileModal');
    const infoDiv = document.getElementById('profileInfo');
    infoDiv.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    modal.style.display = 'flex';
    
    try {
        const statsResponse = await fetch(`${API_BASE}/stats`);
        const stats = await statsResponse.json();
        
        infoDiv.innerHTML = `
            <p class="profile_info"><strong>User ID:</strong> ${currentUser.id}</p>
            <p class="profile_info"><strong>Name:</strong> ${currentUser.name}</p>
            <p class="profile_info"><strong>Email:</strong> ${currentUser.email}</p>
            <p class="profile_info"><strong>Cart Items:</strong> ${cart.reduce((s,i) => s + i.quantity, 0)}</p>
        `;
    } catch(e) {
        infoDiv.innerHTML = `
            <p class="profile_info"><strong>User ID:</strong> ${currentUser.id}</p>
            <p class="profile_info"><strong>Name:</strong> ${currentUser.name}</p>
            <p class="profile_info"><strong>Email:</strong> ${currentUser.email}</p>
            <p class="profile_info"><strong>Cart Items:</strong> ${cart.reduce((s,i) => s + i.quantity, 0)}</p>
        `;
    }
}

function closeProfile() { 
    document.getElementById('profileModal').style.display = 'none'; 
}

function checkSession() {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
        currentUser = JSON.parse(saved);
        document.getElementById('loginView').style.display = 'none';
        document.getElementById('appView').style.display = 'block';
        document.getElementById('userName').innerText = currentUser.name;
        loadAllProducts().then(() => showProducts('for-you'));
    }
}

// Demo user click
const demoDiv = document.getElementById('demoUserDiv');
if (demoDiv) {
    demoDiv.onclick = () => {
        document.getElementById('loginEmail').value = 'user1@wolfe-bryant.info';
        document.getElementById('loginPassword').value = 'pass123';
    };
}

// Event listeners
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    login(email, password);
});

// Initialize
checkSession();
updateCartCount();
