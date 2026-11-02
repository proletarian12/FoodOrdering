// 云函数：init —— 一次性初始化数据库集合与默认数据
// 部署后手动调用一次：cloud.callFunction({ name: 'init' })
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const result = { created: [], skipped: [] }

  // 1. 创建集合
  const collections = ['users', 'categories', 'dishes', 'tables', 'orders', 'settings', 'banners']
  for (const name of collections) {
    try {
      await db.createCollection(name)
      result.created.push(name)
    } catch (e) {
      result.skipped.push(name) // 已存在
    }
  }

  // 2. 初始化分类
  const catCount = await db.collection('categories').count()
  if (catCount.total === 0) {
    const cats = ['招牌推荐', '主食', '饮品', '小吃']
    for (let i = 0; i < cats.length; i++) {
      await db.collection('categories').add({
        data: { name: cats[i], sort: i, isOn: true }
      })
    }
    result.categories = '已初始化 4 个默认分类'
  }

  // 3. 初始化店铺设置（含一次性商家管理码）
  const setCount = await db.collection('settings').count()
  if (setCount.total === 0) {
    await db.collection('settings').add({
      data: {
        shopName: '我的餐厅',
        logo: '',
        phone: '',
        isOpen: true,
        businessHours: { start: '08:00', end: '22:00' },
        notice: '欢迎光临'
      }
    })
    result.settings = '已初始化店铺设置' 
  }

  return { code: 0, data: result }
}
