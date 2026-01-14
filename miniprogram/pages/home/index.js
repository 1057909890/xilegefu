// pages/home/index.js
const app = getApp()

Page({
  data: {
    duration: 10,
    timeDisplay: '10:00',
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
        rhythm: settings.rhythm || { inhale: 3, exhale: 6, hold: 2 },
        timeDisplay: this.formatTime(settings.duration || 10)
      })
    } else {
      // 使用默认值
      const defaultDuration = app.globalData.trainingSettings.duration || 10
      this.setData({
        duration: defaultDuration,
        rhythm: app.globalData.trainingSettings.rhythm,
        timeDisplay: this.formatTime(defaultDuration)
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
    const duration = e.detail.value
    this.setData({
      duration: duration,
      timeDisplay: this.formatTime(duration)
    })
  },

  // 快速设置时长
  setDuration(e) {
    const duration = parseInt(e.currentTarget.dataset.duration)
    this.setData({
      duration: duration,
      timeDisplay: this.formatTime(duration)
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
    
    // 更新时间显示
    this.setData({
      timeDisplay: this.formatTime(this.data.duration)
    })
    
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
  },

  // 格式化时间显示（分钟转成时:分格式）
  formatTime(minutes) {
    if (!minutes || minutes === 0) {
      return '10:00'
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, '0')}`
    }
    return `${String(mins).padStart(2, '0')}:00`
  }
})
