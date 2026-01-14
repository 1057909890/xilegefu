// pages/subscribe/index.js
Page({
  data: {
    checkInDays: 0,
    todayCount: 0,
    selectedFrequency: 0 // 0表示自定义，3表示每周3次，5表示每周5次
  },

  onLoad() {
    this.loadStatistics()
  },

  // 加载统计数据
  async loadStatistics() {
    try {
      const db = wx.cloud.database()
      const _ = db.command
      
      // 获取今日训练次数
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const todayRecords = await db.collection('training_records')
        .where({
          date: _.gte(today.getTime())
        })
        .count()
      
      // 获取连续打卡天数（简化版）
      const checkInDays = await this.getCheckInDays()
      
      this.setData({
        todayCount: todayRecords.total,
        checkInDays: checkInDays
      })
    } catch (err) {
      console.error('加载统计数据失败', err)
    }
  },

  // 获取连续打卡天数
  async getCheckInDays() {
    try {
      const db = wx.cloud.database()
      const records = await db.collection('training_records')
        .orderBy('date', 'desc')
        .limit(30)
        .get()
      
      if (records.data.length === 0) return 0
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      let days = 0
      let checkDate = new Date(today)
      
      for (let i = 0; i < records.data.length; i++) {
        const recordDate = new Date(records.data[i].date)
        recordDate.setHours(0, 0, 0, 0)
        
        if (recordDate.getTime() === checkDate.getTime()) {
          days++
          checkDate.setDate(checkDate.getDate() - 1)
        } else if (recordDate.getTime() < checkDate.getTime()) {
          break
        }
      }
      
      return days
    } catch (err) {
      console.error('获取打卡天数失败', err)
      return 0
    }
  },

  // 选择提醒频率
  selectFrequency(e) {
    const frequency = parseInt(e.currentTarget.dataset.frequency)
    this.setData({
      selectedFrequency: frequency
    })
  },

  // 确认订阅
  handleConfirm() {
    if (this.data.selectedFrequency === 0) {
      // 自定义频率，可以跳转到自定义设置页或使用默认
      wx.showToast({
        title: '自定义功能开发中',
        icon: 'none'
      })
      return
    }

    // 调用订阅消息
    this.subscribeMessage(this.data.selectedFrequency)
  },

  // 订阅消息
  subscribeMessage(frequency) {
    // 注意：订阅消息需要在app.json中配置模板ID
    // 这里使用示例模板ID，实际使用时需要替换为真实的模板ID
    wx.requestSubscribeMessage({
      tmplIds: ['your-template-id-1', 'your-template-id-2'], // 替换为实际模板ID
      success: (res) => {
        console.log('订阅成功', res)
        
        // 保存订阅设置到云数据库
        this.saveSubscribeSettings(frequency, res)
        
        wx.showToast({
          title: '订阅成功',
          icon: 'success'
        })
        
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      },
      fail: (err) => {
        console.error('订阅失败', err)
        wx.showToast({
          title: '订阅失败，请重试',
          icon: 'none'
        })
      }
    })
  },

  // 保存订阅设置
  async saveSubscribeSettings(frequency, subscribeResult) {
    try {
      const db = wx.cloud.database()
      const userInfo = wx.getStorageSync('userInfo') || {}
      
      await db.collection('subscribe_settings').add({
        data: {
          frequency: frequency,
          subscribeResult: subscribeResult,
          openid: userInfo.openid || '',
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
    } catch (err) {
      console.error('保存订阅设置失败', err)
    }
  }
})
