// pages/training/index.js
Page({
  data: {
    totalDuration: 600, // 总时长（秒）
    remainingTime: 600, // 剩余时间（秒）
    elapsedTime: '00:00', // 已训练时长
    cycleCount: 0, // 完成循环数
    totalTime: '10:00', // 总时长显示
    timeDisplay: '10:00', // 剩余时间显示
    
    // 呼吸节奏
    inhale: 3, // 吸气秒数
    exhale: 6, // 呼气秒数
    hold: 2,   // 屏息秒数
    
    // 呼吸状态
    breathingState: 'inhale', // inhale, exhale, hold
    breathingText: '吸气',
    breathingCount: 3,
    breathingHint: '慢慢吸气...',
    breathScale: 1, // 呼吸动画缩放
    
    // 控制状态
    isPaused: false,
    isRunning: false,
    
    // 定时器
    timer: null,
    breathingTimer: null,
    inhaleTimer: null,
    holdTimer: null,
    exhaleTimer: null,
    progressCanvas: null
  },

  onLoad(options) {
    // 获取参数
    const duration = parseInt(options.duration) || 10
    let inhale = parseInt(options.inhale) || 3
    let exhale = parseInt(options.exhale) || 6
    let hold = parseInt(options.hold) || 2
    
    // 如果参数中没有，尝试从全局数据或本地存储获取
    if (!options.inhale) {
      const settings = wx.getStorageSync('trainingSettings')
      if (settings && settings.rhythm) {
        inhale = settings.rhythm.inhale || 3
        exhale = settings.rhythm.exhale || 6
        hold = settings.rhythm.hold || 2
      }
    }
    
    const totalSeconds = duration * 60
    
    this.setData({
      totalDuration: totalSeconds,
      remainingTime: totalSeconds,
      inhale: inhale,
      exhale: exhale,
      hold: hold,
      totalTime: this.formatTime(totalSeconds),
      timeDisplay: this.formatTime(totalSeconds),
      breathingCount: inhale
    })
    
    console.log('训练参数:', { duration, inhale, exhale, hold })
    
    // 初始化画布
    this.initCanvas()
    
    // 开始训练
    this.startTraining()
  },

  onUnload() {
    // 清理定时器
    this.clearTimers()
  },

  // 初始化进度环画布
  initCanvas() {
    const query = wx.createSelectorQuery().in(this)
    query.select('#progressCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) {
          console.error('Canvas 节点获取失败')
          return
        }
        
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        
        const dpr = wx.getSystemInfoSync().pixelRatio
        const width = res[0].width
        const height = res[0].height
        
        canvas.width = width * dpr
        canvas.height = height * dpr
        ctx.scale(dpr, dpr)
        
        this.setData({
          progressCanvas: { canvas, ctx, width, height }
        })
        
        this.drawProgress(1)
      })
  },

  // 绘制进度环
  drawProgress(progress) {
    const { progressCanvas } = this.data
    if (!progressCanvas || !progressCanvas.ctx) return
    
    const { ctx, width, height } = progressCanvas
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) / 2 - 20
    const lineWidth = 20
    
    // 清空画布
    ctx.clearRect(0, 0, width, height)
    
    // 绘制背景圆环
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.strokeStyle = '#D7E7F0'
    ctx.lineWidth = lineWidth
    ctx.stroke()
    
    // 绘制进度圆环
    if (progress > 0) {
      ctx.beginPath()
      const startAngle = -Math.PI / 2
      const endAngle = startAngle + Math.PI * 2 * progress
      
      // 创建渐变
      const gradient = ctx.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, '#82D0FF')
      gradient.addColorStop(1, '#76F5E3')
      
      ctx.arc(centerX, centerY, radius, startAngle, endAngle)
      ctx.strokeStyle = gradient
      ctx.lineWidth = lineWidth
      ctx.lineCap = 'round'
      ctx.stroke()
    }
  },

  // 开始训练
  startTraining() {
    this.setData({
      isRunning: true,
      isPaused: false
    })
    
    // 开始计时
    this.startTimer()
    
    // 开始呼吸引导
    this.startBreathing()
  },

  // 开始计时
  startTimer() {
    this.data.timer = setInterval(() => {
      if (this.data.isPaused) return
      
      let remaining = this.data.remainingTime - 1
      
      if (remaining <= 0) {
        // 训练完成
        this.completeTraining()
        return
      }
      
      const elapsed = this.data.totalDuration - remaining
      
      this.setData({
        remainingTime: remaining,
        timeDisplay: this.formatTime(remaining),
        elapsedTime: this.formatTime(elapsed),
        cycleCount: Math.floor(elapsed / (this.data.inhale + this.data.exhale + this.data.hold))
      })
      
      // 更新进度环
      const progress = remaining / this.data.totalDuration
      this.drawProgress(progress)
    }, 1000)
  },

  // 开始呼吸引导
  startBreathing() {
    this.breathingCycle()
  },

  // 呼吸循环
  breathingCycle() {
    if (!this.data.isRunning || this.data.isPaused) return
    
    // 吸气阶段
    this.startInhale()
    
    const inhaleTimer = setTimeout(() => {
      if (!this.data.isRunning || this.data.isPaused) return
      // 屏息阶段
      this.startHold()
      
      const holdTimer = setTimeout(() => {
        if (!this.data.isRunning || this.data.isPaused) return
        // 呼气阶段
        this.startExhale()
        
        const exhaleTimer = setTimeout(() => {
          if (this.data.isRunning && !this.data.isPaused) {
            // 继续下一个循环
            this.breathingCycle()
          }
        }, this.data.exhale * 1000)
        
        // 保存定时器以便清理
        this.data.exhaleTimer = exhaleTimer
      }, this.data.hold * 1000)
      
      this.data.holdTimer = holdTimer
    }, this.data.inhale * 1000)
    
    this.data.inhaleTimer = inhaleTimer
  },

  // 吸气阶段
  startInhale() {
    this.setData({
      breathingState: 'inhale',
      breathingText: '吸气',
      breathingCount: this.data.inhale,
      breathingHint: '慢慢吸气...',
      breathScale: 0.8
    })
    
    // 动画：缓慢放大
    this.animateBreath(0.8, 1.2, this.data.inhale)
  },

  // 屏息阶段
  startHold() {
    this.setData({
      breathingState: 'hold',
      breathingText: '屏息',
      breathingCount: this.data.hold,
      breathingHint: '保持...',
      breathScale: 1.2
    })
    
    // 屏息倒计时
    let count = this.data.hold
    const holdCountdown = setInterval(() => {
      if (!this.data.isRunning || this.data.isPaused || this.data.breathingState !== 'hold') {
        clearInterval(holdCountdown)
        return
      }
      count--
      if (count >= 0) {
        this.setData({ breathingCount: count })
      } else {
        clearInterval(holdCountdown)
      }
    }, 1000)
  },

  // 呼气阶段
  startExhale() {
    this.setData({
      breathingState: 'exhale',
      breathingText: '呼气',
      breathingCount: this.data.exhale,
      breathingHint: '慢慢呼气...',
      breathScale: 1.2
    })
    
    // 动画：缓慢缩小
    this.animateBreath(1.2, 0.8, this.data.exhale)
  },

  // 呼吸动画
  animateBreath(startScale, endScale, duration) {
    if (this.data.breathingTimer) {
      clearTimeout(this.data.breathingTimer)
    }
    
    const startTime = Date.now()
    const scaleDiff = endScale - startScale
    const frameInterval = 16 // 约60fps
    let lastCount = duration
    
    const animate = () => {
      if (!this.data.isRunning || this.data.isPaused) {
        if (this.data.breathingTimer) {
          clearTimeout(this.data.breathingTimer)
          this.data.breathingTimer = null
        }
        return
      }
      
      const elapsed = (Date.now() - startTime) / 1000
      const progress = Math.min(elapsed / duration, 1)
      
      // 使用缓动函数
      const easeProgress = 0.5 - Math.cos(progress * Math.PI) / 2
      const currentScale = startScale + scaleDiff * easeProgress
      
      // 更新倒计时
      const remaining = Math.ceil(duration - elapsed)
      if (remaining !== lastCount && remaining >= 0) {
        lastCount = remaining
        this.setData({ 
          breathScale: currentScale,
          breathingCount: remaining
        })
      } else {
        this.setData({ 
          breathScale: currentScale
        })
      }
      
      if (progress < 1) {
        this.data.breathingTimer = setTimeout(animate, frameInterval)
      } else {
        this.data.breathingTimer = null
      }
    }
    
    animate()
  },

  // 切换暂停/继续
  togglePause() {
    if (this.data.isPaused) {
      // 继续
      this.setData({
        isPaused: false
      })
      // 如果当前没有呼吸动画在运行，重新开始
      if (!this.data.breathingTimer && this.data.isRunning) {
        this.breathingCycle()
      }
    } else {
      // 暂停
      this.setData({
        isPaused: true
      })
    }
  },

  // 停止训练
  handleStop() {
    wx.showModal({
      title: '确认停止',
      content: '确定要停止本次训练吗？',
      success: (res) => {
        if (res.confirm) {
          this.clearTimers()
          wx.navigateBack()
        }
      }
    })
  },

  // 关闭页面
  handleClose() {
    if (this.data.isRunning) {
      wx.showModal({
        title: '确认退出',
        content: '训练正在进行中，确定要退出吗？',
        success: (res) => {
          if (res.confirm) {
            this.clearTimers()
            wx.navigateBack()
          }
        }
      })
    } else {
      wx.navigateBack()
    }
  },

  // 完成训练
  completeTraining() {
    this.clearTimers()
    
    // 保存训练记录
    this.saveTrainingRecord()
    
    // 跳转到完成页
    wx.redirectTo({
      url: `/pages/complete/index?duration=${this.data.totalDuration}&elapsed=${this.data.totalDuration}&cycles=${this.data.cycleCount}`
    })
  },

  // 保存训练记录
  saveTrainingRecord() {
    const db = wx.cloud.database()
    const trainingRecord = {
      duration: this.data.totalDuration,
      elapsedTime: this.data.totalDuration,
      cycleCount: this.data.cycleCount,
      rhythm: {
        inhale: this.data.inhale,
        exhale: this.data.exhale,
        hold: this.data.hold
      },
      date: new Date(),
      createTime: db.serverDate()
    }
    
    db.collection('training_records').add({
      data: trainingRecord,
      success: () => {
        console.log('训练记录保存成功')
      },
      fail: (err) => {
        console.error('训练记录保存失败', err)
      }
    })
  },

  // 清理定时器
  clearTimers() {
    if (this.data.timer) {
      clearInterval(this.data.timer)
    }
    if (this.data.breathingTimer) {
      clearTimeout(this.data.breathingTimer)
    }
    if (this.data.inhaleTimer) {
      clearTimeout(this.data.inhaleTimer)
    }
    if (this.data.holdTimer) {
      clearTimeout(this.data.holdTimer)
    }
    if (this.data.exhaleTimer) {
      clearTimeout(this.data.exhaleTimer)
    }
    this.setData({
      isRunning: false,
      timer: null,
      breathingTimer: null,
      inhaleTimer: null,
      holdTimer: null,
      exhaleTimer: null
    })
  },

  // 格式化时间
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
})
