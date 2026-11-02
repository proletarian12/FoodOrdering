<template>
  <view class="page">
    <view class="cards">
      <view class="stat-card">
        <view class="stat-value">¥{{ fen(stats.todayTotal) }}</view>
        <view class="stat-label">今日营收</view>
      </view>
      <view class="stat-card">
        <view class="stat-value">{{ stats.todayCount }}</view>
        <view class="stat-label">今日订单</view>
      </view>
      <view class="stat-card">
        <view class="stat-value">¥{{ fen(stats.allTotal) }}</view>
        <view class="stat-label">累计营收</view>
      </view>
      <view class="stat-card">
        <view class="stat-value">{{ stats.allCount }}</view>
        <view class="stat-label">累计订单</view>
      </view>
    </view>

    <view class="section">
      <view class="section-title">销量排行 TOP10</view>
      <view v-for="(t, i) in stats.top" :key="t._id" class="rank-item">
        <text class="rank-no">{{ i + 1 }}</text>
        <text class="rank-name">{{ t.name }}</text>
        <text class="rank-qty">销量 {{ t.qty }}</text>
        <text class="rank-amount">¥{{ fen(t.amount) }}</text>
      </view>
      <view v-if="!stats.top || stats.top.length === 0" class="empty">暂无数据</view>
    </view>
  </view>
</template>

<script>
import { callCloud } from '../../../utils/request'
import { FN } from '../../../utils/const'
import { fen2yuan } from '../../../utils/format'

export default {
  data() {
    return {
      stats: { todayTotal: 0, todayCount: 0, allTotal: 0, allCount: 0, top: [] }
    }
  },
  onShow() {
    this.load()
  },
  methods: {
    fen(f) {
      return fen2yuan(f)
    },
    async load() {
      try {
        this.stats = await callCloud(FN.MERCHANT, { action: 'stats' })
      } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    }
  }
}
</script>

<style scoped>
.page {
  padding: 20rpx;
}
.cards {
  display: flex;
  flex-wrap: wrap;
}
.stat-card {
  width: calc(50% - 40rpx);
  margin: 20rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 40rpx 0;
  text-align: center;
}
.stat-value {
  font-size: 40rpx;
  font-weight: bold;
  color: #ff6b35;
}
.stat-label {
  font-size: 26rpx;
  color: #999;
  margin-top: 10rpx;
}
.section {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-top: 20rpx;
}
.section-title {
  font-size: 30rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
}
.rank-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
  font-size: 28rpx;
}
.rank-no {
  width: 60rpx;
  color: #ff6b35;
  font-weight: bold;
}
.rank-name {
  flex: 1;
}
.rank-qty {
  color: #666;
  margin-right: 30rpx;
}
.rank-amount {
  width: 140rpx;
  text-align: right;
  color: #ff6b35;
}
.empty {
  text-align: center;
  color: #999;
  padding: 60rpx 0;
}
</style>
