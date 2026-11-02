// 云函数：merchant —— 商家管理（订单 / 桌台 / 设置 / 统计 / 打印）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

// 计入门店的订单状态（已支付及其后）
const VALID_STATUS = ['paid', 'accepted', 'ready', 'completed']

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event
  try {
    if (!(await isMerchant(OPENID))) {
      return { code: 403, message: '无商家权限' }
    }
    switch (action) {
      case 'listOrders':
        return await listOrders(event)
      case 'acceptOrder':
        return await acceptOrder(event.orderId)
      case 'rejectOrder':
        return await rejectOrder(event.orderId, event.reason)
      case 'finishOrder':
        return await finishOrder(event.orderId)
      case 'saveTable':
        return await saveTable(event)
      case 'deleteTable':
        return await deleteTable(event.tableId)
      case 'genTableQR':
        return await genTableQR(event.tableId)
      case 'listTables':
        return await listTables()
      case 'saveSettings':
        return await saveSettings(event.data)
      case 'getSettings':
        return await getSettings()
      case 'stats':
        return await stats(event)
      case 'printOrder':
        return await printOrder(event.orderId)
      default:
        return { code: 400, message: '未知操作' }
    }
  } catch (e) {
    console.error('[merchant]', action, e)
    return { code: 500, message: e.message || '服务错误' }
  }
}

async function isMerchant(openid) {
  const res = await db.collection('users').where({ openid }).get()
  return res.data.length > 0 && res.data[0].role === 'merchant'
}

// ---------- 订单管理 ----------
async function listOrders(event) {
  const col = db.collection('orders')
  const where = {}
  if (event.status) where.status = event.status
  if (event.orderType) where.orderType = event.orderType
  let query = Object.keys(where).length ? col.where(where) : col
  const res = await query.orderBy('createdAt', 'desc').limit(100).get()
  return { code: 0, data: res.data }
}

async function acceptOrder(orderId) {
  const order = await getOrder(orderId)
  if (!order) return { code: 404, message: '订单不存在' }
  if (order.status !== 'paid') return { code: 400, message: '当前状态不可接单' }
  await db.collection('orders').doc(orderId).update({
    data: { status: 'accepted', updatedAt: db.serverDate() }
  })
  return { code: 0, data: true }
}

async function rejectOrder(orderId, reason) {
  const order = await getOrder(orderId)
  if (!order) return { code: 404, message: '订单不存在' }
  if (order.status !== 'paid') return { code: 400, message: '当前状态不可拒单' }
  // 发起退款
  try {
    await cloud.cloudPay.refund({
      outTradeNo: order.orderNo,
      outRefundNo: order.orderNo + '_R',
      totalFee: order.totalAmount,
      refundFee: order.totalAmount,
      functionName: 'payCallback'
    })
  } catch (e) {
    console.error('[merchant] 拒单退款失败', e)
  }
  await db.collection('orders').doc(orderId).update({
    data: {
      status: 'refunded',
      cancelReason: reason || '商家拒单',
      updatedAt: db.serverDate()
    }
  })
  return { code: 0, data: true }
}

// 状态推进：accepted -> ready -> completed（堂食与打包一致）
async function finishOrder(orderId) {
  const order = await getOrder(orderId)
  if (!order) return { code: 404, message: '订单不存在' }
  let next = null
  if (order.status === 'accepted') next = 'ready'
  else if (order.status === 'ready') next = 'completed'
  if (!next) return { code: 400, message: '当前状态不可操作' }
  await db.collection('orders').doc(orderId).update({
    data: { status: next, updatedAt: db.serverDate() }
  })
  return { code: 0, data: { status: next } }
}

async function getOrder(orderId) {
  if (!orderId) return null
  const res = await db.collection('orders').doc(orderId).get()
  return res.data || null
}

// ---------- 桌台管理 ----------
async function listTables() {
  const res = await db.collection('tables').orderBy('no', 'asc').get()
  return { code: 0, data: res.data }
}

async function saveTable(event) {
  const col = db.collection('tables')
  const data = {
    no: event.no || '',
    capacity: Number(event.capacity) || 0,
    isOn: event.isOn !== false,
    status: 'free'
  }
  if (!data.no) return { code: 400, message: '桌号不能为空' }
  if (event._id) {
    await col.doc(event._id).update({ data })
    return { code: 0, data: { _id: event._id } }
  } else {
    // 自定义短 _id，用于小程序码 scene（scene 长度限制 32）
    data._id = genTableId()
    data.qrCode = ''
    await col.add({ data })
    return { code: 0, data: { _id: data._id } }
  }
}

async function deleteTable(tableId) {
  if (!tableId) return { code: 400, message: '缺少 tableId' }
  await db.collection('tables').doc(tableId).remove()
  return { code: 0, data: true }
}

// 生成桌台小程序码并上传云存储
async function genTableQR(tableId) {
  if (!tableId) return { code: 400, message: '缺少 tableId' }
  const table = await db.collection('tables').doc(tableId).get()
  if (!table.data) return { code: 404, message: '桌台不存在' }
  try {
    const qrRes = await cloud.openapi.wxacode.getUnlimited({
      scene: tableId, // scene 直接传桌台 id（短 id）
      page: 'pages/index/index',
      width: 430,
      checkPath: false
    })
    if (qrRes && qrRes.buffer) {
      const upload = await cloud.uploadFile({
        cloudPath: 'table-qr/' + tableId + '.png',
        fileContent: qrRes.buffer
      })
      await db.collection('tables').doc(tableId).update({
        data: { qrCode: upload.fileID }
      })
      return { code: 0, data: { fileID: upload.fileID } }
    }
    return { code: 500, message: '小程序码生成失败' }
  } catch (e) {
    console.error('[merchant] 生成桌台码失败', e)
    return { code: 500, message: '生成失败：' + (e.errMsg || e.message) }
  }
}

// ---------- 营业设置 ----------
async function getSettings() {
  const res = await db.collection('settings').get()
  return { code: 0, data: res.data[0] || {} }
}

async function saveSettings(data) {
  const col = db.collection('settings')
  const res = await col.get()
  const clean = {
    shopName: data.shopName || '',
    logo: data.logo || '',
    phone: data.phone || '',
    isOpen: data.isOpen !== false,
    businessHours: data.businessHours || { start: '08:00', end: '22:00' },
    notice: data.notice || '',
    updatedAt: db.serverDate()
  }
  if (res.data.length === 0) {
    const add = await col.add({ data: clean })
    return { code: 0, data: { _id: add._id } }
  } else {
    await col.doc(res.data[0]._id).update({ data: clean })
    return { code: 0, data: { _id: res.data[0]._id } }
  }
}

// ---------- 统计 ----------
async function stats(event) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start.getTime() + 86400000)

  // 今日营收/订单数
  const todayRes = await db.collection('orders').aggregate()
    .match({
      status: _.in(VALID_STATUS),
      createdAt: _.gte(start).and(_.lt(end))
    })
    .group({ _id: null, total: $.sum('$totalAmount'), count: $.sum(1) })
    .end()

  // 累计营收
  const allRes = await db.collection('orders').aggregate()
    .match({ status: _.in(VALID_STATUS) })
    .group({ _id: null, total: $.sum('$totalAmount'), count: $.sum(1) })
    .end()

  // 销量 TOP 10
  const topRes = await db.collection('orders').aggregate()
    .match({ status: _.in(VALID_STATUS) })
    .unwind('$items')
    .group({
      _id: '$items.dishId',
      name: $.first('$items.name'),
      qty: $.sum('$items.qty'),
      amount: $.sum($.multiply(['$items.price', '$items.qty']))
    })
    .sort({ qty: -1 })
    .limit(10)
    .end()

  const today = (todayRes.list && todayRes.list[0]) || { total: 0, count: 0 }
  const all = (allRes.list && allRes.list[0]) || { total: 0, count: 0 }
  return {
    code: 0,
    data: {
      todayTotal: today.total,
      todayCount: today.count,
      allTotal: all.total,
      allCount: all.count,
      top: topRes.list || []
    }
  }
}

// ---------- 打印（预留，需配置云打印机） ----------
async function printOrder(orderId) {
  const order = await getOrder(orderId)
  if (!order) return { code: 404, message: '订单不存在' }
  // TODO: 调用飞鹅/易联云等云打印机 HTTP 接口
  // 示例：await cloud.callFunction / axios.post 到打印机 API
  return { code: 0, data: { printed: true, message: '打印功能待接入云打印机' } }
}

function genTableId() {
  return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
}
