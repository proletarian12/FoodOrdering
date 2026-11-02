// 微信云开发云函数调用封装
// 云函数统一返回 { code: 0, data, message }
export function callCloud(name, data = {}) {
  return new Promise((resolve, reject) => {
    // 云开发未初始化时给出明确提示
    if (typeof wx === 'undefined' || !wx.cloud) {
      reject({ code: -1, message: '云开发未初始化：请确认已开通云开发并在 App.vue 填写环境 ID' })
      return
    }
    wx.cloud.callFunction({
      name,
      data,
      success: (res) => {
        const result = res.result
        if (result && result.code === 0) {
          resolve(result.data)
        } else {
          reject(result || { code: -1, message: '调用失败' })
        }
      },
      fail: (err) => {
        reject({ code: -1, message: (err && err.errMsg) || '网络错误' })
      }
    })
  })
}
