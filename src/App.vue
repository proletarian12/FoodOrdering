<script>
export default {
  onLaunch: function () {
    // 初始化微信云开发（仅微信小程序环境）
    // #ifdef MP-WEIXIN
    if (wx.cloud) {
      wx.cloud.init({
        // 云环境 ID：留空使用默认环境；若有多个环境请填写，如 'cloud1-xxxx'
        env: '',
        traceUser: true
      })
    } else {
      console.error('[云开发] 初始化失败：wx.cloud 不存在，请确认已在微信开发者工具中开通云开发')
    }
    // #endif
  },
  onShow: function () {},
  onHide: function () {}
}
</script>

<style>
/* 全局公共样式 */
page {
  background-color: #f5f5f5;
  font-size: 28rpx;
  color: #333;
}

/* 主色 */
.text-primary { color: #ff6b35; }
.bg-primary { background-color: #ff6b35; color: #fff; }

/* 通用按钮 */
.btn-primary {
  background-color: #ff6b35;
  color: #fff;
  border-radius: 44rpx;
  text-align: center;
  font-size: 30rpx;
  line-height: 88rpx;
  height: 88rpx;
}
.btn-primary:active { opacity: 0.85; }

/* 卡片 */
.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin: 20rpx;
}
</style>
