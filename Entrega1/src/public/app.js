const API_URL = '/api';
const GRAPHQL_URL = '/graphql';

const app = {
    state: {
        token: localStorage.getItem('token'),
        user: JSON.parse(localStorage.getItem('user')),
        cart: [],
        socket: null,
        chatId: null,
        currentAdminChatId: null
    },

    init() {
        if (this.state.token) {
            this.showMain();
            this.updateCartCount();
        } else {
            this.showAuth();
        }
    },

    // ==========================================
    // AUTHENTICATION
    // ==========================================
    async login(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            
            if (res.ok) {
                this.setSession(result);
            } else {
                alert(result.message);
            }
        } catch (err) {
            console.error(err);
            alert('Error de conexión');
        }
    },

    async register(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            
            if (res.ok) {
                this.setSession(result);
            } else {
                alert(result.message);
            }
        } catch (err) {
            console.error(err);
        }
    },

    setSession(data) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        this.state.token = data.token;
        this.state.user = data.user;
        this.showMain();
        this.updateCartCount();
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.state.token = null;
        this.state.user = null;
        this.showAuth();
    },

    // ==========================================
    // GRAPHQL CLIENT
    // ==========================================
    async graphql(query, variables = {}) {
        const res = await fetch(GRAPHQL_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.state.token}`
            },
            body: JSON.stringify({ query, variables })
        });
        const json = await res.json();
        if (json.errors) {
            throw new Error(json.errors[0].message);
        }
        return json.data;
    },

    // ==========================================
    // VIEWS & RENDERING
    // ==========================================
    async renderProducts() {
        document.getElementById('page-title').innerText = 'Nuestros Servicios y Productos';
        const container = document.getElementById('content-area');
        container.innerHTML = '<p>Cargando...</p>';
        container.className = ''; // Limpiamos clase para manejar estructura interna

        const query = `
            query {
                products {
                    id name description price stock image category
                }
            }
        `;

        try {
            const data = await this.graphql(query);
            const isAdmin = this.state.user && this.state.user.role === 'admin';
            
            let html = '';
            
            // Botón de añadir para admin
            if (isAdmin) {
                html += `
                    <div style="width:100%; margin-bottom: 20px; text-align: right;">
                        <button class="btn-primary" onclick="app.openProductModal()">+ Nuevo Producto</button>
                    </div>
                `;
            }

            html += '<div class="grid-container">';
            html += data.products.map(p => `
                <div class="product-card">
                    <img src="${p.image || 'https://via.placeholder.com/300'}" class="product-img" alt="${p.name}">
                    <div class="product-info">
                        <span class="stock-badge">${p.category}</span>
                        <h3>${p.name}</h3>
                        <p>${p.description}</p>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1rem;">
                            <span class="product-price">${p.price}€</span>
                            ${isAdmin ? `
                                <div>
                                    <button class="btn-primary" style="padding: 5px 10px; font-size: 0.8rem;" onclick='app.openProductModal(${JSON.stringify(p).replace(/'/g, "&#39;")})'>Editar</button>
                                    <button class="btn-danger" onclick="app.deleteProduct('${p.id}')">Eliminar</button>
                                </div>` :
                                `<button class="btn-primary" onclick="app.addToCart('${p.id}')" ${p.stock === 0 ? 'disabled' : ''}>
                                    ${p.stock > 0 ? 'Añadir al Carrito' : 'Agotado'}
                                </button>`
                            }
                        </div>
                        <small>Stock: ${p.stock}</small>
                    </div>
                </div>
            `).join('');
            html += '</div>';
            
            container.innerHTML = html;
        } catch (err) {
            container.innerHTML = `<p class="error">Error: ${err.message}</p>`;
        }
    },

    async renderCart() {
        document.getElementById('page-title').innerText = 'Tu Carrito de Compra';
        const container = document.getElementById('content-area');
        container.className = 'table-container';
        
        const query = `
            query {
                myCart {
                    product { id name price }
                    quantity
                }
            }
        `;

        try {
            const data = await this.graphql(query);
            this.state.cart = data.myCart || [];
            
            if (this.state.cart.length === 0) {
                container.innerHTML = '<p>El carrito está vacío.</p>';
                return;
            }

            let total = 0;
            const rows = this.state.cart.map(item => {
                const subtotal = item.product.price * item.quantity;
                total += subtotal;
                return `
                    <tr>
                        <td>${item.product.name}</td>
                        <td>${item.product.price}€</td>
                        <td>${item.quantity}</td>
                        <td>${subtotal}€</td>
                        <td><button class="btn-danger" onclick="app.removeFromCart('${item.product.id}')">X</button></td>
                    </tr>
                `;
            }).join('');

            container.innerHTML = `
                <table>
                    <thead><tr><th>Producto</th><th>Precio</th><th>Cant.</th><th>Subtotal</th><th>Acción</th></tr></thead>
                    <tbody>
                        ${rows}
                        <tr>
                            <td colspan="3" class="total-row">Total:</td>
                            <td class="total-row">${total}€</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
                <div style="margin-top: 2rem; text-align: right;">
                    <button class="btn-primary" onclick="app.checkout()">Finalizar Compra</button>
                </div>
            `;
        } catch (err) {
            console.error(err);
        }
    },

    async renderOrders() {
        document.getElementById('page-title').innerText = 'Historial de Pedidos';
        const container = document.getElementById('content-area');
        container.className = 'table-container';

        const query = `
            query {
                myOrders {
                    id total status createdAt
                    items { productName quantity }
                }
            }
        `;

        try {
            const data = await this.graphql(query);
            if (!data.myOrders.length) {
                container.innerHTML = '<p>No has realizado pedidos aún.</p>';
                return;
            }

            container.innerHTML = data.myOrders.map(order => `
                <div style="border:1px solid #ddd; padding:1rem; margin-bottom:1rem; border-radius:5px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                        <strong>Pedido #${order.id.slice(-6)}</strong>
                        <span class="status-${order.status}">${order.status.toUpperCase()}</span>
                    </div>
                    <p>Fecha: ${new Date(order.createdAt).toLocaleDateString()}</p>
                    <ul>
                        ${order.items.map(i => `<li>${i.quantity}x ${i.productName}</li>`).join('')}
                    </ul>
                    <p style="text-align:right; font-weight:bold;">Total: ${order.total}€</p>
                </div>
            `).join('');
        } catch (err) {
            console.error(err);
        }
    },

    // ==========================================
    // ACTIONS
    // ==========================================
    openProductModal(product = null) {
        const form = document.getElementById('product-form');
        const title = document.getElementById('modal-title');
        
        if (product) {
            title.innerText = 'Editar Producto';
            form.id.value = product.id;
            form.name.value = product.name;
            form.price.value = product.price;
            form.stock.value = product.stock;
            form.description.value = product.description || '';
            form.category.value = product.category || '';
        } else {
            title.innerText = 'Nuevo Producto / Servicio';
            form.reset();
            form.id.value = '';
        }
        document.getElementById('product-modal').classList.remove('hidden');
    },

    closeProductModal() {
        document.getElementById('product-modal').classList.add('hidden');
    },

    async saveProduct(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const id = formData.get('id');
        
        const url = id ? `${API_URL}/products/${id}` : `${API_URL}/products`;
        const method = id ? 'PUT' : 'POST';
        
        // Usamos la API REST para crear productos (soporta multipart/form-data para imágenes)
        try {
            const res = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${this.state.token}`
                },
                body: formData
            });
            
            if (res.ok) {
                alert(id ? 'Producto actualizado' : 'Producto creado exitosamente');
                this.closeProductModal();
                e.target.reset();
                this.renderProducts();
            } else {
                const err = await res.json();
                alert('Error: ' + err.message);
            }
        } catch (error) {
            console.error(error);
            alert('Error al guardar producto');
        }
    },

    async deleteProduct(id) {
        if (!confirm('¿Estás seguro de eliminar este producto?')) return;
        
        // Usamos GraphQL para eliminar
        const mutation = `mutation { deleteProduct(id: "${id}") }`;
        try {
            await this.graphql(mutation);
            this.renderProducts();
        } catch (err) {
            alert('Error al eliminar: ' + err.message);
        }
    },

    async addToCart(productId) {
        const mutation = `mutation { addToCart(productId: "${productId}", quantity: 1) { quantity } }`;
        try {
            await this.graphql(mutation);
            this.updateCartCount();
            alert('Producto añadido');
        } catch (err) {
            alert(err.message);
        }
    },

    async removeFromCart(productId) {
        const mutation = `mutation { removeFromCart(productId: "${productId}") { quantity } }`;
        await this.graphql(mutation);
        this.renderCart();
        this.updateCartCount();
    },

    async checkout() {
        if (!confirm('¿Confirmar compra?')) return;
        
        // Construir input para createOrder basado en el carrito actual
        const itemsInput = this.state.cart.map(item => `{ productId: "${item.product.id}", quantity: ${item.quantity} }`).join(',');
        const mutation = `mutation { createOrder(input: { items: [${itemsInput}] }) { id } }`;

        try {
            await this.graphql(mutation);
            alert('¡Compra realizada con éxito!');
            this.renderOrders();
            this.updateCartCount();
        } catch (err) {
            alert('Error al comprar: ' + err.message);
        }
    },

    async updateCartCount() {
        const data = await this.graphql(`query { myCart { quantity } }`);
        const count = data.myCart ? data.myCart.reduce((acc, item) => acc + item.quantity, 0) : 0;
        document.getElementById('cart-badge').innerText = count;
    },

    // Helpers UI
    toggleAuth(type) {
        document.getElementById('login-form').classList.toggle('hidden', type !== 'login');
        document.getElementById('register-form').classList.toggle('hidden', type !== 'register');
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');
    },

    showMain() {
        document.getElementById('auth-view').classList.add('hidden');
        document.getElementById('navbar').classList.remove('hidden');
        document.getElementById('main-view').classList.remove('hidden');
        
        // Mostrar enlaces de admin si corresponde
        if (this.state.user && this.state.user.role === 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
        }

        this.renderProducts();
        this.initChat();
    },

    showAuth() {
        document.getElementById('auth-view').classList.remove('hidden');
        document.getElementById('navbar').classList.add('hidden');
        document.getElementById('main-view').classList.add('hidden');
        document.getElementById('chat-widget').classList.add('hidden');
    },

    // ==========================================
    // ADMIN PANEL
    // ==========================================
    async renderAdminUsers() {
        document.getElementById('page-title').innerText = 'Gestión de Usuarios';
        const container = document.getElementById('content-area');
        container.className = 'table-container';

        const query = `query { users { id name email role } }`;
        try {
            const data = await this.graphql(query);
            container.innerHTML = `
                <table>
                    <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Acciones</th></tr></thead>
                    <tbody>
                        ${data.users.map(u => `
                            <tr>
                                <td>${u.name}</td>
                                <td>${u.email}</td>
                                <td><span class="role-badge role-${u.role}">${u.role}</span></td>
                                <td class="admin-actions">
                                    <button class="btn-primary" onclick="app.toggleRole('${u.id}', '${u.role}')">Cambiar Rol</button>
                                    <button class="btn-danger" onclick="app.deleteUser('${u.id}')">Eliminar</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>`;
        } catch (err) { alert(err.message); }
    },

    async renderAdminOrders(filterStatus = 'all') {
        document.getElementById('page-title').innerText = 'Gestión Global de Pedidos';
        const container = document.getElementById('content-area');
        container.className = 'table-container';

        // Se añade 'items' a la query para ver los detalles
        const query = `query { orders { id userName total status createdAt items { productName quantity } } }`;
        try {
            const data = await this.graphql(query);
            let orders = data.orders;
            
            // Lógica de filtrado en cliente
            if (filterStatus !== 'all') {
                orders = orders.filter(o => o.status === filterStatus);
            }

            container.innerHTML = `
                <div style="margin-bottom: 1rem; text-align: right;">
                    <label>Filtrar por estado: </label>
                    <select onchange="app.renderAdminOrders(this.value)" style="padding: 5px; border-radius: 4px;">
                        <option value="all" ${filterStatus === 'all' ? 'selected' : ''}>Todos</option>
                        <option value="pending" ${filterStatus === 'pending' ? 'selected' : ''}>En curso (Pending)</option>
                        <option value="completed" ${filterStatus === 'completed' ? 'selected' : ''}>Completado (Completed)</option>
                    </select>
                </div>
                <table>
                    <thead><tr><th>ID</th><th>Usuario</th><th>Total</th><th>Estado</th><th>Fecha</th><th>Detalles</th><th>Acción</th></tr></thead>
                    <tbody>
                        ${orders.map(o => {
                            // Preparamos el string de detalles para el alert, escapando comillas simples
                            const details = o.items.map(i => `• ${i.quantity}x ${i.productName}`).join('\\n').replace(/'/g, "\\'");
                            return `
                            <tr>
                                <td>${o.id.slice(-6)}</td>
                                <td>${o.userName}</td>
                                <td>${o.total}€</td>
                                <td class="status-${o.status}">${o.status}</td>
                                <td>${new Date(o.createdAt).toLocaleDateString()}</td>
                                <td>
                                    <button class="btn-primary" style="font-size: 0.8rem; padding: 2px 8px;" onclick="alert('Productos del pedido:\\n\\n${details}')">Ver Productos</button>
                                </td>
                                <td>
                                    ${o.status === 'pending' ? 
                                        `<button class="btn-primary" onclick="app.updateOrderStatus('${o.id}', 'completed')">Completar</button>` : 
                                        '-'}
                                </td>
                            </tr>
                        `}).join('')}
                    </tbody>
                </table>`;
        } catch (err) { alert(err.message); }
    },

    async toggleRole(id, currentRole) {
        const newRole = currentRole === 'user' ? 'admin' : 'user';
        if(!confirm(`¿Cambiar rol a ${newRole}?`)) return;
        const mutation = `mutation { updateUser(id: "${id}", input: { role: "${newRole}" }) { id } }`;
        await this.graphql(mutation);
        this.renderAdminUsers();
    },

    async deleteUser(id) {
        if(!confirm('¿Eliminar usuario permanentemente?')) return;
        const mutation = `mutation { deleteUser(id: "${id}") }`;
        await this.graphql(mutation);
        this.renderAdminUsers();
    },

    async updateOrderStatus(id, status) {
        const mutation = `mutation { updateOrderStatus(id: "${id}", status: "${status}") { id } }`;
        await this.graphql(mutation);
        this.renderAdminOrders();
    },

    async renderAdminChats() {
        document.getElementById('page-title').innerText = 'Soporte - Chats Activos';
        const container = document.getElementById('content-area');
        container.className = '';
        
        container.innerHTML = `
            <div style="display: flex; height: 600px; border: 1px solid #ddd; border-radius: 5px; overflow: hidden;">
                <div id="admin-chat-list" style="width: 300px; border-right: 1px solid #ddd; overflow-y: auto; background: #f8f9fa;">
                    <div style="padding: 1rem; text-align: center; color: #666;">Cargando chats...</div>
                </div>
                <div style="flex: 1; display: flex; flex-direction: column; background: #fff;">
                    <div id="admin-chat-header" style="padding: 1rem; border-bottom: 1px solid #ddd; font-weight: bold; background: #f1f1f1;">Selecciona un chat</div>
                    <div id="admin-chat-messages" style="flex: 1; padding: 1rem; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem;">
                        <div style="text-align: center; color: #999; margin-top: 2rem;">No hay chat seleccionado</div>
                    </div>
                    <form id="admin-chat-form" onsubmit="app.sendAdminChat(event)" style="padding: 1rem; border-top: 1px solid #ddd; display: none;">
                        <div style="display: flex; gap: 0.5rem;">
                            <input type="text" name="message" placeholder="Escribe un mensaje..." style="flex: 1; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" autocomplete="off">
                            <button type="submit" class="btn-primary">Enviar</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        if (this.state.socket) this.state.socket.emit('get_chats');
    },

    // ==========================================
    // CHAT SYSTEM
    // ==========================================
    initChat() {
        if (this.state.socket) return;
        
        // Solo mostrar widget flotante si es usuario normal
        if (this.state.user.role === 'user') {
            document.getElementById('chat-widget').classList.remove('hidden');
        }
        
        this.state.socket = io({ auth: { token: this.state.token } });
        
        this.state.socket.on('chat_ready', (data) => {
            this.state.chatId = data.chatId;
            this.addMessage('Sistema', 'Chat conectado. ¿En qué podemos ayudarte?', 'received');
        });

        this.state.socket.on('receive_message', (data) => {
            // Lógica para Widget de Usuario Normal
            if (this.state.user.role === 'user') {
                const type = data.senderId === this.state.user.id ? 'sent' : 'received';
                this.addMessage(data.senderName, data.message, type);
            }
            
            // Lógica para Panel de Admin
            if (this.state.user.role === 'admin') {
                // Si el mensaje pertenece al chat que el admin está viendo ahora mismo
                if (this.state.currentAdminChatId === data.chatId) {
                    this.appendAdminMessage(data);
                }
                // Refrescar la lista de chats para mostrar el último mensaje
                if (document.getElementById('admin-chat-list')) {
                    this.state.socket.emit('get_chats');
                }
            }
        });

        // Notificaciones globales para Admin (cuando llega un mensaje de usuario)
        if (this.state.user.role === 'admin') {
            this.state.socket.on('admin_chat_list', (chats) => {
                const list = document.getElementById('admin-chat-list');
                if (!list) return;
                
                list.innerHTML = chats.map(c => `
                    <div id="chat-item-${c.id}" class="chat-list-item" onclick="app.loadAdminChat('${c.id}')" 
                         style="padding: 1rem; border-bottom: 1px solid #eee; cursor: pointer; ${this.state.currentAdminChatId === c.id ? 'background: #e9ecef;' : ''}">
                        <div style="font-weight: bold; display: flex; justify-content: space-between;">
                            <span>${c.userName}</span>
                            <span style="font-size: 0.8rem; color: #666;">${new Date(c.updatedAt).toLocaleDateString()}</span>
                        </div>
                        <div style="font-size: 0.9rem; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${c.lastMessage || '...'}
                        </div>
                    </div>
                `).join('');
            });

            this.state.socket.on('chat_history', (messages) => {
                const container = document.getElementById('admin-chat-messages');
                if (!container) return;
                container.innerHTML = '';
                messages.forEach(m => this.appendAdminMessage(m));
                const header = document.getElementById('admin-chat-header');
                if (header) header.innerText = 'Chat activo';
            });

            this.state.socket.on('new_user_message', (data) => {
                // Si estamos en la vista de chats, refrescar la lista
                if (document.getElementById('admin-chat-list')) {
                    this.state.socket.emit('get_chats');
                } else {
                    // Opcional: Podrías poner un indicador visual en el menú
                    const link = document.querySelector('a[onclick="app.renderAdminChats()"]');
                    if (link) link.style.fontWeight = 'bold';
                }
            });
        }
    },

    loadAdminChat(chatId) {
        this.state.currentAdminChatId = chatId;
        document.getElementById('admin-chat-form').style.display = 'block';
        document.getElementById('admin-chat-messages').innerHTML = '<div style="text-align:center; padding:1rem;">Cargando historial...</div>';
        
        document.querySelectorAll('.chat-list-item').forEach(el => el.style.background = 'transparent');
        const activeItem = document.getElementById(`chat-item-${chatId}`);
        if (activeItem) activeItem.style.background = '#e9ecef';

        this.state.socket.emit('get_messages', { chatId });
    },

    sendAdminChat(e) {
        e.preventDefault();
        const input = e.target.message;
        const message = input.value.trim();
        if (!message || !this.state.currentAdminChatId) return;

        this.state.socket.emit('send_message', { chatId: this.state.currentAdminChatId, message });
        input.value = '';
    },

    appendAdminMessage(data) {
        const container = document.getElementById('admin-chat-messages');
        if (!container) return;
        
        if (container.innerText.includes('Cargando') || container.innerText.includes('No hay chat')) container.innerHTML = '';

        const isMe = data.senderId === this.state.user.id;
        const div = document.createElement('div');
        div.style.cssText = `align-self: ${isMe ? 'flex-end' : 'flex-start'}; max-width: 70%; padding: 0.5rem 1rem; border-radius: 1rem; background: ${isMe ? '#007bff' : '#f1f0f0'}; color: ${isMe ? '#fff' : '#333'}; margin-bottom: 0.5rem;`;
        div.innerHTML = `<div style="font-size: 0.75rem; opacity: 0.8; margin-bottom: 2px;">${data.senderName}</div><div>${data.message}</div>`;
        
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    },

    toggleChatWindow() {
        document.getElementById('chat-body').classList.toggle('hidden');
    },

    sendChat(e) {
        e.preventDefault();
        const input = e.target.message;
        if (!input.value.trim() || !this.state.chatId) return;
        
        this.state.socket.emit('send_message', { chatId: this.state.chatId, message: input.value });
        input.value = '';
    },

    addMessage(sender, text, type) {
        const div = document.createElement('div');
        div.className = `message msg-${type}`;
        div.innerHTML = `<strong>${sender}:</strong> ${text}`;
        const container = document.getElementById('chat-messages');
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }
};

window.onload = () => app.init();