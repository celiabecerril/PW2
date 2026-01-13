const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');

const resolvers = {
    Query: {
        products: async () => {
            const products = await Product.find();
            return products.map(p => ({ ...p.toObject(), id: p._id.toString() }));
        },
        product: async (_, { id }) => {
            const p = await Product.findById(id);
            return p ? { ...p.toObject(), id: p._id.toString() } : null;
        },
        users: async (_, __, context) => {
            if (!context.user || context.user.role !== 'admin') throw new Error('No autorizado');
            const users = await User.find();
            return users.map(u => ({ ...u.toObject(), id: u._id.toString() }));
        },
        myCart: async (_, __, context) => {
            if (!context.user) throw new Error('No autenticado');
            const user = await User.findById(context.user.id).populate('cart.product');
            if (!user.cart) return [];
            
            // Filtramos productos que hayan podido ser eliminados y mapeamos IDs
            return user.cart
                .filter(item => item.product) 
                .map(item => ({
                    quantity: item.quantity,
                    product: { ...item.product.toObject(), id: item.product._id.toString() }
                }));
        },
        myOrders: async (_, __, context) => {
            if (!context.user) throw new Error('No autenticado');
            const orders = await Order.find({ user: context.user.id }).sort({ createdAt: -1 });
            return orders.map(o => ({
                ...o.toObject(),
                id: o._id.toString(),
                createdAt: o.createdAt.toISOString()
            }));
        },
        orders: async (_, __, context) => {
            if (!context.user || context.user.role !== 'admin') throw new Error('No autorizado');
            const orders = await Order.find().populate('user').sort({ createdAt: -1 });
            return orders.map(o => ({
                ...o.toObject(),
                id: o._id.toString(),
                userName: o.user ? o.user.name : 'Usuario eliminado',
                userId: o.user ? o.user._id.toString() : null,
                createdAt: o.createdAt.toISOString()
            }));
        }
    },
    Mutation: {
        addToCart: async (_, { productId, quantity }, context) => {
            if (!context.user) throw new Error('No autenticado');
            const user = await User.findById(context.user.id);
            const product = await Product.findById(productId);
            
            if (!product) throw new Error('Producto no encontrado');
            if (product.stock < quantity) throw new Error('Stock insuficiente');

            if (!user.cart) user.cart = [];

            const cartItemIndex = user.cart.findIndex(item => item.product.toString() === productId);
            
            if (cartItemIndex > -1) {
                user.cart[cartItemIndex].quantity += quantity;
            } else {
                user.cart.push({ product: productId, quantity });
            }
            
            await user.save();
            
            // Retornamos estructura compatible con CartItem
            const updatedItem = cartItemIndex > -1 ? user.cart[cartItemIndex] : user.cart[user.cart.length - 1];
            return {
                product: product, // Mongoose document is enough here usually, or map it
                quantity: updatedItem.quantity
            };
        },
        removeFromCart: async (_, { productId }, context) => {
            if (!context.user) throw new Error('No autenticado');
            const user = await User.findById(context.user.id);
            user.cart = user.cart.filter(item => item.product.toString() !== productId);
            await user.save();
            return { quantity: 0 };
        },
        createOrder: async (_, { input }, context) => {
            if (!context.user) throw new Error('No autenticado');
            const user = await User.findById(context.user.id).populate('cart.product');
            
            if (!user.cart || user.cart.length === 0) throw new Error('El carrito está vacío');

            let total = 0;
            const orderItems = [];

            // Validar stock y calcular total usando el carrito del servidor (más seguro)
            for (const item of user.cart) {
                if (!item.product) continue;
                if (item.product.stock < item.quantity) {
                    throw new Error(`Stock insuficiente para ${item.product.name}`);
                }
                
                total += item.product.price * item.quantity;
                orderItems.push({
                    product: item.product._id,
                    productName: item.product.name,
                    price: item.product.price,
                    quantity: item.quantity
                });

                // Actualizar stock
                item.product.stock -= item.quantity;
                await item.product.save();
            }

            const order = new Order({
                user: context.user.id,
                items: orderItems,
                total,
                status: 'pending'
            });

            await order.save();

            // Vaciar carrito
            user.cart = [];
            await user.save();

            return { ...order.toObject(), id: order._id.toString() };
        },
        updateOrderStatus: async (_, { id, status }, context) => {
            if (!context.user || context.user.role !== 'admin') throw new Error('No autorizado');
            const order = await Order.findByIdAndUpdate(id, { status }, { new: true });
            return { ...order.toObject(), id: order._id.toString() };
        },
        deleteProduct: async (_, { id }, context) => {
            if (!context.user || context.user.role !== 'admin') throw new Error('No autorizado');
            await Product.findByIdAndDelete(id);
            return "Producto eliminado";
        },
        deleteUser: async (_, { id }, context) => {
            if (!context.user || context.user.role !== 'admin') throw new Error('No autorizado');
            await User.findByIdAndDelete(id);
            return "Usuario eliminado";
        },
        updateUser: async (_, { id, input }, context) => {
            if (!context.user || context.user.role !== 'admin') throw new Error('No autorizado');
            const user = await User.findByIdAndUpdate(id, input, { new: true });
            return { ...user.toObject(), id: user._id.toString() };
        }
    }
};

module.exports = resolvers;