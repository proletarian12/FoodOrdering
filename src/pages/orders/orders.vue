<template>
  <view class="page">
    <scroll-view scroll-x class="tabs">
      <view
        v-for="t in tabs"
        :key="t.key"
        class="tab"
        :class="{ active: current === t.key }"
        @click="switchTab(t.key)"
      >
        {{ t.text }}
      </view>
    </scroll-view>

    <view v-for="o in orders" :key="o._id" class="order-item" @click="goDetail(o._id)">
      <view class="order-head">
        <text class="order-type">{{ o.orderType === 'dineIn' ? '堂食' : '打包' }}</text>
        <text v-if="o.tableNo">桌台 {{ o.tableNo }}</text>
        <text class="order-status" :class="'st-' + o.status">{{ statusText(o.status) }}</text>
      </view>
      <view class="order-body">
        <text class="order-name">{{ summaryText(o) }}</text>
        <text class="order-amount">¥{{ amountText(o.totalAmount) }}</text>
      </view>
      <view class="order-foot">
        <text class="order-time">{{ timeText(o.createdAt) }}</text>
        <view v-if="o.status === 'pending_payment'" class="cancel-btn" @click.stop="cancel(o)">取消</view>
      </view>
    </view>
    <view v-if="orders.length === 0" class="empty">暂无订单</view>
  </view>
</template>

<script>
import { callCloud } from '../../utils/request'
import { FN, ORDER_STATUS_TEXT } from '../../utils/const'
import { fen2yuan, formatTime } from '../../utils/format'

export default {
  data() {
    return {
      tabs: [
        { key: '', text: '全部' },
        { key: 'pending_payment', text: '待支付' },
        { key: 'paid', text: '待接单' },
        { key: 'accepted', text: '制作中' },
        { key: 'ready', text: '待取餐' },
        { key: 'completed', text: '已完成' }
      ],
      current: '',
      orders: []
    }
  },
  onShow() {
    this.load()
  },
  methods: {
    statusText(s) {
      return ORDER_STATUS_TEXT[s] || s
    },
    amountText(f) {
      return fen2yuan(f)
    },
    timeText(t) {
      return formatTime(t)
    },
    summaryText(o) {
      const names = (o.items || []).map((i) => i.name)
      return names.join('、')
    },
    switchTab(key) {
      this.current = key
      this.load()
    },
    async load() {
      try {
        const data = { action: 'myOrders' }
        if (this.current) data.status = this.current
        this.orders = (await callCloud(FN.ORDER, data)) || []
      } catch (e) {
        this.orders = []
      }
    },
    goDetail(id) {
      uni.navigateTo({ url: '/pages/order-detail/order-detail?id=' + id })
    },
    cancel(o) {
      uni.showModal({
        title: '提示',
        content: '确定取消该订单？',
        success: async (r) => {
          if (r.confirm) {
            try {
              await callCloud(FN.ORDER, { action: 'cancel', orderId: o._id })
              uni.showToast({ title: '已取消', icon: 'none' })
              this.load()
            } catch (e) {
              uni.showToast({ title: e.message || '取消失败', icon: 'none' })
            }
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding-bottom: 20rpx;
}
.tabs {
  white-space: nowrap;
  background: #fff;
  padding: 20rpx;
  position: sticky;
  top: 0;
  z-index: 10;
}
.tab {
  display: inline-block;
  padding: 12rpx 30rpx;
  font-size: 26rpx;
  color: #666;
  border-radius: 30rpx;
}
.tab.active {
  background: #ff6b35;
  color: #fff;
}
.order-item {
  background: #fff;
  margin: 20rpx;
  border-radius: 16rpx;
  padding: 24rpx;
}
.order-head {
  display: flex;
  align-items: center;
  font-size: 26rpx;
  color: #666;
}
.order-type {
  font-weight: bold;
  color: #333;
  margin-right: 20rpx;
}
.order-status {
  margin-left: auto;
}
.st-pending_payment { color: #ff9800; }
.st-paid { color: #ff6b35; }
.st-accepted { color: #2196f3; }
.st-ready { color: #4caf50; }
.st-completed { color: #999; }
.st-cancelled { color: #ccc; }
.st-refunded { color: #ccc; }
.order-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16rpx;
}
.order-name {
  flex: 1;
  font-size: 28rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.order-amount {
  font-size: 30rpx;
  font-weight: bold;
  color: #ff6b35;
}
.order-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16rpx;
}
.order-time {
  font-size: 24rpx;
  color: #999;
}
.cancel-btn {
  font-size: 26rpx;
  color: #666;
  border: 1rpx solid #ddd;
  border-radius: 30rpx;
  padding: 8rpx 30rpx;
}
.empty {
  text-align: center;
  color: #999;
  padding: 100rpx 0;
  font-size: 28rpx;
}
</style>
