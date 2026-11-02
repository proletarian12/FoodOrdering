<template>
  <view class="page" v-if="dish._id">
    <image class="dish-img" :src="dish.image || ''" mode="aspectFill" />
    <view class="body">
      <view class="name">{{ dish.name }}</view>
      <view class="desc" v-if="dish.description">{{ dish.description }}</view>
      <view class="price-row">
        <text class="price">¥{{ currentPriceText }}</text>
      </view>

      <!-- 规格选择 -->
      <view v-for="spec in dish.specs" :key="spec.name" class="spec-group">
        <view class="spec-name">{{ spec.name }}</view>
        <view class="spec-options">
          <view
            v-for="opt in spec.options"
            :key="opt"
            class="spec-opt"
            :class="{ active: selected[spec.name] === opt }"
            @click="select(spec.name, opt)"
          >
            {{ opt }}
          </view>
        </view>
      </view>

      <!-- 数量 -->
      <view class="qty-row">
        <text class="qty-label">数量</text>
        <view class="qty">
          <view class="qty-btn" @click="changeQty(-1)">-</view>
          <text class="qty-num">{{ qty }}</text>
          <view class="qty-btn" @click="changeQty(1)">+</view>
        </view>
      </view>
    </view>

    <!-- 底部 -->
    <view class="footer">
      <view class="footer-price">¥{{ totalText }}</view>
      <view class="footer-btn" @click="doAdd">选好了</view>
    </view>
  </view>
</template>

<script>
import { addToCart } from '../../utils/store'
import { callCloud } from '../../utils/request'
import { FN } from '../../utils/const'
import { fen2yuan } from '../../utils/format'

function attrsKey(attrs) {
  const keys = Object.keys(attrs).sort()
  const obj = {}
  keys.forEach((k) => (obj[k] = attrs[k]))
  return JSON.stringify(obj)
}

export default {
  data() {
    return {
      dish: {},
      selected: {}, // { '份量': '小份', '辣度': '不辣' }
      qty: 1
    }
  },
  computed: {
    currentSku() {
      const onSkus = (this.dish.skus || []).filter((s) => s.isOn !== false)
      if (onSkus.length === 0) return null
      return onSkus.find((sku) => {
        return Object.keys(this.selected).every((k) => sku.attrs && sku.attrs[k] === this.selected[k])
      }) || onSkus[0]
    },
    currentPrice() {
      return this.currentSku ? this.currentSku.price : 0
    },
    currentPriceText() {
      return fen2yuan(this.currentPrice)
    },
    totalText() {
      return fen2yuan(this.currentPrice * this.qty)
    }
  },
  onLoad(options) {
    this.dishId = options.id
    this.load()
  },
  methods: {
    async load() {
      try {
        const dish = await callCloud(FN.DISH, { action: 'getDish', dishId: this.dishId })
        this.dish = dish
        // 默认选中每组规格的第一个选项
        const selected = {}
        ;(dish.specs || []).forEach((spec) => {
          if (spec.options && spec.options.length) selected[spec.name] = spec.options[0]
        })
        this.selected = selected
      } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    select(name, opt) {
      this.selected[name] = opt
    },
    changeQty(d) {
      this.qty = Math.max(1, this.qty + d)
    },
    doAdd() {
      const sku = this.currentSku
      addToCart({
        dishId: this.dish._id,
        name: this.dish.name,
        image: this.dish.image,
        attrs: sku ? sku.attrs : {},
        attrsKey: attrsKey(sku ? sku.attrs : {}),
        attrsText: Object.values(this.selected).join('/'),
        price: this.currentPrice
      })
      uni.showToast({ title: '已加入', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 600)
    }
  }
}
</script>

<style scoped>
.page {
  padding-bottom: 120rpx;
}
.dish-img {
  width: 100%;
  height: 400rpx;
  background: #eee;
}
.body {
  background: #fff;
  padding: 30rpx;
  margin-top: -20rpx;
  border-radius: 24rpx 24rpx 0 0;
}
.name {
  font-size: 36rpx;
  font-weight: bold;
}
.desc {
  font-size: 26rpx;
  color: #999;
  margin-top: 10rpx;
}
.price-row {
  margin-top: 16rpx;
}
.price {
  color: #ff6b35;
  font-size: 40rpx;
  font-weight: bold;
}
.spec-group {
  margin-top: 30rpx;
}
.spec-name {
  font-size: 28rpx;
  color: #666;
}
.spec-options {
  display: flex;
  flex-wrap: wrap;
  margin-top: 16rpx;
}
.spec-opt {
  padding: 12rpx 30rpx;
  border: 2rpx solid #ddd;
  border-radius: 8rpx;
  margin: 0 20rpx 20rpx 0;
  font-size: 26rpx;
}
.spec-opt.active {
  border-color: #ff6b35;
  color: #ff6b35;
  background: #fff3ee;
}
.qty-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 30rpx;
}
.qty {
  display: flex;
  align-items: center;
}
.qty-btn {
  width: 60rpx;
  height: 60rpx;
  background: #f5f5f5;
  text-align: center;
  line-height: 60rpx;
  font-size: 34rpx;
  border-radius: 8rpx;
}
.qty-num {
  margin: 0 30rpx;
  font-size: 32rpx;
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
.footer-price {
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
