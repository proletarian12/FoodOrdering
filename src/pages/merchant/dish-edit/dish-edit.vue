<template>
  <view class="page">
    <!-- 基本信息 -->
    <view class="section">
      <view class="img-row" @click="chooseImage">
        <image v-if="form.image" :src="form.image" class="dish-img" mode="aspectFill" />
        <view v-else class="img-placeholder">+ 上传图片</view>
      </view>
      <view class="row">
        <text class="label">名称</text>
        <input class="input" v-model="form.name" placeholder="菜品名称" />
      </view>
      <view class="row">
        <text class="label">描述</text>
        <input class="input" v-model="form.description" placeholder="菜品描述" />
      </view>
      <view class="row">
        <text class="label">分类</text>
        <picker :range="categories" range-key="name" @change="onCatChange">
          <text class="input">{{ catName }}</text>
        </picker>
      </view>
      <view class="row">
        <text class="label">上架</text>
        <switch :checked="form.isOnSale" @change="(e) => (form.isOnSale = e.detail.value)" color="#ff6b35" />
      </view>
    </view>

    <!-- 规格组 -->
    <view class="section">
      <view class="section-title">规格（留空为单规格）</view>
      <view v-for="(spec, si) in form.specs" :key="si" class="spec-edit">
        <input class="spec-name" v-model="spec.name" placeholder="规格名，如：份量" />
        <input class="spec-opts" v-model="spec.optionsText" placeholder="选项用逗号分隔，如：小份,大份" />
        <text class="spec-del" @click="removeSpec(si)">删除</text>
      </view>
      <view class="add-spec" @click="addSpec">+ 添加规格</view>
      <view class="gen-btn" @click="regenerate">生成规格组合</view>
    </view>

    <!-- SKU 价格库存 -->
    <view class="section" v-if="form.skus && form.skus.length">
      <view class="section-title">价格与库存</view>
      <view v-for="(sku, i) in form.skus" :key="i" class="sku-item">
        <text class="sku-name">{{ skuText(sku.attrs) || '默认' }}</text>
        <input class="sku-price" type="digit" v-model="sku.priceYuan" placeholder="价格(元)" />
        <input class="sku-stock" type="number" v-model="sku.stock" placeholder="库存" />
        <switch :checked="sku.isOn !== false" @change="(e) => (sku.isOn = e.detail.value)" color="#ff6b35" />
      </view>
    </view>

    <view class="save-btn" @click="save">保存菜品</view>
  </view>
</template>

<script>
import { callCloud } from '../../../utils/request'
import { FN } from '../../../utils/const'

export default {
  data() {
    return {
      dishId: '',
      categories: [],
      form: {
        _id: '',
        name: '',
        description: '',
        categoryId: '',
        image: '',
        isOnSale: true,
        specs: [],
        skus: []
      }
    }
  },
  computed: {
    catName() {
      const c = this.categories.find((x) => x._id === this.form.categoryId)
      return c ? c.name : '请选择分类'
    }
  },
  onLoad(options) {
    if (options && options.id) {
      this.dishId = options.id
    }
    this.load()
  },
  methods: {
    async load() {
      try {
        const cats = await callCloud(FN.DISH, { action: 'listCategories' })
        this.categories = cats || []
      } catch (e) {}
      if (this.dishId) {
        try {
          const dish = await callCloud(FN.DISH, { action: 'getDish', dishId: this.dishId })
          this.form = {
            _id: dish._id,
            name: dish.name || '',
            description: dish.description || '',
            categoryId: dish.categoryId || '',
            image: dish.image || '',
            isOnSale: dish.isOnSale !== false,
            specs: (dish.specs || []).map((s) => ({ name: s.name, optionsText: (s.options || []).join(',') })),
            skus: (dish.skus || []).map((s) => this.decorateSku(s))
          }
        } catch (e) {
          uni.showToast({ title: '加载菜品失败', icon: 'none' })
        }
      } else {
        this.form.skus = [{ attrs: {}, priceYuan: '0.00', stock: 999, isOn: true }]
      }
    },
    decorateSku(s) {
      return {
        attrs: s.attrs || {},
        priceYuan: ((Number(s.price) || 0) / 100).toFixed(2),
        stock: s.stock !== undefined ? s.stock : 999,
        isOn: s.isOn !== false
      }
    },
    onCatChange(e) {
      const c = this.categories[e.detail.value]
      if (c) this.form.categoryId = c._id
    },
    chooseImage() {
      uni.chooseMedia({
        count: 1,
        mediaType: ['image'],
        success: async (res) => {
          const file = res.tempFiles[0]
          uni.showLoading({ title: '上传中', mask: true })
          try {
            const upload = await wx.cloud.uploadFile({
              cloudPath: 'dishes/' + Date.now() + '.png',
              filePath: file.tempFilePath
            })
            this.form.image = upload.fileID
            uni.hideLoading()
          } catch (e) {
            uni.hideLoading()
            uni.showToast({ title: '上传失败', icon: 'none' })
          }
        }
      })
    },
    addSpec() {
      this.form.specs.push({ name: '', optionsText: '' })
    },
    removeSpec(si) {
      this.form.specs.splice(si, 1)
    },
    // 根据规格组生成 SKU 组合（笛卡尔积），保留已有价格
    regenerate() {
      const specs = this.form.specs
        .map((s) => ({
          name: (s.name || '').trim(),
          options: (s.optionsText || '').split(/[,，]/).map((o) => o.trim()).filter((o) => o)
        }))
        .filter((s) => s.name && s.options.length > 0)

      if (specs.length === 0) {
        this.form.skus = [{ attrs: {}, priceYuan: '0.00', stock: 999, isOn: true }]
        return
      }

      let combos = [{}]
      specs.forEach((spec) => {
        const next = []
        combos.forEach((c) => {
          spec.options.forEach((opt) => {
            next.push(Object.assign({}, c, { [spec.name]: opt }))
          })
        })
        combos = next
      })

      const old = this.form.skus || []
      this.form.skus = combos.map((attrs) => {
        const found = old.find((o) => this.sameAttrs(o.attrs, attrs))
        return found ? Object.assign({}, found, { attrs }) : { attrs, priceYuan: '0.00', stock: 999, isOn: true }
      })
    },
    sameAttrs(a, b) {
      const ka = Object.keys(a || {}).sort()
      const kb = Object.keys(b || {}).sort()
      if (ka.length !== kb.length) return false
      return ka.every((k) => a[k] === b[k])
    },
    skuText(attrs) {
      return Object.values(attrs || {}).join(' / ')
    },
    async save() {
      if (!this.form.name) {
        uni.showToast({ title: '请填写名称', icon: 'none' })
        return
      }
      if (!this.form.categoryId) {
        uni.showToast({ title: '请选择分类', icon: 'none' })
        return
      }
      const specs = this.form.specs
        .map((s) => ({
          name: (s.name || '').trim(),
          options: (s.optionsText || '').split(/[,，]/).map((o) => o.trim()).filter((o) => o)
        }))
        .filter((s) => s.name && s.options.length > 0)
      const skus = (this.form.skus || []).map((s) => ({
        attrs: s.attrs || {},
        price: Math.round(parseFloat(s.priceYuan || '0') * 100),
        stock: Number(s.stock) || 999,
        isOn: s.isOn !== false
      }))
      if (skus.length === 0) {
        uni.showToast({ title: '请生成规格组合', icon: 'none' })
        return
      }
      try {
        await callCloud(FN.DISH, {
          action: 'saveDish',
          _id: this.form._id,
          name: this.form.name,
          description: this.form.description,
          categoryId: this.form.categoryId,
          image: this.form.image,
          isOnSale: this.form.isOnSale,
          specs,
          skus
        })
        uni.showToast({ title: '已保存', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 600)
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
  padding-bottom: 140rpx;
}
.section {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}
.section-title {
  font-size: 28rpx;
  font-weight: bold;
  margin-bottom: 16rpx;
}
.img-row {
  text-align: center;
  margin-bottom: 20rpx;
}
.dish-img {
  width: 300rpx;
  height: 300rpx;
  border-radius: 16rpx;
  background: #eee;
}
.img-placeholder {
  width: 300rpx;
  height: 300rpx;
  border: 2rpx dashed #ddd;
  border-radius: 16rpx;
  margin: 0 auto;
  color: #999;
  line-height: 300rpx;
  font-size: 28rpx;
}
.row {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.label {
  width: 140rpx;
  font-size: 28rpx;
  color: #333;
  flex-shrink: 0;
}
.input {
  flex: 1;
  font-size: 28rpx;
}
.spec-edit {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}
.spec-name {
  width: 180rpx;
  border: 1rpx solid #eee;
  border-radius: 8rpx;
  padding: 12rpx;
  font-size: 26rpx;
  margin-right: 12rpx;
}
.spec-opts {
  flex: 1;
  border: 1rpx solid #eee;
  border-radius: 8rpx;
  padding: 12rpx;
  font-size: 26rpx;
  margin-right: 12rpx;
}
.spec-del {
  color: #999;
  font-size: 26rpx;
}
.add-spec {
  color: #ff6b35;
  font-size: 28rpx;
  padding: 16rpx 0;
}
.gen-btn {
  background: #fff3ee;
  color: #ff6b35;
  text-align: center;
  line-height: 72rpx;
  border-radius: 10rpx;
  font-size: 28rpx;
}
.sku-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.sku-name {
  width: 200rpx;
  font-size: 26rpx;
  color: #666;
  flex-shrink: 0;
}
.sku-price {
  flex: 1;
  border: 1rpx solid #eee;
  border-radius: 8rpx;
  padding: 10rpx;
  font-size: 26rpx;
  margin-right: 12rpx;
}
.sku-stock {
  width: 140rpx;
  border: 1rpx solid #eee;
  border-radius: 8rpx;
  padding: 10rpx;
  font-size: 26rpx;
  margin-right: 12rpx;
}
.save-btn {
  position: fixed;
  bottom: 20rpx;
  left: 20rpx;
  right: 20rpx;
  background: #ff6b35;
  color: #fff;
  text-align: center;
  line-height: 88rpx;
  border-radius: 44rpx;
  font-size: 32rpx;
}
</style>
