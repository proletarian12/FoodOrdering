<template>
  <view class="page">
    <view v-for="cat in categories" :key="cat._id" class="cat-item">
      <input class="cat-input" v-model="cat.name" />
      <view class="cat-actions">
        <text class="cat-save" @click="save(cat)">保存</text>
        <text class="cat-del" @click="del(cat)">删除</text>
      </view>
    </view>
    <view class="add-btn" @click="add">+ 新增分类</view>
  </view>
</template>

<script>
import { callCloud } from '../../../utils/request'
import { FN } from '../../../utils/const'

export default {
  data() {
    return {
      categories: []
    }
  },
  onShow() {
    this.load()
  },
  methods: {
    async load() {
      try {
        this.categories = await callCloud(FN.DISH, { action: 'listCategories' })
      } catch (e) {}
    },
    add() {
      this.categories.push({ _id: '', name: '', sort: 0, isNew: true })
    },
    async save(cat) {
      if (!cat.name) {
        uni.showToast({ title: '名称不能为空', icon: 'none' })
        return
      }
      try {
        await callCloud(FN.DISH, { action: 'saveCategory', _id: cat._id, name: cat.name, sort: cat.sort })
        uni.showToast({ title: '已保存', icon: 'none' })
        this.load()
      } catch (e) {
        uni.showToast({ title: e.message || '保存失败', icon: 'none' })
      }
    },
    del(cat) {
      if (!cat._id) {
        this.categories = this.categories.filter((c) => c !== cat)
        return
      }
      uni.showModal({
        title: '提示',
        content: '确定删除该分类？',
        success: async (r) => {
          if (r.confirm) {
            try {
              await callCloud(FN.DISH, { action: 'deleteCategory', categoryId: cat._id })
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
.cat-item {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
}
.cat-input {
  flex: 1;
  border: 1rpx solid #eee;
  border-radius: 10rpx;
  padding: 16rpx;
  font-size: 28rpx;
}
.cat-actions {
  display: flex;
  margin-left: 20rpx;
}
.cat-save,
.cat-del {
  font-size: 26rpx;
  padding: 10rpx 20rpx;
}
.cat-save {
  color: #ff6b35;
}
.cat-del {
  color: #999;
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
