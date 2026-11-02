<template>
  <view class="page">
    <!-- 用餐方式 -->
    <view class="section">
      <view class="type-row">
        <view
          class="type-item"
          :class="{ active: orderType === 'dineIn' }"
          @click="orderType = 'dineIn'"
        >
          堂食
        </view>
        <view
          class="type-item"
          :class="{ active: orderType === 'takeout' }"
          @click="orderType = 'takeout'"
        >
          打包
        </view>
      </view>

      <!-- 堂食桌台 -->
      <view v-if="orderType === 'dineIn'" class="cell">
        <text class="cell-label">桌台</text>
        <text class="cell-value">
          {{ store.tableInfo ? store.tableInfo.tableNo : '未扫码（按取餐号叫餐）' }}
        </text>
      </view>

      <!-- 打包提示 -->
      <view v-if="orderType === 'takeout'" class="cell">
        <text class="cell-label">取餐</text>
        <text class="cell-value">到店自取</text>
      </view>
    </view>

    <!-- 商品清单 -->
    <view class="section">
      <view v-for="item in store.cart" :key="item.key" class="goods-item">
        <text class="goods-name">{{ item.name }}</text>
        <text class="goods-spec" v-if="item.attrsText">{{ item.attrsText }}</text>
        <text class="goods-qty">x{{ item.qty }}</text>
        <text class="goods-price">¥{{ item.priceText }}</text>
      </view>

      <view class="amount-row">
        <text>商品金额</text>
        <text>¥{{ goodsText }}</text>
      </view>
    </view>

    <!-- 备注 -->
    <view class="section">
      <input class="remark" v-model="remark" placeholder="备注（口味、少辣等）" />
    </view>

    <!-- 提交 -->
    <view class="footer">
      <view class="footer-left">
        <text class="footer-label">应付</text>
        <text class="footer-amount">¥{{ totalText }}</text>
      </view>
      <view class="footer-btn" @click="submit">提交订单</view>
    </view>
  </view>
</template>

<script>
import { store, clearCart } from '../../utils/store'
import { callCloud } from '../../utils/request'
import { FN } from '../../utils/const'
import { fen2yuan } from '../../utils/format'

export default {
  data() {
    return {
      orderType: 'dineIn',
      remark: '',
      shopInfo: {}
    }
  },
  computed: {
    store() {
      return store
    },
    goodsTotal() {
      return store.cart.reduce((s, i) => s + i.price * i.qty, 0)
    },
    goodsText() {
      return fen2yuan(this.goodsTotal)
    },
    totalText() {
      return fen2yuan(this.goodsTotal)
    }
  },
  onLoad() {
    // 默认：扫码绑定了桌台则堂食，否则也默认堂食
    store.cart.forEach((i) => {
      i.priceText = fen2yuan(i.price)
    })
    this.loadShop()
  },
  methods: {
    async loadShop() {
      try {
        this.shopInfo = await callCloud(FN.DISH, { action: 'getShopInfo' })
      } catch (e) {}
    },
    async submit() {
      if (store.cart.length === 0) {
        uni.showToast({ title: '未选择菜品', icon: 'none' })
        return
      }
      let tableId = ''
      if (this.orderType === 'dineIn') {
        tableId = store.tableInfo ? store.tableInfo.tableId : ''
      }

      const items = store.cart.map((i) => ({ dishId: i.dishId, attrs: i.attrs, qty: i.qty }))
      uni.showLoading({ title: '提交中', mask: true })
      try {
        const res = await callCloud(FN.ORDER, {
          action: 'create',
          orderType: this.orderType,
          tableId,
          items,
          remark: this.remark
        })
        uni.hideLoading()
        if (res.payment) {
          this.doPay(res)
        } else {
          uni.showModal({
            title: '提示',
            content: '订单已创建，支付初始化失败，请在「我的订单」中查看',
            showCancel: false
          })
          setTimeout(() => this.gotoDetail(res.orderId), 600)
        }
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.message || '下单失败', icon: 'none' })
      }
    },
    doPay(res) {
      const p = res.payment
      uni.requestPayment({
        provider: 'wxpay',
        timeStamp: p.timeStamp,
        nonceStr: p.nonceStr,
        package: p.package,
        signType: p.signType || 'MD5',
        paySign: p.paySign,
        success: () => {
          clearCart()
          this.gotoDetail(res.orderId)
        },
        fail: () => {
          uni.showModal({
            title: '提示',
            content: '支付未完成，订单已保留，可在「我的订单」中查看',
            showCancel: false
          })
          this.gotoDetail(res.orderId)
        }
      })
    },
    gotoDetail(orderId) {
      uni.redirectTo({ url: '/pages/order-detail/order-detail?id=' + orderId })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding-bottom: 140rpx;
}
.section {
  background: #fff;
  margin: 20rpx;
  border-radius: 16rpx;
  padding: 24rpx;
}
.type-row {
  display: flex;
}
.type-item {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  border: 2rpx solid #ddd;
  border-radius: 10rpx;
  margin-right: 20rpx;
  font-size: 28rpx;
}
.type-item.active {
  border-color: #ff6b35;
  color: #ff6b35;
  background: #fff3ee;
}
.cell {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
.cell-label {
  width: 160rpx;
  color: #666;
  font-size: 28rpx;
}
.cell-value {
  flex: 1;
  font-size: 28rpx;
}
.placeholder {
  color: #ccc;
}
.arrow {
  color: #ccc;
  font-size: 36rpx;
}
.goods-item {
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
.amount-row {
  display: flex;
  justify-content: flex-end;
  padding: 16rpx 0;
  font-size: 26rpx;
  color: #666;
}
.amount-row text:first-child {
  margin-right: 30rpx;
}
.remark {
  font-size: 28rpx;
}
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100rpx;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30rpx;
  box-shadow: 0 -4rpx 12rpx rgba(0, 0, 0, 0.05);
}
.footer-label {
  font-size: 26rpx;
  color: #666;
  margin-right: 10rpx;
}
.footer-amount {
  color: #ff6b35;
  font-size: 40rpx;
  font-weight: bold;
}
.footer-btn {
  background: #ff6b35;
  color: #fff;
  padding: 20rpx 60rpx;
  border-radius: 44rpx;
  font-size: 30rpx;
}
</style>
