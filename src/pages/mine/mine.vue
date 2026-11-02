<template>
  <view class="page">
    <!-- 用户信息 -->
    <view class="user-card" @click="login">
      <image class="avatar" :src="store.userInfo && store.userInfo.avatar ? store.userInfo.avatar : ''" mode="aspectFill" />
      <view class="user-info">
        <view class="user-name">
          {{ store.userInfo ? (store.userInfo.nickname || '微信用户') : '点击登录' }}
        </view>
        <view class="user-role" v-if="store.isMerchant">商家账号</view>
      </view>
    </view>

    <!-- 功能列表 -->
    <view class="list">
      <view class="list-item" @click="goOrders">
        <text>我的订单</text>
        <text class="arrow">›</text>
      </view>
      <view v-if="store.isMerchant" class="list-item" @click="goMerchantHome">
        <text class="text-primary">商家管理</text>
        <text class="arrow">›</text>
      </view>
    </view>

    <!-- 隐藏商家入口：连续点击版本号 5 次 -->
    <view class="footer">
      <text class="version" @click="tapVersion">v1.0.0</text>
    </view>
  </view>
</template>

<script>
import { store } from '../../utils/store'
import { callCloud } from '../../utils/request'
import { FN } from '../../utils/const'

export default {
  data() {
    return {
      tapCount: 0
    }
  },
  computed: {
    store() {
      return store
    }
  },
  onShow() {
    if (!store.userInfo) this.login()
  },
  methods: {
    async login() {
      try {
        uni.showLoading({ title: '登录中', mask: true })
        const user = await callCloud(FN.USER, { action: 'login' })
        uni.hideLoading()
        store.userInfo = user
        store.isMerchant = user.role === 'merchant'
        uni.showToast({ title: '登录成功', icon: 'success' })
      } catch (e) {
        uni.hideLoading()
        console.error('[login] 失败：', e)
        uni.showModal({
          title: '登录失败',
          content: (e && e.message) || '未知错误，请查看控制台',
          showCancel: false
        })
      }
    },
    goOrders() {
      uni.switchTab({ url: '/pages/orders/orders' })
    },
    goMerchantHome() {
      uni.navigateTo({ url: '/pages/merchant/home/home' })
    },
    // 隐藏入口：连续点击 5 次进入商家登录
    tapVersion() {
      this.tapCount++
      if (this.tapCount >= 5) {
        this.tapCount = 0
        uni.navigateTo({ url: '/pages/merchant/login/login' })
      }
      setTimeout(() => {
        this.tapCount = 0
      }, 2000)
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
}
.user-card {
  background: #ff6b35;
  color: #fff;
  padding: 50rpx 30rpx;
  display: flex;
  align-items: center;
}
.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}
.user-info {
  margin-left: 24rpx;
}
.user-name {
  font-size: 36rpx;
  font-weight: bold;
}
.user-role {
  font-size: 24rpx;
  opacity: 0.9;
  margin-top: 8rpx;
}
.list {
  background: #fff;
  margin: 20rpx;
  border-radius: 16rpx;
}
.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx 24rpx;
  border-bottom: 1rpx solid #f5f5f5;
  font-size: 30rpx;
}
.arrow {
  color: #ccc;
  font-size: 36rpx;
}
.footer {
  text-align: center;
  margin-top: 80rpx;
}
.version {
  color: #ccc;
  font-size: 24rpx;
  padding: 20rpx;
}
</style>
