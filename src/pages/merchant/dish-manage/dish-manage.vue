<template>
  <view class="page">
    <view v-for="dish in dishes" :key="dish._id" class="dish-item">
      <image class="dish-img" :src="dish.image || ''" mode="aspectFill" />
      <view class="dish-info">
        <view class="dish-name">{{ dish.name }}</view>
        <view class="dish-price">{{ priceText(dish) }}</view>
      </view>
      <view class="dish-actions">
        <text class="edit" @click="edit(dish)">编辑</text>
        <text class="del" @click="del(dish)">删除</text>
        <switch :checked="dish.isOnSale !== false" @change="(e) => toggle(dish, e)" color="#ff6b35" />
      </view>
    </view>
    <view v-if="dishes.length === 0" class="empty">暂无菜品</view>
    <view class="add-btn" @click="add">+ 新增菜品</view>
  </view>
</template>

<script>
import { callCloud } from '../../../utils/request'
import { FN } from '../../../utils/const'
import { fen2yuan } from '../../../utils/format'

export default {
  data() {
    return {
      dishes: []
    }
  },
  onShow() {
    this.load()
  },
  methods: {
    priceText(dish) {
      const skus = (dish.skus || []).filter((s) => s.isOn !== false)
      if (skus.length === 0) return '未设置价格'
      const prices = skus.map((s) => s.price)
      const min = Math.min.apply(null, prices)
      const max = Math.max.apply(null, prices)
      return min === max ? '¥' + fen2yuan(min) : '¥' + fen2yuan(min) + ' ~ ¥' + fen2yuan(max)
    },
    async load() {
      try {
        this.dishes = await callCloud(FN.DISH, { action: 'listDishes', includeOffShelf: true })
      } catch (e) {}
    },
    add() {
      uni.navigateTo({ url: '/pages/merchant/dish-edit/dish-edit' })
    },
    edit(dish) {
      uni.navigateTo({ url: '/pages/merchant/dish-edit/dish-edit?id=' + dish._id })
    },
    async toggle(dish, e) {
      try {
        await callCloud(FN.DISH, { action: 'toggleDish', dishId: dish._id, isOnSale: e.detail.value })
      } catch (err) {
        uni.showToast({ title: err.message || '操作失败', icon: 'none' })
      }
    },
    del(dish) {
      uni.showModal({
        title: '提示',
        content: '确定删除该菜品？',
        success: async (r) => {
          if (r.confirm) {
            try {
              await callCloud(FN.DISH, { action: 'deleteDish', dishId: dish._id })
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
.dish-item {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
}
.dish-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background: #eee;
  flex-shrink: 0;
}
.dish-info {
  flex: 1;
  margin-left: 20rpx;
}
.dish-name {
  font-size: 30rpx;
  font-weight: bold;
}
.dish-price {
  font-size: 26rpx;
  color: #ff6b35;
  margin-top: 8rpx;
}
.dish-actions {
  display: flex;
  align-items: center;
}
.edit,
.del {
  font-size: 26rpx;
  margin: 0 10rpx;
}
.edit {
  color: #ff6b35;
}
.del {
  color: #999;
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
