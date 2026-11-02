// 金额工具：数据库以「分」为单位存储整数

// 分 -> 元（字符串，保留两位小数）
export function fen2yuan(fen) {
  return ((Number(fen) || 0) / 100).toFixed(2)
}

// 元 -> 分（整数）
export function yuan2fen(yuan) {
  return Math.round((Number(yuan) || 0) * 100)
}

// 分 -> 展示价格，如 ¥12.00
export function formatPrice(fen) {
  return '¥' + fen2yuan(fen)
}

// 时间戳/日期格式化
export function formatTime(input) {
  if (!input) return ''
  const d = new Date(input)
  const pad = (n) => (n < 10 ? '0' + n : '' + n)
  return (
    d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
  )
}
