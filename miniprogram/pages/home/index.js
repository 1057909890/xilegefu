// pages/home/index.js
const app = getApp()

Page({
  data: {
    duration: 10,
    rhythm: {
      inhale: 3,
      exhale: 6,
      hold: 2
    },
    showTimePicker: false,
    showRhythmEditor: false,
    tempRhythm: {
      inhale: 3,
      exhale: 6,
      hold: 2
    }
  },

  onLoad() {
    // 从全局数据或本地存储加载设置
    const settings = wx.getStorageSync('trainingSettings')
    if (settings) {
      this.setData({
        duration: settings.duration || 10,
        rhythm: settings.rhythm || { inhale: 3, exhale: 6, hold: 2 }
      })
    } else {
      // 使用默认值
      this.setData({
        duration: app.globalData.trainingSettings.duration,
        rhythm: app.globalData.trainingSettings.rhythm
      })
    }
  },

  // 显示时间选择器
  showTimePicker() {
    this.setData({
      showTimePicker: true
    })
  },

  // 隐藏时间选择器
  hideTimePicker() {
    this.setData({
      showTimePicker: false
    })
  },

  // 阻止事件冒泡
  stopPropagation() {},

  // 滑块变化
  onSliderChange(e) {
    this.setData({
      duration: e.detail.value
    })
  },

  // 快速设置时长
  setDuration(e) {
    const duration = parseInt(e.currentTarget.dataset.duration)
    this.setData({
      duration: duration
    })
  },

  // 确认时间选择
  confirmTime() {
    // 保存设置
    const settings = wx.getStorageSync('trainingSettings') || {}
    settings.duration = this.data.duration
    wx.setStorageSync('trainingSettings', settings)
    
    // 更新全局数据
    app.globalData.trainingSettings.duration = this.data.duration
    
    this.hideTimePicker()
  },

  // 编辑呼吸节奏
  editRhythm() {
    this.setData({
      showRhythmEditor: true,
      tempRhythm: { ...this.data.rhythm }
    })
  },

  // 隐藏呼吸节奏编辑器
  hideRhythmEditor() {
    this.setData({
      showRhythmEditor: false
    })
  },

  // 调整呼吸节奏
  adjustRhythm(e) {
    const { type, delta } = e.currentTarget.dataset
    const tempRhythm = { ...this.data.tempRhythm }
    const newValue = tempRhythm[type] + parseInt(delta)
    
    // 限制范围 1-30秒
    if (newValue >= 1 && newValue <= 30) {
      tempRhythm[type] = newValue
      this.setData({
        tempRhythm: tempRhythm
      })
    }
  },

  // 确认呼吸节奏
  confirmRhythm() {
    this.setData({
      rhythm: { ...this.data.tempRhythm },
      showRhythmEditor: false
    })
    
    // 保存设置
    const settings = wx.getStorageSync('trainingSettings') || {}
    settings.rhythm = this.data.rhythm
    wx.setStorageSync('trainingSettings', settings)
    
    // 更新全局数据
    app.globalData.trainingSettings.rhythm = this.data.rhythm
  },

  // 开始训练
  startTraining() {
    // 保存当前设置
    const settings = {
      duration: this.data.duration,
      rhythm: this.data.rhythm
    }
    wx.setStorageSync('trainingSettings', settings)
    app.globalData.trainingSettings = settings
    
    // 跳转到训练页面
    wx.navigateTo({
      url: `/pages/training/index?duration=${this.data.duration}&inhale=${this.data.rhythm.inhale}&exhale=${this.data.rhythm.exhale}&hold=${this.data.rhythm.hold}`
    })
  }
})
