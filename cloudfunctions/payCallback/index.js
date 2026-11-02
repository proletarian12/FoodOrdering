// 云函数：payCallback —— 微信支付结果回调（云开发 CloudPay）
// 需在云开发控制台「微信支付」中配置此云函数为支付回调函数
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  console.log('[payCallback] event:', JSON.stringify(event))
  const { returnCode, resultCode, outTradeNo, transactionId } = event

  // 支付成功
  if (returnCode === 'SUCCESS' && resultCode === 'SUCCESS' && outTradeNo) {
    try {
      await db.collection('orders').where({ orderNo: outTradeNo }).update({
        data: {
          status: 'paid',
          payInfo: {
            transactionId: transactionId || '',
            paidAt: db.serverDate()
          },
          updatedAt: db.serverDate()
        }
      })
    } catch (e) {
      console.error('[payCallback] 更新订单失败', e)
    }
  }
  // 回调必须返回 errcode 0，否则微信会重试
  return { errcode: 0, errmsg: 'ok' }
}
