// 云函数：order —— 下单 / 支付 / 取消 / 查询
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 支付回调云函数名（与部署的 payCallback 云函数一致）
const PAY_CALLBACK_FN = 'payCallback'

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event
  try {
    switch (action) {
      case 'create':
        return await create(OPENID, event)
      case 'cancel':
        return await cancel(OPENID, event.orderId)
      case 'myOrders':
        return await myOrders(OPENID, event.status)
      case 'orderDetail':
        return await orderDetail(OPENID, event.orderId)
      default:
        return { code: 400, message: '未知操作' }
    }
  } catch (e) {
    console.error('[order]', action, e)
    return { code: 500, message: e.message || '服务错误' }
  }
}

// ---------- 下单 ----------
async function create(openid, event) {
  const { orderType, tableId, items, remark } = event
  if (!items || items.length === 0) return { code: 400, message: '购物车为空' }
  if (orderType !== 'dineIn' && orderType !== 'takeout') {
    return { code: 400, message: '订单类型错误' }
  }

  // 1. 营业状态校验
  const settingRes = await db.collection('settings').get()
  const setting = settingRes.data[0] || {}
  if (setting.isOpen === false) return { code: 403, message: '店铺已打烊，暂不接单' }

  // 2. 逐项校验菜品并计算金额（服务端算价，不信任前端）
  const dishCol = db.collection('dishes')
  let goodsAmount = 0
  const orderItems = []
  for (const item of items) {
    const qty = Number(item.qty) || 0
    if (qty <= 0) continue
    const dishRes = await dishCol.doc(item.dishId).get()
    const dish = dishRes.data
    if (!dish || dish.isOnSale === false) return { code: 400, message: '有菜品已下架' }
    const sku = matchSku(dish, item.attrs)
    if (!sku) return { code: 400, message: '菜品规格不存在' }
    if (sku.isOn === false) return { code: 400, message: '有规格已停售' }
    if (sku.stock !== undefined && sku.stock !== -1 && sku.stock < qty) {
      return { code: 400, message: '库存不足' }
    }
    const price = Number(sku.price) || 0
    goodsAmount += price * qty
    orderItems.push({
      dishId: dish._id,
      name: dish.name,
      image: dish.image || '',
      attrs: item.attrs || {},
      attrsText: attrsToText(item.attrs),
      price,
      qty
    })
  }
  if (orderItems.length === 0) return { code: 400, message: '购物车为空' }
  if (goodsAmount <= 0) return { code: 400, message: '金额异常' }

  // 3. 桌台信息（堂食）；打包无桌台、无地址、无配送费
  let tableNo = ''
  if (orderType === 'dineIn' && tableId) {
    const tableRes = await db.collection('tables').doc(tableId).get()
    if (tableRes.data) tableNo = tableRes.data.no || ''
  }

  const totalAmount = goodsAmount
  const orderNo = genOrderNo()

  // 4. 落库（待支付）
  const orderDoc = {
    orderNo,
    userId: openid,
    orderType,
    tableId: tableId || '',
    tableNo,
    remark: remark || '',
    items: orderItems,
    goodsAmount,
    deliveryFee: 0,
    totalAmount,
    status: 'pending_payment',
    payInfo: {},
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  }
  const addRes = await db.collection('orders').add({ data: orderDoc })
  const orderId = addRes._id

  // 5. 微信支付统一下单
  let payment = null
  try {
    const payRes = await cloud.cloudPay.unifiedOrder({
      body: '点餐-' + orderNo,
      outTradeNo: orderNo,
      spbillCreateIp: '127.0.0.1',
      totalFee: totalAmount, // 单位：分
      functionName: PAY_CALLBACK_FN,
      openid,
      tradeType: 'JSAPI'
    })
    if (payRes.returnCode === 'SUCCESS' && payRes.payment) {
      payment = payRes.payment
    } else {
      console.error('[order] 统一下单失败', payRes)
    }
  } catch (payErr) {
    console.error('[order] 统一下单异常', payErr)
  }

  return { code: 0, data: { orderId, orderNo, totalAmount, payment } }
}

// ---------- 取消 ----------
async function cancel(openid, orderId) {
  if (!orderId) return { code: 400, message: '缺少 orderId' }
  const res = await db.collection('orders').doc(orderId).get()
  const order = res.data
  if (!order) return { code: 404, message: '订单不存在' }
  if (order.userId !== openid) return { code: 403, message: '无权操作' }

  if (order.status === 'pending_payment') {
    await db.collection('orders').doc(orderId).update({
      data: { status: 'cancelled', updatedAt: db.serverDate() }
    })
    return { code: 0, data: true }
  }

  // 已支付未接单：退款
  if (order.status === 'paid') {
    try {
      const refundRes = await cloud.cloudPay.refund({
        outTradeNo: order.orderNo,
        outRefundNo: order.orderNo + '_R',
        totalFee: order.totalAmount,
        refundFee: order.totalAmount,
        functionName: PAY_CALLBACK_FN
      })
      await db.collection('orders').doc(orderId).update({
        data: {
          status: 'refunded',
          'refund.status': 'processing',
          'refund.refundNo': refundRes.refundId || order.orderNo + '_R',
          updatedAt: db.serverDate()
        }
      })
      return { code: 0, data: { refunding: true } }
    } catch (e) {
      console.error('[order] 退款失败', e)
      return { code: 500, message: '退款发起失败，请联系商家' }
    }
  }

  return { code: 400, message: '当前状态不可取消' }
}

// ---------- 我的订单 ----------
async function myOrders(openid, status) {
  const col = db.collection('orders')
  let query = col.where({ userId: openid })
  if (status) query = col.where({ userId: openid, status })
  const res = await query.orderBy('createdAt', 'desc').limit(50).get()
  return { code: 0, data: res.data }
}

async function orderDetail(openid, orderId) {
  if (!orderId) return { code: 400, message: '缺少 orderId' }
  const res = await db.collection('orders').doc(orderId).get()
  const order = res.data
  if (!order) return { code: 404, message: '订单不存在' }
  if (order.userId !== openid) {
    // 商家可查看任意订单
    const users = await db.collection('users').where({ openid }).get()
    const isM = users.data.length > 0 && users.data[0].role === 'merchant'
    if (!isM) return { code: 403, message: '无权查看' }
  }
  return { code: 0, data: order }
}

// ---------- 工具 ----------
function matchSku(dish, attrs) {
  if (!dish.skus || dish.skus.length === 0) return null
  if (!attrs || Object.keys(attrs).length === 0) return dish.skus[0]
  return dish.skus.find((sku) => {
    return Object.keys(attrs).every((k) => sku.attrs && sku.attrs[k] === attrs[k])
  })
}

function attrsToText(attrs) {
  if (!attrs) return ''
  return Object.values(attrs).join('/')
}

function genOrderNo() {
  const d = new Date()
  const pad = (n) => (n < 10 ? '0' + n : '' + n)
  const ts =
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return ts + rand
}
