<template>
  <view class="page">
    <view class="section">
      <view class="row">
        <text class="label">店铺名称</text>
        <input class="input" v-model="form.shopName" placeholder="店铺名称" />
      </view>
      <view class="row">
        <text class="label">营业状态</text>
        <switch :checked="form.isOpen" @change="(e) => (form.isOpen = e.detail.value)" color="#ff6b35" />
      </view>
      <view class="row">
        <text class="label">营业时间</text>
        <picker mode="time" :value="form.businessHours.start" @change="(e) => (form.businessHours.start = e.detail.value)">
          <text class="input">{{ form.businessHours.start }}</text>
        </picker>
        <text class="sep">至</text>
        <picker mode="time" :value="form.businessHours.end" @change="(e) => (form.businessHours.end = e.detail.value)">
          <text class="input">{{ form.businessHours.end }}</text>
        </picker>
      </view>
      <view class="row">
        <text class="label">联系电话</text>
        <input class="input" type="number" v-model="form.phone" placeholder="店铺电话" />
      </view>
      <view class="row col">
        <text class="label">店铺公告</text>
        <textarea class="textarea" v-model="form.notice" placeholder="公告内容" />
      </view>
    </view>

    <view class="save-btn" @click="save">保存设置</view>
  </view>
</template>

<script>
import { callCloud } from '../../../utils/request'
import { FN } from '../../../utils/const'

export default {
  data() {
    return {
      form: {
        shopName: '',
        isOpen: true,
        businessHours: { start: '08:00', end: '22:00' },
        phone: '',
        notice: ''
      }
    }
  },
  onLoad() {
    this.load()
  },
  methods: {
    async load() {
      try {
        const s = await callCloud(FN.MERCHANT, { action: 'getSettings' })
        this.form = {
          shopName: s.shopName || '',
          isOpen: s.isOpen !== false,
          businessHours: s.businessHours || { start: '08:00', end: '22:00' },
          phone: s.phone || '',
          notice: s.notice || ''
        }
      } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    async save() {
      try {
        await callCloud(FN.MERCHANT, {
          action: 'saveSettings',
          data: {
            ...this.form
          }
        })
        uni.showToast({ title: '已保存', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e.message || '保存失败', icon: 'none' })
      }
    }
  }
}
</script>

<style scoped>
.page {
  padding: 20rpx;
}
.section {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
}
.row {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.row.col {
  flex-direction: column;
  align-items: flex-start;
}
.label {
  width: 200rpx;
  font-size: 28rpx;
  color: #333;
  flex-shrink: 0;
}
.input {
  flex: 1;
  font-size: 28rpx;
}
.sep {
  margin: 0 16rpx;
  color: #999;
}
.textarea {
  width: 100%;
  border: 1rpx solid #eee;
  border-radius: 10rpx;
  padding: 16rpx;
  font-size: 28rpx;
  min-height: 120rpx;
  margin-top: 16rpx;
}
.save-btn {
  background: #ff6b35;
  color: #fff;
  text-align: center;
  line-height: 88rpx;
  border-radius: 44rpx;
  font-size: 32rpx;
  margin-top: 40rpx;
}
</style>
