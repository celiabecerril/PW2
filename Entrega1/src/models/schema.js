const typeDefs = `#graphql
  type Product {
    id: ID!
    name: String!
    description: String
    price: Float!
    stock: Int!
    image: String
    category: String
  }

  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
  }

  type CartItem {
    product: Product
    quantity: Int
  }

  type OrderItem {
    productName: String
    quantity: Int
    price: Float
  }

  type Order {
    id: ID!
    userId: ID
    userName: String
    items: [OrderItem]
    total: Float
    status: String
    createdAt: String
  }

  input OrderItemInput {
    productId: ID!
    quantity: Int!
  }

  input CreateOrderInput {
    items: [OrderItemInput]
  }

  input UpdateUserInput {
    role: String
  }

  type Query {
    products: [Product]
    product(id: ID!): Product
    users: [User]
    myCart: [CartItem]
    myOrders: [Order]
    orders: [Order]
  }

  type Mutation {
    addToCart(productId: ID!, quantity: Int!): CartItem
    removeFromCart(productId: ID!): CartItem
    createOrder(input: CreateOrderInput): Order
    updateOrderStatus(id: ID!, status: String!): Order
    deleteProduct(id: ID!): String
    deleteUser(id: ID!): String
    updateUser(id: ID!, input: UpdateUserInput): User
  }
`;

module.exports = typeDefs;