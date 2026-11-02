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

    <view v-for="o in orders" :key="o._id" class="order-item">
      <view class="order-head">
        <text class="order-no">{{ o.orderNo }}</text>
        <text class="order-type">{{ o.orderType === 'dineIn' ? '堂食' : '打包' }}</text>
        <text class="order-table" v-if="o.tableNo">桌 {{ o.tableNo }}</text>
      </view>
      <view class="order-items">
        <view v-for="(it, idx) in o.items" :key="idx" class="item">
          <text class="item-name">{{ it.name }}</text>
          <text class="item-spec" v-if="it.attrsText">{{ it.attrsText }}</text>
          <text class="item-qty">x{{ it.qty }}</text>
        </view>
      </view>
      <view class="order-remark" v-if="o.remark">备注：{{ o.remark }}</view>
      <view class="order-foot">
        <text class="order-amount">¥{{ fen(o.totalAmount) }}</text>
        <view class="order-btns">
          <view v-if="o.status === 'paid'" class="btn reject" @click="reject(o)">拒单</view>
          <view v-if="o.status === 'paid'" class="btn accept" @click="accept(o)">接单</view>
          <view v-if="o.status === 'accepted'" class="btn accept" @click="finish(o)">出餐</view>
          <view v-if="o.status === 'ready'" class="btn accept" @click="finish(o)">完成</view>
        </view>
      </view>
    </view>
    <view v-if="orders.length === 0" class="empty">暂无订单</view>
  </view>
</template>

<script>
import { callCloud } from '../../../utils/request'
import { FN } from '../../../utils/const'
import { fen2yuan } from '../../../utils/format'

export default {
  data() {
    return {
      tabs: [
        { key: 'paid', text: '待接单' },
        { key: 'accepted', text: '制作中' },
        { key: 'ready', text: '待取餐' },
        { key: 'completed', text: '已完成' },
        { key: '', text: '全部' }
      ],
      current: 'paid',
      orders: [],
      timer: null
    }
  },
  onShow() {
    this.load()
    this.startPolling()
  },
  onHide() {
    this.stopPolling()
  },
  onUnload() {
    this.stopPolling()
  },
  methods: {
    fen(f) {
      return fen2yuan(f)
    },
    startPolling() {
      this.stopPolling()
      this.timer = setInterval(() => this.load(true), 5000)
    },
    stopPolling() {
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    },
    switchTab(key) {
      this.current = key
      this.load()
    },
    async load(silent) {
      try {
        const data = { action: 'listOrders' }
        if (this.current) data.status = this.current
        this.orders = (await callCloud(FN.MERCHANT, data)) || []
      } catch (e) {
        if (!silent) uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    async accept(o) {
      try {
        await callCloud(FN.MERCHANT, { action: 'acceptOrder', orderId: o._id })
        uni.showToast({ title: '已接单', icon: 'none' })
        this.load()
      } catch (e) {
        uni.showToast({ title: e.message || '操作失败', icon: 'none' })
      }
    },
    reject(o) {
      uni.showModal({
        title: '拒单',
        content: '拒单后订单将自动退款，确定？',
        success: async (r) => {
          if (r.confirm) {
            try {
              await callCloud(FN.MERCHANT, { action: 'rejectOrder', orderId: o._id, reason: '商家拒单' })
              uni.showToast({ title: '已拒单', icon: 'none' })
              this.load()
            } catch (e) {
              uni.showToast({ title: e.message || '操作失败', icon: 'none' })
            }
          }
        }
      })
    },
    async finish(o) {
      try {
        await callCloud(FN.MERCHANT, { action: 'finishOrder', orderId: o._id })
        uni.showToast({ title: '已更新', icon: 'none' })
        this.load()
      } catch (e) {
        uni.showToast({ title: e.message || '操作失败', icon: 'none' })
      }
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
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
}
.order-no {
  color: #999;
}
.order-type {
  color: #ff6b35;
  margin-left: 20rpx;
  font-weight: bold;
}
.order-table {
  margin-left: 20rpx;
  color: #333;
}
.order-addr {
  font-size: 26rpx;
  color: #666;
  margin-top: 10rpx;
}
.order-items {
  margin-top: 16rpx;
}
.item {
  display: flex;
  align-items: center;
  padding: 6rpx 0;
  font-size: 28rpx;
}
.item-name {
  flex: 1;
}
.item-spec {
  color: #999;
  font-size: 24rpx;
  margin: 0 16rpx;
}
.item-qty {
  color: #666;
}
.order-remark {
  font-size: 24rpx;
  color: #999;
  margin-top: 10rpx;
}
.order-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16rpx;
}
.order-amount {
  font-size: 34rpx;
  font-weight: bold;
  color: #ff6b35;
}
.order-btns {
  display: flex;
}
.btn {
  font-size: 26rpx;
  padding: 10rpx 30rpx;
  border-radius: 30rpx;
  margin-left: 16rpx;
}
.btn.accept {
  background: #ff6b35;
  color: #fff;
}
.btn.reject {
  background: #f5f5f5;
  color: #666;
}
.empty {
  text-align: center;
  color: #999;
  padding: 100rpx 0;
}
</style>
