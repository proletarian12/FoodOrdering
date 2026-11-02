<template>
  <view class="page" v-if="order._id">
    <view class="status-card">
      <view class="status-text">{{ statusText(order.status) }}</view>
      <view class="status-no">订单号 {{ order.orderNo }}</view>
    </view>

    <view class="section">
      <view class="section-title">取餐信息</view>
      <view v-if="order.orderType === 'dineIn'" class="row">
        <text class="row-label">桌台</text>
        <text class="row-value">{{ order.tableNo || '未扫码' }}</text>
      </view>
      <view v-else class="row">
        <text class="row-label">取餐</text>
        <text class="row-value">到店自取</text>
      </view>
      <view class="row" v-if="order.remark">
        <text class="row-label">备注</text>
        <text class="row-value">{{ order.remark }}</text>
      </view>
    </view>

    <view class="section">
      <view class="section-title">商品清单</view>
      <view v-for="(item, idx) in order.items" :key="idx" class="goods">
        <text class="goods-name">{{ item.name }}</text>
        <text class="goods-spec" v-if="item.attrsText">{{ item.attrsText }}</text>
        <text class="goods-qty">x{{ item.qty }}</text>
        <text class="goods-price">¥{{ fen(item.price) }}</text>
      </view>
      <view class="amount">
        <view class="amount-row">
          <text>商品金额</text>
          <text>¥{{ fen(order.goodsAmount) }}</text>
        </view>
        <view class="amount-row total">
          <text>合计</text>
          <text>¥{{ fen(order.totalAmount) }}</text>
        </view>
      </view>
    </view>

    <view class="footer" v-if="order.status === 'pending_payment' || order.status === 'paid'">
      <view class="footer-btn" @click="cancelOrder">取消订单</view>
    </view>
  </view>
</template>

<script>
import { callCloud } from '../../utils/request'
import { FN, ORDER_STATUS_TEXT } from '../../utils/const'
import { fen2yuan, formatTime } from '../../utils/format'

export default {
  data() {
    return {
      order: {}
    }
  },
  onLoad(options) {
    this.orderId = options.id
    this.load()
  },
  methods: {
    fen(f) {
      return fen2yuan(f)
    },
    statusText(s) {
      return ORDER_STATUS_TEXT[s] || s
    },
    async load() {
      try {
        this.order = await callCloud(FN.ORDER, { action: 'orderDetail', orderId: this.orderId })
      } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    cancelOrder() {
      uni.showModal({
        title: '提示',
        content: this.order.status === 'paid' ? '已支付的订单将自动退款，确定取消？' : '确定取消订单？',
        success: async (r) => {
          if (r.confirm) {
            try {
              await callCloud(FN.ORDER, { action: 'cancel', orderId: this.orderId })
              uni.showToast({ title: '已取消', icon: 'none' })
              this.load()
            } catch (e) {
              uni.showToast({ title: e.message || '操作失败', icon: 'none' })
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
  padding-bottom: 140rpx;
}
.status-card {
  background: #ff6b35;
  color: #fff;
  padding: 50rpx 30rpx;
}
.status-text {
  font-size: 40rpx;
  font-weight: bold;
}
.status-no {
  font-size: 24rpx;
  opacity: 0.9;
  margin-top: 10rpx;
}
.section {
  background: #fff;
  margin: 20rpx;
  border-radius: 16rpx;
  padding: 24rpx;
}
.section-title {
  font-size: 28rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
}
.row {
  display: flex;
  padding: 10rpx 0;
  font-size: 28rpx;
}
.row-label {
  width: 140rpx;
  color: #666;
}
.row-value {
  flex: 1;
}
.goods {
  display: flex;
  align-items: center;
  padding: 12rpx 0;
  font-size: 28rpx;
}
.goods-name {
  flex: 1;
}
.goods-spec {
  color: #999;
  font-size: 24rpx;
  margin: 0 16rpx;
}
.goods-qty {
  color: #666;
  margin-right: 20rpx;
}
.goods-price {
  width: 140rpx;
  text-align: right;
}
.amount {
  border-top: 1rpx solid #f0f0f0;
  margin-top: 16rpx;
  padding-top: 16rpx;
}
.amount-row {
  display: flex;
  justify-content: flex-end;
  padding: 8rpx 0;
  font-size: 26rpx;
  color: #666;
}
.amount-row text:first-child {
  margin-right: 30rpx;
}
.amount-row.total {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 30rpx;
  background: #fff;
}
.footer-btn {
  background: #fff;
  color: #666;
  border: 1rpx solid #ddd;
  text-align: center;
  line-height: 80rpx;
  border-radius: 44rpx;
  font-size: 30rpx;
}
</style>
