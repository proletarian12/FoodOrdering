// 订单状态
export const ORDER_STATUS = {
  PENDING_PAYMENT: 'pending_payment', // 待支付
  PAID: 'paid',                       // 已支付 / 待接单
  ACCEPTED: 'accepted',               // 已接单 / 制作中
  READY: 'ready',                     // 已出餐 / 待取餐
  COMPLETED: 'completed',             // 已完成
  CANCELLED: 'cancelled',             // 已取消
  REFUNDED: 'refunded'                // 已退款
}

export const ORDER_STATUS_TEXT = {
  pending_payment: '待支付',
  paid: '待接单',
  accepted: '制作中',
  ready: '待取餐',
  completed: '已完成',
  cancelled: '已取消',
  refunded: '已退款'
}

// 订单类型
export const ORDER_TYPE = {
  DINE_IN: 'dineIn',
  TAKEOUT: 'takeout'
}

export const ORDER_TYPE_TEXT = {
  dineIn: '堂食',
  takeout: '打包'
}

// 云函数名
export const FN = {
  USER: 'user',
  DISH: 'dish',
  ORDER: 'order',
  MERCHANT: 'merchant'
}
