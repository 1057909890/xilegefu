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
    },
    showSafetyModal: false,
    safetyAgreed: false,
    showSubscribeModal: false,
    subscribeEnabled: true,
    reminderFrequency: 1, // 提醒频率：1、2、3次，默认为1
    reminderTimes: [], // 具体提醒时间，完全由用户选择，初始为空
    showTimePicker: false, // 时间选择器显示状态
    currentTimeIndex: 0, // 当前正在编辑的时间索引
    particles: [] // 粒子数组
  },

  onLoad(options) {
    // 安全须知不在首页自动显示，只在点击开始按钮时检查
    
    // 检查是否需要显示订阅弹窗（从完成页跳转过来）
    if (options && options.showSubscribe === 'true') {
      setTimeout(() => {
        this.setData({
          showSubscribeModal: true
        })
      }, 500)
    }

    // 加载已保存的订阅设置
    const subscribeSettings = wx.getStorageSync('subscribeSettings')
    if (subscribeSettings && subscribeSettings.frequency && subscribeSettings.times) {
      this.setData({
        reminderFrequency: subscribeSettings.frequency || 1,
        reminderTimes: subscribeSettings.times || []
      })
    }

    // 初始化粒子
    this.initParticles()

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

  // 初始化粒子
  initParticles() {
    const particles = []
    const particleCount = 60 // 增加粒子数量，让效果更明显
    const avgDuration = 20 // 平均动画时长（秒）
    const initialParticleRatio = 0.6// 40%的粒子在初始时就分布在屏幕各处
    const initialParticleCount = Math.floor(particleCount * initialParticleRatio)
    
    // 生成蓝色到紫色之间的随机颜色（稍微暗一点的紫色）
    // 蓝色: rgb(80, 120, 200) 到 紫色: rgb(150, 80, 200)
    const getRandomColor = () => {
      const r = 80 + Math.random() * 70  // 80-150（降低亮度）
      const g = 80 + Math.random() * 40  // 80-120（降低亮度）
      const b = 150 + Math.random() * 50  // 150-200（降低亮度）
      return { r: Math.floor(r), g: Math.floor(g), b: Math.floor(b) }
    }
    
    // 创建粒子 - 所有粒子都先快速分散
    for (let i = 0; i < particleCount; i++) {
      // 中心点
      const centerX = 50
      const centerY = 50
      
      // 所有粒子都从中心开始
      const x = centerX
      const y = centerY
      
      // 目标位置：随机分布在屏幕各处（避免太靠近边缘）
      const targetX = 15 + Math.random() * 70  // 15%-85%
      const targetY = 15 + Math.random() * 70  // 15%-85%
      
      // 快速分散的距离（100ms内完成）
      // 将百分比转换为rpx（粗略估算：1% ≈ 7.5rpx）
      const initialDx = (targetX - centerX) * 7.5
      const initialDy = (targetY - centerY) * 7.5
      
      // 计算从目标位置继续扩散的方向和距离
      const angle = Math.atan2(targetY - centerY, targetX - centerX)
      const totalDistance = 400 + Math.random() * 600 // 总扩散距离
      const dx = Math.cos(angle) * totalDistance
      const dy = Math.sin(angle) * totalDistance
      
      // 延迟时间：快速分散完成后（0.1s），再均匀分布延迟，让粒子慢慢开始扩散
      // 前40%的粒子分散后立即开始，后面的粒子逐渐延迟
      const spreadDelay = i < initialParticleCount ? 0 : ((i - initialParticleCount) / (particleCount - initialParticleCount)) * avgDuration
      const delay = 0.1 + spreadDelay // 0.1s快速分散 + 后续延迟
      
      // 动画时长
      const duration = avgDuration + (Math.random() - 0.5) * 6
      
      // 生成随机颜色（蓝色到紫色之间）
      const color = getRandomColor()
      
      // 生成完整的样式字符串
      const bgStyle = `radial-gradient(circle, rgba(${color.r}, ${color.g}, ${color.b}, 0.9) 0%, rgba(${color.r}, ${color.g}, ${color.b}, 0.6) 30%, rgba(${color.r}, ${color.g}, ${color.b}, 0.4) 60%, rgba(${color.r}, ${color.g}, ${color.b}, 0.2) 80%, transparent 100%)`
      // 减小光晕范围
      const shadowStyle = `0 0 3rpx rgba(${color.r}, ${color.g}, ${color.b}, 0.6), 0 0 6rpx rgba(${color.r}, ${color.g}, ${color.b}, 0.4), 0 0 10rpx rgba(${color.r}, ${color.g}, ${color.b}, 0.2)`
      
      particles.push({
        x: x,
        y: y,
        dx: dx, // X方向移动距离（扩散阶段）
        dy: dy, // Y方向移动距离（扩散阶段）
        initialDx: initialDx, // 初始快速分散的X距离
        initialDy: initialDy, // 初始快速分散的Y距离
        delay: delay, // 延迟时间
        duration: duration, // 动画时长
        bgStyle: bgStyle, // 背景样式
      })
    }
    
    this.setData({
      particles: particles
    })
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

  // 调整呼吸节奏（已废弃，改用滑块）
  adjustRhythm(e) {
    const { type, delta } = e.currentTarget.dataset
    const tempRhythm = { ...this.data.tempRhythm }
    const newValue = tempRhythm[type] + parseInt(delta)
    
    // 限制范围 1-15秒
    if (newValue >= 1 && newValue <= 15) {
      tempRhythm[type] = newValue
      this.setData({
        tempRhythm: tempRhythm
      })
    }
  },

  // 吸气滑块变化
  onInhaleChange(e) {
    const tempRhythm = { ...this.data.tempRhythm }
    tempRhythm.inhale = e.detail.value
    this.setData({
      tempRhythm: tempRhythm
    })
  },

  // 呼气滑块变化
  onExhaleChange(e) {
    const tempRhythm = { ...this.data.tempRhythm }
    tempRhythm.exhale = e.detail.value
    this.setData({
      tempRhythm: tempRhythm
    })
  },

  // 保持滑块变化
  onHoldChange(e) {
    const tempRhythm = { ...this.data.tempRhythm }
    tempRhythm.hold = e.detail.value
    this.setData({
      tempRhythm: tempRhythm
    })
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
    // 检查是否已阅读安全须知（仅第一次）
    const hasReadSafety = wx.getStorageSync('hasReadSafety')
    if (!hasReadSafety) {
      // 显示安全须知弹窗
      this.setData({
        showSafetyModal: true
      })
      return
    }
    
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
  },

  // 安全须知相关方法
  toggleSafetyAgree() {
    this.setData({
      safetyAgreed: !this.data.safetyAgreed
    })
  },

  hideSafetyModal() {
    // 不允许通过点击背景关闭，必须确认
  },

  handleSafetyConfirm() {
    if (!this.data.safetyAgreed) {
      wx.showToast({
        title: '请先阅读并同意',
        icon: 'none'
      })
      return
    }

    // 保存已阅读状态
    wx.setStorageSync('hasReadSafety', true)
    
    // 关闭弹窗
    this.setData({
      showSafetyModal: false
    })
    
    // 确认后继续开始训练
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

  // 订阅相关方法
  showSubscribeModal() {
    this.setData({
      showSubscribeModal: true
    })
  },

  hideSubscribeModal() {
    this.setData({
      showSubscribeModal: false
    })
  },

  // 确保用户已登录（使用微信快捷登录）
  ensureLogin() {
    return new Promise((resolve, reject) => {
      // 检查是否已有用户信息
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo && userInfo.openid) {
        console.log('用户已登录', userInfo.openid)
        resolve(userInfo)
        return
      }

      // 检查云开发是否初始化
      if (!wx.cloud) {
        reject(new Error('云开发未初始化'))
        return
      }

      // 调用云函数获取 openid（微信快捷登录）
      wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'getOpenId'
        },
        success: (res) => {
          console.log('获取openid成功', res)
          if (res.result && res.result.openid) {
            // 保存用户信息到本地存储
            const userInfo = {
              openid: res.result.openid,
              appid: res.result.appid,
              unionid: res.result.unionid || ''
            }
            wx.setStorageSync('userInfo', userInfo)
            
            // 更新全局数据
            if (app.globalData) {
              app.globalData.userInfo = userInfo
            }
            
            console.log('登录成功，openid:', userInfo.openid)
            resolve(userInfo)
          } else {
            reject(new Error('未获取到 openid'))
          }
        },
        fail: (err) => {
          console.error('获取openid失败', err)
          reject(err)
        }
      })
    })
  },

  toggleSubscribe(e) {
    this.setData({
      subscribeEnabled: e.detail.value
    })
  },

  // 选择提醒频率
  selectFrequency(e) {
    const frequency = parseInt(e.currentTarget.dataset.frequency)
    const currentTimes = [...this.data.reminderTimes]
    
    // 根据新频率调整时间数组
    if (frequency < currentTimes.length) {
      // 减少频率，截取数组
      currentTimes.splice(frequency)
    } else if (frequency > currentTimes.length) {
      // 增加频率，添加空字符串，让用户必须选择时间
      for (let i = currentTimes.length; i < frequency; i++) {
        currentTimes.push('') // 不设置默认时间，用户必须手动选择
      }
    }
    
    this.setData({
      reminderFrequency: frequency,
      reminderTimes: currentTimes
    })
  },

  // 打开时间选择器
  openTimePicker(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    this.setData({
      currentTimeIndex: index,
      showTimePicker: true
    })
  },

  // 时间选择器变化
  onTimePickerChange(e) {
    const time = e.detail.value
    const times = [...this.data.reminderTimes]
    times[this.data.currentTimeIndex] = time
    this.setData({
      reminderTimes: times,
      showTimePicker: false
    })
  },

  // 关闭时间选择器
  hideTimePicker() {
    this.setData({
      showTimePicker: false
    })
  },

  async confirmSubscribe() {
    // 检查用户是否已登录
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo || !userInfo.openid) {
      // 用户未登录，先进行登录
      wx.showLoading({
        title: '正在登录...',
        mask: true
      })
      
      try {
        await this.ensureLogin()
        wx.hideLoading()
      } catch (err) {
        wx.hideLoading()
        console.error('登录失败', err)
        wx.showToast({
          title: '登录失败，请重试',
          icon: 'none'
        })
        return
      }
    }

    // 验证频率是否已选择
    if (!this.data.reminderFrequency || this.data.reminderFrequency < 1) {
      wx.showToast({
        title: '请选择提醒频率',
        icon: 'none'
      })
      return
    }

    // 验证时间是否都已设置（用户必须为每个频率选择具体时间）
    const times = this.data.reminderTimes.slice(0, this.data.reminderFrequency)
    const emptyTimes = times.filter(time => !time || !time.trim())
    
    if (emptyTimes.length > 0) {
      wx.showToast({
        title: `请设置所有${this.data.reminderFrequency}个提醒时间`,
        icon: 'none'
      })
      return
    }

    // 保存订阅设置（使用新的数据结构）
    const subscribeSettings = {
      enabled: true, // 默认开启
      frequency: this.data.reminderFrequency || 3, // 提醒频率：1、2、3
      times: times, // 具体提醒时间数组，如 ['09:00', '14:00', '20:00']
      type: 'daily', // 固定为每日
      reminderTimes: times.map(time => {
        // 将时间字符串转换为小时和分钟
        const [hour, minute] = time.split(':').map(Number)
        return { hour, minute }
      })
    }
    
    // 验证 subscribeSettings 对象是否完整
    if (!subscribeSettings.type || !subscribeSettings.frequency || !subscribeSettings.times) {
      console.error('订阅设置对象不完整', subscribeSettings)
      wx.showToast({
        title: '设置保存失败，请重试',
        icon: 'none'
      })
      return
    }
    
    wx.setStorageSync('subscribeSettings', subscribeSettings)
    
    // 调用订阅消息
    this.subscribeMessage(subscribeSettings)
    
    // 标记已显示过订阅
    wx.setStorageSync('hasShownSubscribe', true)
    
    // 关闭弹窗
    this.setData({
      showSubscribeModal: false
    })
    
    wx.showToast({
      title: '提醒计划已开启',
      icon: 'success'
    })
  },

  subscribeMessage(settings) {
    // 验证 settings 参数
    if (!settings || typeof settings !== 'object') {
      console.error('subscribeMessage: settings 参数无效', settings)
      wx.showToast({
        title: '设置参数错误',
        icon: 'none'
      })
      return
    }

    // 验证必要字段
    if (!settings.type || !settings.frequency || !settings.times) {
      console.error('subscribeMessage: settings 缺少必要字段', settings)
      wx.showToast({
        title: '设置不完整',
        icon: 'none'
      })
      return
    }

    // 调用微信订阅消息接口
    wx.requestSubscribeMessage({
      tmplIds: ['YUP2qo8lHFjeWTaJiEuBLSI0W_5zsYzPTEHmZ6tjZAQ'],
      success: async (res) => {
        console.log('订阅成功', res)
        
        // 保存订阅设置到云数据库
        try {
          const userInfo = wx.getStorageSync('userInfo')
          const openid = userInfo?.openid
          
          if (!openid) {
            console.error('未获取到 openid')
            return
          }
          
          const db = wx.cloud.database()
          
          // 查询是否已存在订阅设置
          // 注意：同时查询 openid 和 _openid，因为可能只有其中一个字段
          const existingByOpenid = await db.collection('subscribe_settings')
            .where({
              openid: openid
            })
            .get()
          
          const existingByOpenid2 = await db.collection('subscribe_settings')
            .where({
              _openid: openid
            })
            .get()
          
          // 合并查询结果，去重
          const allExisting = [...existingByOpenid.data, ...existingByOpenid.data]
          const uniqueExisting = allExisting.filter((item, index, self) => 
            index === self.findIndex(t => t._id === item._id)
          )
          
          const dataToSave = {
            enabled: settings.enabled !== undefined ? settings.enabled : true,
            frequency: settings.frequency,
            times: settings.times,
            reminderTimes: settings.reminderTimes,
            type: settings.type,
            subscribeResult: res,
            updateTime: db.serverDate()
          }
          
          // 确保 openid 字段存在
          if (!uniqueExisting.length || !uniqueExisting[0].openid) {
            dataToSave.openid = openid
          }
          
          console.log('[保存订阅] 准备保存的数据:', JSON.stringify(dataToSave, null, 2))
          
          if (uniqueExisting.length > 0) {
            // 更新现有记录
            const updateResult = await db.collection('subscribe_settings')
              .doc(uniqueExisting[0]._id)
              .update({
                data: dataToSave
              })
            console.log('[保存订阅] ✅ 更新记录成功, ID:', uniqueExisting[0]._id, '结果:', updateResult)
          } else {
            // 创建新记录
            dataToSave.openid = openid
            dataToSave.createTime = db.serverDate()
            const addResult = await db.collection('subscribe_settings')
              .add({
                data: dataToSave
              })
            console.log('[保存订阅] ✅ 创建记录成功, ID:', addResult._id)
          }
          
          // 验证保存是否成功：立即查询一次
          const verifyResult = await db.collection('subscribe_settings')
            .where({
              openid: openid
            })
            .get()
          
          if (verifyResult.data.length > 0) {
            console.log('[保存订阅] ✅ 验证成功，查询到记录:', verifyResult.data[0]._id)
            console.log('[保存订阅] 记录的 reminderTimes:', JSON.stringify(verifyResult.data[0].reminderTimes))
          } else {
            console.warn('[保存订阅] ⚠️ 验证失败，未查询到刚保存的记录，可能需要等待数据库同步')
          }
          
          console.log('订阅设置已保存到云数据库')
        } catch (err) {
          console.error('保存订阅设置失败', err)
        }
      },
      fail: (err) => {
        console.error('订阅失败', err)
      }
    })
  }
})
