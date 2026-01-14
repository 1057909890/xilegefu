// pages/safety/index.js
Page({
  data: {
    agreed: false
  },

  onLoad() {
    // 检查是否已阅读
    const hasRead = wx.getStorageSync('hasReadSafety')
    if (hasRead) {
      wx.reLaunch({
        url: '/pages/home/index'
      })
    }
  },

  toggleAgree() {
    this.setData({
      agreed: !this.data.agreed
    })
  },

  handleConfirm() {
    if (!this.data.agreed) {
      wx.showToast({
        title: '请先阅读并同意',
        icon: 'none'
      })
      return
    }

    // 保存已阅读状态
    wx.setStorageSync('hasReadSafety', true)
    
    // 跳转到首页
    wx.reLaunch({
      url: '/pages/home/index'
    })
  }
})
