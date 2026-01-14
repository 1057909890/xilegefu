// pages/complete/index.js
Page({
  data: {
    duration: '00:00',
    todayCount: 0,
    checkInDays: 0,
    totalCount: 0
  },

  onLoad(options) {
    const duration = parseInt(options.duration) || 0
    const elapsed = parseInt(options.elapsed) || 0
    const cycles = parseInt(options.cycles) || 0
    
    this.setData({
      duration: this.formatTime(duration)
    })
    
    // 加载统计数据
    this.loadStatistics()
    
    // 检查是否需要显示订阅提示
    this.checkSubscribePrompt()
  },

  // 加载统计数据
  async loadStatistics() {
    try {
      const db = wx.cloud.database()
      const _ = db.command
      
      // 获取今日训练次数
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStart = today.getTime()
      
      const todayRecords = await db.collection('training_records')
        .where({
          date: _.gte(todayStart)
        })
        .count()
      
      // 获取总训练次数
      const totalRecords = await db.collection('training_records')
        .count()
      
      // 获取连续打卡天数（简化版，实际需要更复杂的逻辑）
      const checkInDays = await this.getCheckInDays()
      
      this.setData({
        todayCount: todayRecords.total,
        totalCount: totalRecords.total,
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
      
      if (records.data.length === 0) return 1
      
      // 简化逻辑：检查最近是否有训练记录
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
      
      return Math.max(days, 1)
    } catch (err) {
      console.error('获取打卡天数失败', err)
      return 1
    }
  },

  // 检查是否需要显示订阅提示
  checkSubscribePrompt() {
    // 检查是否首次完成训练
    const hasShownSubscribe = wx.getStorageSync('hasShownSubscribe')
    if (!hasShownSubscribe) {
      // 延迟显示，避免与完成页冲突
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/subscribe/index'
        })
        wx.setStorageSync('hasShownSubscribe', true)
      }, 2000)
    }
  },

  // 返回首页
  goHome() {
    wx.reLaunch({
      url: '/pages/home/index'
    })
  },

  // 查看历史记录
  viewHistory() {
    wx.navigateTo({
      url: '/pages/history/index'
    })
  },

  // 格式化时间
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
})
