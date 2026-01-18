// pages/history/index.js
Page({
  data: {
    historyList: [],
    totalCount: 0,
    totalDuration: '00:00',
    checkInDays: 0,
    headerPaddingTop: 0
  },

  onLoad() {
    // 获取系统信息，计算 header padding-top
    const systemInfo = wx.getSystemInfoSync()
    const statusBarHeight = systemInfo.statusBarHeight || 0
    // 状态栏高度 + 20rpx 额外间距，转换为 rpx
    const paddingTop = (statusBarHeight * 2) + 20
    this.setData({
      headerPaddingTop: paddingTop
    })
    
    this.loadHistory()
    this.loadStatistics()
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadHistory()
    this.loadStatistics()
  },

  // 加载历史记录
  async loadHistory() {
    // 检查云开发是否初始化
    if (!wx.cloud) {
      console.error('云开发未初始化')
      wx.hideLoading()
      return
    }

    wx.showLoading({
      title: '加载中...'
    })

    try {
      const db = wx.cloud.database()
      const records = await db.collection('training_records')
        .orderBy('date', 'desc')
        .limit(50)
        .get()

      const historyList = records.data.map(item => {
        const date = new Date(item.date)
        return {
          ...item,
          dateStr: this.formatDate(date),
          timeStr: this.formatTime(date),
          durationStr: this.formatDuration(item.duration || item.elapsedTime || 0)
        }
      })

      this.setData({
        historyList: historyList
      })
    } catch (err) {
      console.error('加载历史记录失败', err)
      // 如果是 access_token 错误，提示用户
      if (err.errMsg && err.errMsg.includes('access_token')) {
        wx.showToast({
          title: '云开发未初始化',
          icon: 'none',
          duration: 3000
        })
        console.error('请检查：1. 是否已开通云开发 2. 环境ID是否正确 3. 是否已部署云函数')
      } else {
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
      }
    } finally {
      wx.hideLoading()
    }
  },

  // 加载统计数据
  async loadStatistics() {
    // 检查云开发是否初始化
    if (!wx.cloud) {
      console.error('云开发未初始化')
      return
    }

    try {
      const db = wx.cloud.database()
      const _ = db.command

      // 获取总训练次数
      const totalCountResult = await db.collection('training_records')
        .count()

      // 获取总时长
      const allRecords = await db.collection('training_records')
        .get()

      let totalSeconds = 0
      allRecords.data.forEach(item => {
        totalSeconds += (item.duration || item.elapsedTime || 0)
      })

      // 获取连续打卡天数
      const checkInDays = await this.getCheckInDays()

      this.setData({
        totalCount: totalCountResult.total,
        totalDuration: this.formatDuration(totalSeconds),
        checkInDays: checkInDays
      })
    } catch (err) {
      console.error('加载统计数据失败', err)
      // 如果是 access_token 错误，提示用户
      if (err.errMsg && err.errMsg.includes('access_token')) {
        console.error('云开发环境未正确初始化，请检查：')
        console.error('1. 是否已开通云开发')
        console.error('2. 环境ID是否正确')
        console.error('3. 是否已部署 quickstartFunctions 云函数')
      }
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

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 查看详情
  viewDetail(e) {
    const item = e.currentTarget.dataset.item
    wx.showModal({
      title: '训练详情',
      content: `日期: ${item.dateStr} ${item.timeStr}\n时长: ${item.durationStr}\n循环: ${item.cycleCount}次`,
      showCancel: false
    })
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // 格式化时间
  formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  },

  // 格式化时长
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}小时${mins}分钟`
    } else if (mins > 0) {
      return `${mins}分钟${secs}秒`
    } else {
      return `${secs}秒`
    }
  }
})
