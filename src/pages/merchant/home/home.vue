<template>
  <view class="page">
    <view class="banner">
      <view class="banner-title">商家工作台</view>
      <view class="banner-sub">管理菜品、订单、桌台与经营数据</view>
    </view>

    <view class="grid">
      <view class="grid-item" @click="go('/pages/merchant/order-manage/order-manage')">
        <view class="grid-icon">单</view>
        <text class="grid-text">订单管理</text>
      </view>
      <view class="grid-item" @click="go('/pages/merchant/dish-manage/dish-manage')">
        <view class="grid-icon">菜</view>
        <text class="grid-text">菜品管理</text>
      </view>
      <view class="grid-item" @click="go('/pages/merchant/category-manage/category-manage')">
        <view class="grid-icon">类</view>
        <text class="grid-text">分类管理</text>
      </view>
      <view class="grid-item" @click="go('/pages/merchant/table-manage/table-manage')">
        <view class="grid-icon">桌</view>
        <text class="grid-text">桌台管理</text>
      </view>
      <view class="grid-item" @click="go('/pages/merchant/settings/settings')">
        <view class="grid-icon">营</view>
        <text class="grid-text">营业设置</text>
      </view>
      <view class="grid-item" @click="go('/pages/merchant/stats/stats')">
        <view class="grid-icon">统</view>
        <text class="grid-text">数据统计</text>
      </view>
    </view>
  </view>
</template>

<script>
import { store } from '../../../utils/store'
import { callCloud } from '../../../utils/request'
import { FN } from '../../../utils/const'

export default {
  onLoad() {
    this.checkAuth()
  },
  methods: {
    async checkAuth() {
      try {
        const user = await callCloud(FN.USER, { action: 'login' })
        store.userInfo = user
        store.isMerchant = user.role === 'merchant'
        if (user.role !== 'merchant') {
          uni.showToast({ title: '无商家权限', icon: 'none' })
          setTimeout(() => uni.redirectTo({ url: '/pages/merchant/login/login' }), 600)
        }
      } catch (e) {
        uni.redirectTo({ url: '/pages/merchant/login/login' })
      }
    },
    go(url) {
      uni.navigateTo({ url })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
}
.banner {
  background: #ff6b35;
  color: #fff;
  padding: 60rpx 40rpx;
}
.banner-title {
  font-size: 44rpx;
  font-weight: bold;
}
.banner-sub {
  font-size: 26rpx;
  opacity: 0.9;
  margin-top: 10rpx;
}
.grid {
  display: flex;
  flex-wrap: wrap;
  padding: 20rpx;
}
.grid-item {
  width: calc(33.33% - 40rpx);
  margin: 20rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 40rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.grid-icon {
  width: 90rpx;
  height: 90rpx;
  border-radius: 50%;
  background: #fff3ee;
  color: #ff6b35;
  text-align: center;
  line-height: 90rpx;
  font-size: 40rpx;
}
.grid-text {
  margin-top: 20rpx;
  font-size: 26rpx;
  color: #333;
}
</style>
