# Práctica 2 - E-commerce con GraphQL y Gestión de Pedidos

## 1. Introducción

Este proyecto representa la evolución del **Portal de Productos** desarrollado en la Práctica 1 hacia un **E-commerce plenamente funcional**. Partiendo de una base ya existente con autenticación JWT, control de roles y un sistema de chat, se amplía la aplicación incorporando **GraphQL**, un **flujo completo de carrito y pedidos** y un **panel de administración avanzado**.

El objetivo principal es simular el funcionamiento real de una tienda online moderna, combinando distintas tecnologías y patrones habituales en aplicaciones profesionales.

---

## 2. Tecnologías Utilizadas

* **Backend**: Node.js + Express
* **API**:

  * GraphQL mediante Apollo Server
  * API REST existente para autenticación y gestión de productos
* **Base de datos**: MongoDB con Mongoose
* **Tiempo real**: Socket.IO (chat y notificaciones)
* **Frontend**: SPA (Single Page Application) desarrollada en JavaScript Vanilla
* **Autenticación**: JWT (JSON Web Tokens)

---

## 3. Arquitectura General

La aplicación sigue una **arquitectura híbrida REST + GraphQL**, donde ambos enfoques conviven de forma justificada:

* **REST** se utiliza para:

  * Autenticación de usuarios (`/api/auth`)
  * Gestión de productos (`/api/products`), especialmente para facilitar la subida de imágenes con `multipart/form-data` mediante `multer`.

* **GraphQL** se utiliza para:

  * Lectura del catálogo de productos
  * Gestión del carrito de compra
  * Creación y gestión de pedidos
  * Gestión de usuarios desde el panel de administrador

Esta combinación permite aprovechar las ventajas de cada tecnología según el caso de uso.

---

## 4. Esquema GraphQL

El servidor GraphQL define un esquema tipado que describe las entidades principales del sistema y las operaciones disponibles.

### 4.1 Tipos Principales

* **Product**: Representa un producto o servicio disponible en la tienda.
* **User**: Usuario del sistema, con rol `user` o `admin`.
* **CartItem**: Elemento del carrito que relaciona un producto con una cantidad.
* **Order**: Pedido generado a partir del carrito de un usuario.

---

### 4.2 Queries

* `products`: Obtiene el catálogo completo de productos.
* `product(id)`: Obtiene el detalle de un producto concreto.
* `myCart`: Recupera el carrito persistente del usuario autenticado.
* `myOrders`: Devuelve el historial de pedidos del usuario.
* `orders` (**Admin**): Lista todos los pedidos de la plataforma.
* `users` (**Admin**): Lista todos los usuarios registrados.

---

### 4.3 Mutations

* `addToCart`: Añade un producto al carrito del usuario.
* `removeFromCart`: Elimina un producto del carrito.
* `createOrder`: Convierte el carrito en un pedido, valida stock y vacía el carrito.
* `updateOrderStatus` (**Admin**): Cambia el estado de un pedido (`pending`, `completed`).
* `updateUser` (**Admin**): Permite modificar datos de un usuario (rol).
* `deleteUser` (**Admin**): Elimina un usuario del sistema.
* `deleteProduct` (**Admin**): Elimina un producto.

---

## 5. Gestión del Carrito de Compra

El carrito de compra se implementa como un **carrito persistente en base de datos**, almacenado en el modelo `User`.

Características principales:

* El carrito no depende de `LocalStorage`.
* Se mantiene sincronizado entre sesiones y dispositivos.
* Se recupera automáticamente al iniciar sesión.

Este enfoque simula el comportamiento de plataformas de comercio electrónico reales.

---

## 6. Gestión de Pedidos

Cuando el usuario finaliza una compra:

1. Se valida el stock de cada producto.
2. Se crea un documento `Order` en la base de datos.
3. Se almacena un **snapshot del producto** (nombre y precio en el momento de la compra).
4. Se calcula el total del pedido.
5. Se vacía el carrito del usuario.

### Estados del pedido

* `pending`: Pedido en curso.
* `completed`: Pedido completado por el administrador.

Este modelo garantiza la integridad histórica de los pedidos.

---

## 7. Panel de Administración

Los usuarios con rol `admin` disponen de funcionalidades adicionales:

### 7.1 Gestión de Usuarios

* Listar usuarios.
* Cambiar roles (`user` ↔ `admin`).
* Eliminar usuarios.

### 7.2 Gestión de Pedidos

* Visualizar todos los pedidos.
* Filtrar pedidos por estado.
* Ver detalles de cada pedido (usuario y productos).
* Cambiar el estado de los pedidos.

---

## 8. Chat en Tiempo Real

Se ha implementado un sistema de chat mediante **Socket.IO** con autenticación JWT:

* Los usuarios se conectan a un chat privado.
* Los administradores se conectan a una sala global.
* Los mensajes se almacenan en base de datos.
* El sistema permite comunicación directa usuario ↔ administrador.

---

## 9. Instrucciones de Ejecución

1. Instalar dependencias:

```bash
npm install
```

2. Configurar la base de datos MongoDB:

```bash
mongodb://127.0.0.1:27017/productos
```

(o mediante variables de entorno en `.env`).

3. Iniciar el servidor:

```bash
npm start
```

La aplicación estará disponible en:

* [http://localhost:3000](http://localhost:3000)
* GraphQL: [http://localhost:3000/graphql](http://localhost:3000/graphql)

---

## 10. Usuarios de Prueba

* **Administrador**

  * Email: `admin@example.com`
  * Contraseña: `admin123`

* **Usuario**

  * Email: `celia@example.com`
  * Contraseña: `celia123`

---

## 11. Conclusión

Este proyecto cumple con todos los requisitos planteados en el enunciado de la práctica, integrando GraphQL de forma efectiva, manteniendo funcionalidades previas y desarrollando un flujo completo de E-commerce con una arquitectura clara, escalable y justificada.
