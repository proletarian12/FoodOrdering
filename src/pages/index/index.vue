<template>
  <view class="page">
    <!-- 顶部店铺信息 -->
    <view class="header">
      <view class="shop-info">
        <view class="shop-name">{{ shopInfo.shopName || '点餐' }}</view>
        <view class="shop-notice" v-if="shopInfo.notice">{{ shopInfo.notice }}</view>
        <view class="shop-closed" v-if="shopInfo.isOpen === false">本店已打烊</view>
      </view>
      <view class="table-tag" v-if="store.tableInfo" @click="clearTable">
        桌台 {{ store.tableInfo.tableNo }} ✕
      </view>
    </view>

    <!-- 分类 + 菜品 -->
    <view class="menu-body">
      <scroll-view class="category-list" scroll-y>
        <view
          v-for="cat in categories"
          :key="cat._id"
          class="category-item"
          :class="{ active: currentCat === cat._id }"
          @click="selectCat(cat._id)"
        >
          {{ cat.name }}
        </view>
      </scroll-view>

      <scroll-view class="dish-list" scroll-y>
        <view v-for="dish in filterDishes" :key="dish._id" class="dish-item" @click="goDish(dish)">
          <image class="dish-img" :src="dish.image || ''" mode="aspectFill" />
          <view class="dish-info">
            <view class="dish-name">{{ dish.name }}</view>
            <view class="dish-desc">{{ dish.description }}</view>
            <view class="dish-bottom">
              <text class="dish-price">¥{{ minPrice(dish) }}</text>
              <view class="add-btn" @click.stop="quickAdd(dish)">+</view>
            </view>
          </view>
        </view>
        <view v-if="filterDishes.length === 0" class="empty">暂无菜品</view>
      </scroll-view>
    </view>

    <!-- 底部购物车栏 -->
    <view class="cart-bar" @click="goCart">
      <view class="cart-left">
        <view class="cart-icon">
          <text class="cart-count" v-if="cartCount > 0">{{ cartCount }}</text>
        </view>
        <text class="cart-total" v-if="cartTotal > 0">¥{{ totalText }}</text>
      </view>
      <view class="cart-go" :class="{ disabled: cartCount === 0 }">去结算</view>
    </view>
  </view>
</template>

<script>
import { store, saveTableInfo, clearTableInfo, cartCount, cartTotal, addToCart } from '../../utils/store'
import { callCloud } from '../../utils/request'
import { FN } from '../../utils/const'
import { fen2yuan } from '../../utils/format'

export default {
  data() {
    return {
      shopInfo: {},
      categories: [],
      dishes: [],
      currentCat: ''
    }
  },
  computed: {
    store() {
      return store
    },
    cartCount() {
      return cartCount()
    },
    cartTotal() {
      return cartTotal()
    },
    totalText() {
      return fen2yuan(this.cartTotal)
    },
    filterDishes() {
      if (!this.currentCat) return this.dishes
      return this.dishes.filter((d) => d.categoryId === this.currentCat)
    }
  },
  onLoad(options) {
    this.init(options)
  },
  methods: {
    async init(options) {
      // 扫码进入：解析 scene 绑定桌台
      if (options && options.scene) {
        const tableId = decodeURIComponent(options.scene)
        this.bindTable(tableId)
      }
      this.loadData()
    },
    async bindTable(tableId) {
      try {
        const table = await callCloud(FN.DISH, { action: 'getTable', tableId })
        saveTableInfo({ tableId, tableNo: table.no })
      } catch (e) {
        uni.showToast({ title: '桌台无效', icon: 'none' })
      }
    },
    clearTable() {
      clearTableInfo()
    },
    async loadData() {
      try {
        const [shop, cats, dishes] = await Promise.all([
          callCloud(FN.DISH, { action: 'getShopInfo' }),
          callCloud(FN.DISH, { action: 'listCategories' }),
          callCloud(FN.DISH, { action: 'listDishes' })
        ])
        this.shopInfo = shop
        this.categories = cats || []
        this.dishes = dishes || []
        if (!this.currentCat && this.categories.length) {
          this.currentCat = this.categories[0]._id
        }
      } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    selectCat(id) {
      this.currentCat = id
    },
    minPrice(dish) {
      if (!dish.skus || dish.skus.length === 0) return '0.00'
      const prices = dish.skus.filter((s) => s.isOn !== false).map((s) => s.price)
      if (prices.length === 0) return '0.00'
      return fen2yuan(Math.min.apply(null, prices))
    },
    quickAdd(dish) {
      // 单规格直接加购；多规格跳详情选择
      const onSkus = (dish.skus || []).filter((s) => s.isOn !== false)
      if (onSkus.length <= 1) {
        const sku = onSkus[0] || { price: 0, attrs: {} }
        addToCart({
          dishId: dish._id,
          name: dish.name,
          image: dish.image,
          attrs: sku.attrs || {},
          attrsKey: JSON.stringify(sku.attrs || {}),
          attrsText: '',
          price: sku.price
        })
        uni.showToast({ title: '已加入', icon: 'none' })
      } else {
        this.goDish(dish)
      }
    },
    goDish(dish) {
      uni.navigateTo({ url: '/pages/dish/dish?id=' + dish._id })
    },
    goCart() {
      if (this.cartCount === 0) return
      uni.navigateTo({ url: '/pages/checkout/checkout' })
    }
  }
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.header {
  background: #ff6b35;
  color: #fff;
  padding: 20rpx 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.shop-name {
  font-size: 34rpx;
  font-weight: bold;
}
.shop-notice {
  font-size: 24rpx;
  opacity: 0.9;
  margin-top: 4rpx;
}
.shop-closed {
  font-size: 24rpx;
  margin-top: 4rpx;
}
.table-tag {
  background: rgba(255, 255, 255, 0.25);
  padding: 10rpx 20rpx;
  border-radius: 30rpx;
  font-size: 26rpx;
}
.menu-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}
.category-list {
  width: 180rpx;
  height: 100%;
  background: #f5f5f5;
}
.category-item {
  padding: 30rpx 16rpx;
  font-size: 26rpx;
  text-align: center;
  color: #666;
}
.category-item.active {
  background: #fff;
  color: #ff6b35;
  font-weight: bold;
  border-left: 6rpx solid #ff6b35;
}
.dish-list {
  flex: 1;
  height: 100%;
}
.dish-item {
  display: flex;
  padding: 20rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
}
.dish-img {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background: #eee;
  flex-shrink: 0;
}
.dish-info {
  flex: 1;
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
}
.dish-name {
  font-size: 30rpx;
  font-weight: bold;
}
.dish-desc {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
  flex: 1;
}
.dish-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.dish-price {
  color: #ff6b35;
  font-size: 30rpx;
  font-weight: bold;
}
.add-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #ff6b35;
  color: #fff;
  text-align: center;
  line-height: 56rpx;
  font-size: 36rpx;
}
.empty {
  text-align: center;
  color: #999;
  padding: 80rpx 0;
}
.cart-bar {
  height: 100rpx;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30rpx;
  box-shadow: 0 -4rpx 12rpx rgba(0, 0, 0, 0.05);
}
.cart-left {
  display: flex;
  align-items: center;
}
.cart-icon {
  width: 80rpx;
  height: 80rpx;
  background: #ff6b35;
  border-radius: 50%;
  position: relative;
}
.cart-count {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  background: #ff3b30;
  color: #fff;
  min-width: 36rpx;
  height: 36rpx;
  line-height: 36rpx;
  border-radius: 18rpx;
  text-align: center;
  font-size: 22rpx;
  padding: 0 6rpx;
}
.cart-total {
  margin-left: 20rpx;
  font-size: 34rpx;
  font-weight: bold;
  color: #ff6b35;
}
.cart-go {
  background: #ff6b35;
  color: #fff;
  padding: 16rpx 50rpx;
  border-radius: 44rpx;
  font-size: 30rpx;
}
.cart-go.disabled {
  background: #ccc;
}
</style>
