import { reactive } from 'vue'

const CART_KEY = 'CART'
const TABLE_KEY = 'TABLE_INFO'

function loadCart() {
  try {
    return uni.getStorageSync(CART_KEY) || []
  } catch (e) {
    return []
  }
}

function loadTableInfo() {
  try {
    return uni.getStorageSync(TABLE_KEY) || null
  } catch (e) {
    return null
  }
}

// 全局状态
export const store = reactive({
  userInfo: null, // { openid, nickname, avatar, phone, role }
  isMerchant: false,
  tableInfo: loadTableInfo(), // { tableId, tableNo }
  cart: loadCart() // [{ key, dishId, name, image, attrs, attrsKey, attrsText, price, qty }]
})

function saveCart() {
  uni.setStorageSync(CART_KEY, store.cart)
}

// 桌台信息（堂食扫码）
export function saveTableInfo(info) {
  store.tableInfo = info
  uni.setStorageSync(TABLE_KEY, info)
}

export function clearTableInfo() {
  store.tableInfo = null
  uni.removeStorageSync(TABLE_KEY)
}

// 购物车项唯一 key = 菜品 + 规格组合
export function cartItemKey(dishId, attrsKey) {
  return dishId + '_' + attrsKey
}

export function addToCart({ dishId, name, image, attrs, attrsKey, attrsText, price }) {
  const key = cartItemKey(dishId, attrsKey)
  const exist = store.cart.find((i) => i.key === key)
  if (exist) {
    exist.qty++
  } else {
    store.cart.push({ key, dishId, name, image, attrs, attrsKey, attrsText, price, qty: 1 })
  }
  saveCart()
}

export function updateQty(key, qty) {
  const item = store.cart.find((i) => i.key === key)
  if (!item) return
  item.qty = qty
  if (item.qty <= 0) {
    store.cart = store.cart.filter((i) => i.key !== key)
  }
  saveCart()
}

export function removeFromCart(key) {
  store.cart = store.cart.filter((i) => i.key !== key)
  saveCart()
}

export function clearCart() {
  store.cart = []
  saveCart()
}

export function cartCount() {
  return store.cart.reduce((sum, i) => sum + i.qty, 0)
}

export function cartTotal() {
  return store.cart.reduce((sum, i) => sum + i.price * i.qty, 0)
}
