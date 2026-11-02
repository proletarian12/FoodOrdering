<template>
  <view class="page">
    <view class="title">商家登录</view>
    <view class="desc">输入管理码验证商家身份</view>
    <input class="input" v-model="key" placeholder="请输入管理码" />
    <view class="btn" @click="submit">验证商家身份</view>
  </view>
</template>

<script>
import { store } from '../../../utils/store'
import { callCloud } from '../../../utils/request'
import { FN } from '../../../utils/const'

export default {
  data() {
    return {
      key: ''
    }
  },
  methods: {
    async submit() {
      if (!this.key) {
        uni.showToast({ title: '请输入管理码', icon: 'none' })
        return
      }
      try {
        await callCloud(FN.USER, { action: 'bindMerchant', key: this.key })
        store.isMerchant = true
        if (store.userInfo) store.userInfo.role = 'merchant'
        uni.showToast({ title: '绑定成功', icon: 'success' })
        setTimeout(() => {
          uni.redirectTo({ url: '/pages/merchant/home/home' })
        }, 600)
      } catch (e) {
        uni.showToast({ title: e.message || '绑定失败', icon: 'none' })
      }
    }
  }
}
</script>

<style scoped>
.page {
  padding: 100rpx 60rpx;
}
.title {
  font-size: 44rpx;
  font-weight: bold;
  text-align: center;
}
.desc {
  font-size: 24rpx;
  color: #999;
  text-align: center;
  margin: 20rpx 0 60rpx;
}
.input {
  border: 1rpx solid #ddd;
  border-radius: 12rpx;
  padding: 24rpx;
  font-size: 30rpx;
}
.btn {
  background: #ff6b35;
  color: #fff;
  text-align: center;
  line-height: 88rpx;
  border-radius: 44rpx;
  font-size: 32rpx;
  margin-top: 60rpx;
}
</style>
