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
    inhale: 6, // 吸气秒数
    exhale: 4, // 呼气秒数
    hold1: 4,   // 保持秒数（吸气后）
    hold2: 0,   // 保持秒数（呼气后）
    
    // 呼吸状态
    breathingState: 'inhale', // inhale, exhale, hold
    breathingText: '吸气',
    breathingCount: 3,
    // breathingHint: '慢慢吸气...',
    breathScale: 0.8, // 呼吸动画缩放
    breathingDuration: 3, // 当前呼吸阶段的动画时长（秒）
    
    // 控制状态
    isPaused: false,
    isRunning: false,
    
    // 定时器
    timer: null,
    countdownTimer: null,
    inhaleTimer: null,
    holdTimer: null,
    holdTimer2: null,
    exhaleTimer: null,
    progressCanvas: null,
    completionHandled: false,
    voiceOn: true,
    showIntroTip: false,
    preStartActive: false,
    preStartCount: 0,
    preStartTimer: null,
    preStartTimeout: null,
    preStartTip: '调整呼吸，放松身心。'
  },

  onLoad(options) {
    this.initVoicePlayer()
    const voiceSaved = wx.getStorageSync('trainingVoiceOn')
    if (voiceSaved === false) {
      this.setData({ voiceOn: false })
    }

    // 保持屏幕常亮，避免训练时息屏
    wx.setKeepScreenOn({
      keepScreenOn: true,
      success: () => {
        console.log('屏幕常亮已开启')
      },
      fail: (err) => {
        console.error('开启屏幕常亮失败', err)
      }
    })
    
    // 获取参数
    const duration = parseInt(options.duration) || 10
    const hasOpt = (v) => v !== undefined && v !== null && v !== ''
    let inhale = hasOpt(options.inhale) ? parseInt(options.inhale) : 6
    let exhale = hasOpt(options.exhale) ? parseInt(options.exhale) : 4
    const legacyHold = hasOpt(options.hold) ? parseInt(options.hold) : undefined
    let hold1 = hasOpt(options.hold1) ? parseInt(options.hold1) : (legacyHold !== undefined ? legacyHold : 4)
    let hold2 = hasOpt(options.hold2) ? parseInt(options.hold2) : (legacyHold !== undefined ? legacyHold : 0)
    
    // 如果参数中没有，尝试从全局数据或本地存储获取
    if (!hasOpt(options.inhale)) {
      const settings = wx.getStorageSync('trainingSettings')
      if (settings && settings.rhythm) {
        inhale = hasOpt(settings.rhythm.inhale) ? settings.rhythm.inhale : 6
        exhale = hasOpt(settings.rhythm.exhale) ? settings.rhythm.exhale : 4
        const sr = settings.rhythm
        const shLegacy = hasOpt(sr.hold) ? sr.hold : undefined
        hold1 = hasOpt(sr.hold1) ? sr.hold1 : (shLegacy !== undefined ? shLegacy : 4)
        hold2 = hasOpt(sr.hold2) ? sr.hold2 : (shLegacy !== undefined ? shLegacy : 0)
      }
    }
    
    const totalSeconds = duration * 60
    
    this.setData({
      totalDuration: totalSeconds,
      remainingTime: totalSeconds,
      inhale: inhale,
      exhale: exhale,
      hold1: hold1,
      hold2: hold2,
      totalTime: this.formatTime(totalSeconds),
      timeDisplay: this.formatTime(totalSeconds),
      breathingCount: inhale
    })
    
    console.log('训练参数:', { duration, inhale, exhale, hold1, hold2 })
    
    // 初始化画布
    this.initCanvas()

    this.startPreStart()
  },

  onUnload() {
    // 关闭屏幕常亮
    wx.setKeepScreenOn({
      keepScreenOn: false,
      success: () => {
        console.log('屏幕常亮已关闭')
      },
      fail: (err) => {
        console.error('关闭屏幕常亮失败', err)
      }
    })
    
    // 清理定时器
    this.clearTimers()
    this.stopAndDestroyVoicePlayer()
  },

  startPreStart() {
    // 防止重复启动
    if (this.data.preStartActive) return

    // 预倒计时期间不开始训练
    this.setData({
      preStartActive: true,
      preStartCount: 3,
      preStartTip: '调整呼吸，放松身心。',
      isRunning: false,
      isPaused: false
    })

    const stepMs = 2000
    const t = setInterval(() => {
      const next = this.data.preStartCount - 1
      if (next < 0) return
      if (next === 0) {
        clearInterval(t)
        this.setData({ preStartCount: 0, preStartTimer: null, preStartTip: '调整呼吸，放松身心。' })
        const timeout = setTimeout(() => {
          this.setData({ preStartActive: false, preStartTimeout: null })
          this.startTraining()
        }, stepMs)
        this.setData({ preStartTimeout: timeout })
        return
      }
      const tipMap = {
        2: '吸气，腹部轻轻鼓起。',
        1: '呼气，腹部缓缓收回。'
      }
      this.setData({ preStartCount: next, preStartTip: tipMap[next] || '调整呼吸，放松身心。' })
    }, stepMs)

    this.setData({ preStartTimer: t })
  },

  // 初始化语音播放器
  initVoicePlayer() {
    if (wx.setInnerAudioOption) {
      wx.setInnerAudioOption({
        obeyMuteSwitch: false,
        mixWithOther: true
      })
    }
    this.voicePlayer = wx.createInnerAudioContext()
    this.voicePlayer.autoplay = false
  },

  // 停止并销毁语音播放器
  stopAndDestroyVoicePlayer() {
    if (!this.voicePlayer) return
    try {
      this.voicePlayer.stop()
      this.voicePlayer.offEnded()
      this.voicePlayer.offError()
      this.voicePlayer.destroy()
    } catch (err) {
      console.warn('销毁语音播放器失败', err)
    }
    this.voicePlayer = null
  },

  // 播放阶段语音
  playVoiceByStage(stage, options = {}) {
    const { onEnded } = options
    if (!this.data.voiceOn) {
      if (typeof onEnded === 'function') onEnded()
      return
    }
    if (!this.voicePlayer) return

    const audioMap = {
      inhale: '/assets/audio/xiqi.mp3',
      exhale: '/assets/audio/huqi.mp3',
      hold: '/assets/audio/hold.mp3',
      complete: '/assets/audio/complete.mp3'
    }
    const src = audioMap[stage]
    if (!src) return

    this.voicePlayer.stop()
    this.voicePlayer.src = src
    this.voicePlayer.offEnded()
    this.voicePlayer.offError()

    if (typeof onEnded === 'function') {
      this.voicePlayer.onEnded(() => {
        onEnded()
      })
    }

    this.voicePlayer.onError((err) => {
      console.error('语音播放失败', err)
      if (typeof onEnded === 'function') onEnded()
    })
    this.voicePlayer.play()
  },

  toggleVoice() {
    const voiceOn = !this.data.voiceOn
    this.setData({ voiceOn })
    wx.setStorageSync('trainingVoiceOn', voiceOn)
    if (!voiceOn && this.voicePlayer) {
      try {
        this.voicePlayer.stop()
      } catch (e) {}
    }
  },

  openIntroTip() {
    this.setData({ showIntroTip: true, progressCanvas: null })
  },

  closeIntroTip() {
    this.setData({ showIntroTip: false }, () => {
      const run = wx.nextTick || ((fn) => setTimeout(fn, 0))
      run(() => this.initCanvas())
    })
  },

  noop() {},

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

        const td = this.data.totalDuration
        const progress = td > 0 ? this.data.remainingTime / td : 1
        this.drawProgress(progress)
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
      isPaused: false,
      completionHandled: false
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
      if (remaining < 0) remaining = 0

      const elapsed = this.data.totalDuration - remaining
      
      // 一个完整循环：吸气 + (保持) + 呼气 + (保持)
      const hold1 = this.data.hold1 > 0 ? this.data.hold1 : 0
      const hold2 = this.data.hold2 > 0 ? this.data.hold2 : 0
      const cycleDuration = this.data.inhale + this.data.exhale + hold1 + hold2
      
      this.setData({
        remainingTime: remaining,
        timeDisplay: this.formatTime(remaining),
        elapsedTime: this.formatTime(elapsed),
        cycleCount: Math.floor(elapsed / cycleDuration)
      })
      
      // 更新进度环
      const progress = remaining / this.data.totalDuration
      this.drawProgress(progress)

      if (remaining <= 0) {
        // 训练完成（确保 UI 先显示到 00:00）
        const run = wx.nextTick || ((fn) => setTimeout(fn, 0))
        run(() => this.completeTraining())
      }
    }, 1000)
  },

  // 开始呼吸引导
  startBreathing() {
    this.breathingCycle()
  },

  // 呼吸循环：吸气-保持-呼气-保持-吸气...
  breathingCycle() {
    if (!this.data.isRunning || this.data.isPaused) return
    
    if (this.data.hold1 <= 0 && this.data.hold2 <= 0) {
      // 无保持：吸气-呼气 循环
      this.startInhale()
      const inhaleTimer = setTimeout(() => {
        if (!this.data.isRunning || this.data.isPaused) return
        this.startExhale()
        const exhaleTimer = setTimeout(() => {
          if (this.data.isRunning && !this.data.isPaused) {
            this.breathingCycle()
          }
        }, this.data.exhale * 1000)
        this.data.exhaleTimer = exhaleTimer
      }, this.data.inhale * 1000)
      this.data.inhaleTimer = inhaleTimer
      return
    }

    // 吸气阶段
    this.startInhale()
    
    const inhaleTimer = setTimeout(() => {
      if (!this.data.isRunning || this.data.isPaused) return
      // 保持阶段（吸气后）
      this.startHold(this.data.hold1)
      
      const holdTimer1 = setTimeout(() => {
        if (!this.data.isRunning || this.data.isPaused) return
        // 呼气阶段
        this.startExhale()

        const exhaleTimer = setTimeout(() => {
          if (!this.data.isRunning || this.data.isPaused) return
          // 保持阶段（呼气后）
          this.startHold(this.data.hold2)

          const holdTimer2 = setTimeout(() => {
            if (this.data.isRunning && !this.data.isPaused) {
              // 继续下一个循环
              this.breathingCycle()
            }
          }, this.data.hold2 * 1000)

          this.data.holdTimer2 = holdTimer2
        }, this.data.exhale * 1000)

        // 保存定时器以便清理
        this.data.exhaleTimer = exhaleTimer
      }, this.data.hold1 * 1000)
      
      this.data.holdTimer = holdTimer1
    }, this.data.inhale * 1000)
    
    this.data.inhaleTimer = inhaleTimer
  },

  // 吸气阶段
  startInhale() {
    // 先设置起始scale，然后立即设置结束scale，让CSS transition自动处理动画
    this.setData({
      breathingState: 'inhale',
      breathingText: '吸气',
      breathingCount: this.data.inhale,
      // breathingHint: '慢慢吸气...',
      breathScale: 0.8,
      breathingDuration: this.data.inhale
    })
    this.playVoiceByStage('inhale')
    
    // 使用setTimeout确保CSS transition生效
    setTimeout(() => {
      this.setData({
        breathScale: 1.2
      })
    }, 50)
    
    // 倒计时更新
    this.startCountdown(this.data.inhale)
  },

  // 保持阶段（无动画，保持当前scale）
  startHold(durationSeconds) {
    const duration = typeof durationSeconds === 'number' ? durationSeconds : this.data.hold1
    if (!duration || duration <= 0) return
    // 保持当前scale不变，不添加动画
    this.setData({
      breathingState: 'hold',
      breathingText: '保持',
      breathingCount: duration,
      // breathingHint: '保持...',
      breathingDuration: 0 // 无动画
      // breathScale 保持不变，不更新
    })
    this.playVoiceByStage('hold')
    
    // 倒计时更新
    this.startCountdown(duration)
  },

  // 呼气阶段
  startExhale() {
    // 先设置起始scale，然后立即设置结束scale，让CSS transition自动处理动画
    this.setData({
      breathingState: 'exhale',
      breathingText: '呼气',
      breathingCount: this.data.exhale,
      // breathingHint: '慢慢呼气...',
      breathScale: 1.2,
      breathingDuration: this.data.exhale
    })
    this.playVoiceByStage('exhale')
    
    // 使用setTimeout确保CSS transition生效
    setTimeout(() => {
      this.setData({
        breathScale: 0.8
      })
    }, 50)
    
    // 倒计时更新
    this.startCountdown(this.data.exhale)
  },

  // 倒计时更新（独立于动画）
  startCountdown(duration) {
    // 清除之前的倒计时
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer)
    }
    
    let count = duration
    this.setData({ breathingCount: count })
    
    this.data.countdownTimer = setInterval(() => {
      if (!this.data.isRunning || this.data.isPaused) {
        if (this.data.countdownTimer) {
          clearInterval(this.data.countdownTimer)
          this.data.countdownTimer = null
        }
        return
      }
      
      count--
      if (count >= 0) {
        this.setData({ breathingCount: count })
      } else {
        if (this.data.countdownTimer) {
          clearInterval(this.data.countdownTimer)
          this.data.countdownTimer = null
        }
      }
    }, 1000)
  },

  // 切换暂停/继续
  togglePause() {
    if (this.data.preStartActive) return
    if (this.data.isPaused) {
      // 继续
      this.setData({
        isPaused: false
      })
      // 重新开始呼吸循环
      if (this.data.isRunning) {
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
    if (this.data.preStartTimer) {
      clearInterval(this.data.preStartTimer)
      this.setData({ preStartTimer: null })
    }
    if (this.data.preStartTimeout) {
      clearTimeout(this.data.preStartTimeout)
      this.setData({ preStartTimeout: null })
    }
    wx.showModal({
      title: '确认停止',
      content: '确定要停止本次训练吗？',
      success: (res) => {
        if (res.confirm) {
          this.clearTimers()
          this.stopAndDestroyVoicePlayer()
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
            this.stopAndDestroyVoicePlayer()
            wx.navigateBack()
          }
        }
      })
    } else {
      this.stopAndDestroyVoicePlayer()
      wx.navigateBack()
    }
  },

  // 完成训练
  completeTraining() {
    if (this.data.completionHandled) return
    this.setData({ completionHandled: true })

    this.clearTimers()
    
    // 保存训练记录，等待保存完成后再跳转
    this.saveTrainingRecord(() => {
      this.playVoiceByStage('complete', {
        onEnded: () => {
          // 跳转到完成页
          wx.redirectTo({
            url: `/pages/complete/index?duration=${this.data.totalDuration}&elapsed=${this.data.totalDuration}&cycles=${this.data.cycleCount}`
          })
        }
      })
    })
  },

  // 保存训练记录
  saveTrainingRecord(callback) {
    // 检查云开发是否初始化
    if (!wx.cloud) {
      console.error('云开发未初始化')
      // 即使云开发未初始化，也继续跳转
      if (callback) callback()
      return
    }

    try {
      const db = wx.cloud.database()
      const trainingRecord = {
        duration: this.data.totalDuration,
        elapsedTime: this.data.totalDuration,
        cycleCount: this.data.cycleCount,
        rhythm: {
          inhale: this.data.inhale,
          exhale: this.data.exhale,
          hold1: this.data.hold1,
          hold2: this.data.hold2,
          hold: this.data.hold1
        },
        date: new Date(),
        createTime: db.serverDate()
      }
      
      db.collection('training_records').add({
        data: trainingRecord,
        success: () => {
          console.log('训练记录保存成功')
          // 保存成功后执行回调
          if (callback) callback()
        },
        fail: (err) => {
          console.error('训练记录保存失败', err)
          // 如果是 access_token 错误，提示用户
          if (err.errMsg && err.errMsg.includes('access_token')) {
            console.error('云开发环境未正确初始化，请检查：')
            console.error('1. 是否已开通云开发')
            console.error('2. 环境ID是否正确')
            console.error('3. 是否已部署 quickstartFunctions 云函数')
          }
          // 即使保存失败，也继续跳转
          if (callback) callback()
        }
      })
    } catch (err) {
      console.error('保存训练记录异常', err)
      // 即使异常，也继续跳转
      if (callback) callback()
    }
  },

  // 清理定时器
  clearTimers() {
    if (this.data.timer) {
      clearInterval(this.data.timer)
    }
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer)
    }
    if (this.data.inhaleTimer) {
      clearTimeout(this.data.inhaleTimer)
    }
    if (this.data.holdTimer) {
      clearTimeout(this.data.holdTimer)
    }
    if (this.data.holdTimer2) {
      clearTimeout(this.data.holdTimer2)
    }
    if (this.data.exhaleTimer) {
      clearTimeout(this.data.exhaleTimer)
    }
    if (this.data.preStartTimer) {
      clearInterval(this.data.preStartTimer)
    }
    this.setData({
      isRunning: false,
      timer: null,
      countdownTimer: null,
      inhaleTimer: null,
      holdTimer: null,
      holdTimer2: null,
      exhaleTimer: null
      ,
      preStartTimer: null
    })
  },

  // 格式化时间
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
})
