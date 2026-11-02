// 云函数：user —— 登录 / 资料 / 商家绑定
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event
  try {
    switch (action) {
      case 'login':
        return await login(OPENID)
      case 'updateProfile':
        return await updateProfile(OPENID, event.nickname, event.avatar)
      case 'bindPhone':
        return await bindPhone(OPENID, event.phone)
      case 'bindMerchant':
        return await bindMerchant(OPENID, event.key)
      default:
        return { code: 400, message: '未知操作' }
    }
  } catch (e) {
    console.error('[user]', action, e)
    return { code: 500, message: e.message || '服务错误' }
  }
}

// 登录：无用户则创建，返回用户信息（含角色）
async function login(openid) {
  const users = db.collection('users')
  const res = await users.where({ openid }).get()
  let user
  if (res.data.length === 0) {
    const doc = {
      openid,
      nickname: '',
      avatar: '',
      phone: '',
      role: 'user',
      createdAt: db.serverDate(),
      lastLoginAt: db.serverDate()
    }
    const addRes = await users.add({ data: doc })
    user = Object.assign({ _id: addRes._id }, doc)
  } else {
    user = res.data[0]
    await users.doc(user._id).update({ data: { lastLoginAt: db.serverDate() } })
    user.lastLoginAt = db.serverDate()
  }
  return { code: 0, data: user }
}

async function updateProfile(openid, nickname, avatar) {
  const users = db.collection('users')
  const res = await users.where({ openid }).get()
  if (res.data.length === 0) return { code: 404, message: '用户不存在' }
  const data = {}
  if (nickname !== undefined) data.nickname = nickname
  if (avatar !== undefined) data.avatar = avatar
  await users.doc(res.data[0]._id).update({ data })
  return { code: 0, data: Object.assign({}, res.data[0], data) }
}

async function bindPhone(openid, phone) {
  if (!phone) return { code: 400, message: '手机号为空' }
  const users = db.collection('users')
  const res = await users.where({ openid }).get()
  if (res.data.length === 0) return { code: 404, message: '用户不存在' }
  await users.doc(res.data[0]._id).update({ data: { phone } })
  return { code: 0, data: Object.assign({}, res.data[0], { phone }) }
}

// 用管理码绑定商家身份（管理码存在云函数环境变量中）
async function bindMerchant(openid, key) {
  const correctKey = process.env.MERCHANT_KEY
  if (!correctKey || !key || key !== correctKey) {
    return { code: 403, message: '管理码错误' }
  }
  const users = db.collection('users')
  const res = await users.where({ openid }).get()
  if (res.data.length === 0) return { code: 404, message: '用户不存在' }
  await users.doc(res.data[0]._id).update({ data: { role: 'merchant' } })
  return { code: 0, data: { role: 'merchant' } }
}
