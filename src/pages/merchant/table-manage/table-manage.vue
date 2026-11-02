<template>
  <view class="page">
    <view v-for="t in tables" :key="t._id" class="table-item">
      <view class="table-info">
        <view class="table-no">桌号 {{ t.no }}</view>
        <view class="table-status">{{ t.status === 'free' ? '空闲' : '使用中' }}</view>
      </view>
      <view class="table-actions">
        <text class="gen" @click="genQR(t)">{{ t.qrCode ? '重新生成' : '生成二维码' }}</text>
        <text class="del" @click="del(t)">删除</text>
      </view>
      <image v-if="t.qrCode" class="qr-img" :src="t.qrCode" mode="aspectFit" @click="preview(t)" />
    </view>
    <view v-if="tables.length === 0" class="empty">暂无桌台</view>

    <view class="add-btn" @click="add">+ 新增桌台</view>
  </view>
</template>

<script>
import { callCloud } from '../../../utils/request'
import { FN } from '../../../utils/const'

export default {
  data() {
    return {
      tables: []
    }
  },
  onShow() {
    this.load()
  },
  methods: {
    async load() {
      try {
        this.tables = await callCloud(FN.MERCHANT, { action: 'listTables' })
      } catch (e) {}
    },
    add() {
      uni.showModal({
        title: '新增桌台',
        editable: true,
        placeholderText: '输入桌号，如 A01',
        success: async (r) => {
          if (r.confirm && r.content) {
            try {
              await callCloud(FN.MERCHANT, { action: 'saveTable', no: r.content })
              this.load()
            } catch (e) {
              uni.showToast({ title: e.message || '添加失败', icon: 'none' })
            }
          }
        }
      })
    },
    async genQR(t) {
      uni.showLoading({ title: '生成中', mask: true })
      try {
        await callCloud(FN.MERCHANT, { action: 'genTableQR', tableId: t._id })
        uni.hideLoading()
        uni.showToast({ title: '已生成', icon: 'success' })
        this.load()
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.message || '生成失败', icon: 'none' })
      }
    },
    preview(t) {
      if (t.qrCode) {
        uni.previewImage({ urls: [t.qrCode] })
      }
    },
    del(t) {
      uni.showModal({
        title: '提示',
        content: '确定删除该桌台？',
        success: async (r) => {
          if (r.confirm) {
            try {
              await callCloud(FN.MERCHANT, { action: 'deleteTable', tableId: t._id })
              this.load()
            } catch (e) {
              uni.showToast({ title: e.message || '删除失败', icon: 'none' })
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
  padding: 20rpx;
}
.table-item {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.table-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.table-no {
  font-size: 32rpx;
  font-weight: bold;
}
.table-status {
  font-size: 26rpx;
  color: #4caf50;
}
.table-actions {
  display: flex;
  margin-top: 16rpx;
}
.gen,
.del {
  font-size: 26rpx;
  margin-right: 30rpx;
}
.gen {
  color: #ff6b35;
}
.del {
  color: #999;
}
.qr-img {
  width: 200rpx;
  height: 200rpx;
  margin-top: 16rpx;
}
.empty {
  text-align: center;
  color: #999;
  padding: 100rpx 0;
}
.add-btn {
  background: #ff6b35;
  color: #fff;
  text-align: center;
  line-height: 88rpx;
  border-radius: 44rpx;
  font-size: 30rpx;
}
</style>
