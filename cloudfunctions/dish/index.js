// 云函数：dish —— 分类/菜品 读（用户）与 写（商家）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event
  try {
    switch (action) {
      // 用户端读
      case 'listCategories':
        return await listCategories()
      case 'listDishes':
        return await listDishes(event.categoryId, event.includeOffShelf)
      case 'getDish':
        return await getDish(event.dishId)
      case 'getShopInfo':
        return await getShopInfo()
      case 'getTable':
        return await getTable(event.tableId)
      // 商家端写（需校验角色）
      case 'saveCategory':
        return await guard(OPENID, () => saveCategory(event))
      case 'deleteCategory':
        return await guard(OPENID, () => deleteCategory(event.categoryId))
      case 'saveDish':
        return await guard(OPENID, () => saveDish(event))
      case 'deleteDish':
        return await guard(OPENID, () => deleteDish(event.dishId))
      case 'toggleDish':
        return await guard(OPENID, () => toggleDish(event.dishId, event.isOnSale))
      default:
        return { code: 400, message: '未知操作' }
    }
  } catch (e) {
    console.error('[dish]', action, e)
    return { code: 500, message: e.message || '服务错误' }
  }
}

// 商家身份校验包装
async function guard(openid, fn) {
  const ok = await isMerchant(openid)
  if (!ok) return { code: 403, message: '无权限' }
  return fn()
}

async function isMerchant(openid) {
  const res = await db.collection('users').where({ openid }).get()
  return res.data.length > 0 && res.data[0].role === 'merchant'
}

async function listCategories() {
  const res = await db.collection('categories').orderBy('sort', 'asc').get()
  return { code: 0, data: res.data }
}

async function listDishes(categoryId, includeOffShelf) {
  const col = db.collection('dishes')
  let query = col
  if (categoryId) query = col.where({ categoryId })
  const res = await query.orderBy('sort', 'asc').get()
  let list = res.data
  if (!includeOffShelf) list = list.filter((d) => d.isOnSale !== false)
  return { code: 0, data: list }
}

async function getDish(dishId) {
  if (!dishId) return { code: 400, message: '缺少 dishId' }
  const res = await db.collection('dishes').doc(dishId).get()
  if (!res.data) return { code: 404, message: '菜品不存在' }
  return { code: 0, data: res.data }
}

// 店铺公开信息（用户端）
async function getShopInfo() {
  const res = await db.collection('settings').get()
  const s = res.data[0] || {}
  return {
    code: 0,
    data: {
      shopName: s.shopName || '点餐',
      logo: s.logo || '',
      phone: s.phone || '',
      isOpen: s.isOpen !== false,
      businessHours: s.businessHours || null,
      notice: s.notice || ''
    }
  }
}

// 桌台信息（扫码进入时校验）
async function getTable(tableId) {
  if (!tableId) return { code: 400, message: '缺少 tableId' }
  const res = await db.collection('tables').doc(tableId).get()
  if (!res.data) return { code: 404, message: '桌台不存在' }
  return { code: 0, data: res.data }
}

async function saveCategory(event) {
  const col = db.collection('categories')
  const data = {
    name: event.name || '',
    sort: Number(event.sort) || 0,
    isOn: event.isOn !== false
  }
  if (!data.name) return { code: 400, message: '分类名不能为空' }
  if (event._id) {
    await col.doc(event._id).update({ data })
    return { code: 0, data: { _id: event._id } }
  } else {
    const add = await col.add({ data })
    return { code: 0, data: { _id: add._id } }
  }
}

async function deleteCategory(categoryId) {
  if (!categoryId) return { code: 400, message: '缺少 categoryId' }
  await db.collection('categories').doc(categoryId).remove()
  return { code: 0, data: true }
}

async function saveDish(event) {
  const col = db.collection('dishes')
  const data = {
    categoryId: event.categoryId || '',
    name: event.name || '',
    image: event.image || '',
    description: event.description || '',
    isOnSale: event.isOnSale !== false,
    sort: Number(event.sort) || 0,
    specs: event.specs || [],
    skus: event.skus || [],
    updatedAt: db.serverDate()
  }
  if (!data.name) return { code: 400, message: '菜品名不能为空' }
  if (event._id) {
    await col.doc(event._id).update({ data })
    return { code: 0, data: { _id: event._id } }
  } else {
    data.createdAt = db.serverDate()
    data.sales = 0
    const add = await col.add({ data })
    return { code: 0, data: { _id: add._id } }
  }
}

async function deleteDish(dishId) {
  if (!dishId) return { code: 400, message: '缺少 dishId' }
  await db.collection('dishes').doc(dishId).remove()
  return { code: 0, data: true }
}

async function toggleDish(dishId, isOnSale) {
  if (!dishId) return { code: 400, message: '缺少 dishId' }
  await db.collection('dishes').doc(dishId).update({ data: { isOnSale: !!isOnSale } })
  return { code: 0, data: true }
}
