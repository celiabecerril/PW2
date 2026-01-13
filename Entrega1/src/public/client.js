
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

if (!token || !user) {
    window.location.href = 'login.html';
}


document.getElementById('userName').textContent = user.name;
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
});


if (user.role === 'admin') {
    document.getElementById('addProductBtn').style.display = 'block';
    
   
    const chatBtn = document.querySelector('.btn-chat');
    chatBtn.href = 'admin-chats.html';
    chatBtn.textContent = '💬 Panel de Chats';
}


let products = [];
const modal = document.getElementById('productModal');
const productForm = document.getElementById('productForm');
const addProductBtn = document.getElementById('addProductBtn');
const closeModal = document.querySelector('.close');
const cancelBtn = document.getElementById('cancelBtn');
const imageInput = document.getElementById('productImage');
const previewImg = document.getElementById('previewImg');


if (imageInput) {
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('La imagen no puede superar los 5MB');
                imageInput.value = '';
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
}


async function loadProducts(forceReload = false) {
    try {
        
        const timestamp = forceReload ? `?t=${Date.now()}` : '';
        
        const response = await fetch(`/api/products${timestamp}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache'
            }
        });

        if (response.ok) {
            products = await response.json();
            displayProducts();
        } else if (response.status === 401 || response.status === 403) {
            localStorage.clear();
            window.location.href = 'login.html';
        } else {
            throw new Error('Error al cargar productos');
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('productsGrid').innerHTML = 
            '<div class="error-message">Error al cargar los servicios. Intenta de nuevo.</div>';
    }
}

function displayProducts() {
    const grid = document.getElementById('productsGrid');
    
    if (products.length === 0) {
        grid.innerHTML = '<div class="loading">No hay servicios disponibles</div>';
        return;
    }

    grid.innerHTML = products.map(product => `
        <div class="product-card">
            <div class="product-image">
                <img src="${escapeHtml(product.image)}" 
                     alt="${escapeHtml(product.name)}" 
                     onerror="this.src='https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800'">
            </div>
            
            <div class="product-content">
                <div class="product-header">
                    <div>
                        <h3>${escapeHtml(product.name)}</h3>
                        <span class="product-category">${escapeHtml(product.category)}</span>
                    </div>
                </div>
                
                <p>${escapeHtml(product.description)}</p>
                
                <div class="product-info">
                    <div class="product-price">${product.price}€</div>
                    <div class="product-duration">⏱️ ${escapeHtml(product.duration)}</div>
                </div>
                
                ${user.role === 'admin' ? `
                    <div class="product-actions">
                        <button class="btn btn-primary" onclick="editProduct('${product._id}')">
                            ✏️ Editar
                        </button>
                        <button class="btn btn-danger" onclick="deleteProduct('${product._id}')">
                            🗑️ Eliminar
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


if (addProductBtn) {
    addProductBtn.addEventListener('click', () => {
        document.getElementById('modalTitle').textContent = 'Agregar Servicio';
        productForm.reset();
        document.getElementById('productId').value = '';
        previewImg.src = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800';
        modal.style.display = 'block';
    });
}


if (closeModal) {
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });
}

if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
}

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});


async function editProduct(id) {
    if (user.role !== 'admin') {
        alert('No tienes permisos para editar productos');
        return;
    }

    const product = products.find(p => p._id === id);
    if (!product) return;

    document.getElementById('modalTitle').textContent = 'Editar Servicio';
    document.getElementById('productId').value = product._id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productDescription').value = product.description;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productDuration').value = product.duration;
    document.getElementById('productCategory').value = product.category;
    previewImg.src = product.image;
    
    modal.style.display = 'block';
}


async function deleteProduct(id) {
    if (user.role !== 'admin') {
        alert('No tienes permisos para eliminar productos');
        return;
    }

    if (!confirm('¿Estás seguro de que deseas eliminar este servicio?')) {
        return;
    }

    try {
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) submitBtn.disabled = true;

        const response = await fetch(`/api/products/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            await loadProducts();
            showNotification('Servicio eliminado exitosamente', 'success');
        } else {
            const data = await response.json();
            showNotification(data.message || 'Error al eliminar el servicio', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al eliminar el servicio', 'error');
    } finally {
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) submitBtn.disabled = false;
    }
}


if (productForm) {
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (user.role !== 'admin') {
            alert('No tienes permisos para gestionar productos');
            return;
        }

        const productId = document.getElementById('productId').value;
        const submitBtn = document.getElementById('submitBtn');
        const uploadProgress = document.getElementById('uploadProgress');
        
       
        const formData = new FormData();
        formData.append('name', document.getElementById('productName').value);
        formData.append('description', document.getElementById('productDescription').value);
        formData.append('price', document.getElementById('productPrice').value);
        formData.append('duration', document.getElementById('productDuration').value);
        formData.append('category', document.getElementById('productCategory').value);
        
        
        const imageFile = imageInput.files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Guardando...';

            const url = productId ? `/api/products/${productId}` : '/api/products';
            const method = productId ? 'PUT' : 'POST';

            
            const progressFill = uploadProgress ? uploadProgress.querySelector('.progress-fill') : null;
            if (imageFile && uploadProgress) {
                uploadProgress.style.display = 'block';
                if (progressFill) progressFill.style.width = '0%';
            }

            let response;

            if (imageFile) {
                
                response = await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open(method, url);
                    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

                    xhr.upload.onprogress = (e) => {
                        if (e.lengthComputable && progressFill) {
                            const percent = Math.round((e.loaded / e.total) * 100);
                            progressFill.style.width = percent + '%';
                        }
                    };

                    xhr.onload = () => {
                        const status = xhr.status;
                        const text = xhr.responseText || '';
                        let json = null;
                        try { json = JSON.parse(text); } catch (err) { json = null; }
                        resolve({ ok: status >= 200 && status < 300, status, json: async () => json });
                    };

                    xhr.onerror = () => reject(new Error('Network error'));
                    xhr.send(formData);
                });
            } else {
                
                response = await fetch(url, {
                    method,
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });
            }

            if (response.ok) {
                modal.style.display = 'none';
                await loadProducts(true);
                showNotification(
                    productId ? 'Servicio actualizado exitosamente' : 'Servicio creado exitosamente',
                    'success'
                );
            } else {
                const data = response.json ? await response.json() : null;
                showNotification((data && data.message) ? data.message : 'Error al guardar el servicio', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error al guardar el servicio', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Guardar';
            if (uploadProgress) {
               
                const progressFill = uploadProgress.querySelector('.progress-fill');
                if (progressFill) progressFill.style.width = '100%';
                setTimeout(() => { uploadProgress.style.display = 'none'; if (progressFill) progressFill.style.width = '0%'; }, 400);
            }
        }
    });
}


function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `${type}-message`;
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '10000';
    notification.style.minWidth = '300px';
    notification.style.animation = 'slideIn 0.3s ease';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}


const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);


loadProducts();