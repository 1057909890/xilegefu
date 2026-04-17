// pages/home/index.js
const app = getApp()

Page({
  data: {
    duration: 10,
    timeDisplay: '10:00',
    soundMode: 'mute',
    vibrationEnabled: false,
    showSoundSettingsModal: false,
    tempSoundMode: 'mute',
    tempVibrationEnabled: false,
    rhythm: {
      inhale: 6,
      exhale: 4,
      hold1: 4,
      hold2: 0
    },
    showTimePicker: false,
    showRhythmEditor: false,
    tempRhythm: {
      inhale: 6,
      exhale: 4,
      hold1: 4,
      hold2: 0
    },
    showSafetyModal: false,
    safetyAgreed: false,
    showPhoneLoginModal: false,
    showSubscribeModal: false,
    subscribeEnabled: true,
    reminderFrequency: 1, // 提醒频率：1、2、3次，默认为1
    reminderTimes: [], // 具体提醒时间，完全由用户选择，初始为空
    showTimePicker: false, // 练习时长选择器显示状态
    currentTimeIndex: 0, // 当前正在编辑的时间索引
    timeSectionZIndex: 4, // 时间显示区域的 z-index，弹窗打开时会动态调整
    particles: [], // 粒子数组
    showBreathInfoModal: false,
    breathInfoNodes: []
  },

  onLoad(options) {
    try {
      // 安全须知不在首页自动显示，只在点击开始按钮时检查
      
      // 初始化粒子
      this.initParticles()

      this.ensureShareMenu()

      // 从全局数据或本地存储加载设置
      const settings = wx.getStorageSync('trainingSettings')
      const vibrationKey = wx.getStorageSync('trainingVibrationEnabled')
      if (settings) {
        const sr = settings.rhythm || {}
        const hold1 = sr.hold1 !== undefined ? sr.hold1 : (sr.hold !== undefined ? sr.hold : 4)
        const hold2 = sr.hold2 !== undefined ? sr.hold2 : (sr.hold !== undefined ? sr.hold : 0)
        const soundMode = this.normalizeSoundMode(settings.soundMode)
        this.setData({
          duration: settings.duration || 10,
          soundMode,
          vibrationEnabled: vibrationKey !== '' && vibrationKey !== undefined
            ? !!vibrationKey
            : (settings.vibrationEnabled !== undefined ? settings.vibrationEnabled : false),
          rhythm: {
            inhale: sr.inhale !== undefined ? sr.inhale : 6,
            exhale: sr.exhale !== undefined ? sr.exhale : 4,
            hold1,
            hold2
          },
          timeDisplay: this.formatTime(settings.duration || 10)
        })
      } else {
        // 使用默认值
        const defaultDuration = app.globalData.trainingSettings.duration || 10
        const gr = (app.globalData.trainingSettings && app.globalData.trainingSettings.rhythm) || {}
        const hold1 = gr.hold1 !== undefined ? gr.hold1 : (gr.hold !== undefined ? gr.hold : 4)
        const hold2 = gr.hold2 !== undefined ? gr.hold2 : (gr.hold !== undefined ? gr.hold : 0)
        const globalSoundMode = app.globalData.trainingSettings && app.globalData.trainingSettings.soundMode
        const soundMode = this.normalizeSoundMode(globalSoundMode)
        this.setData({
          duration: defaultDuration,
          soundMode,
          vibrationEnabled: (app.globalData.trainingSettings && app.globalData.trainingSettings.vibrationEnabled) !== undefined
            ? app.globalData.trainingSettings.vibrationEnabled
            : false,
          rhythm: {
            inhale: gr.inhale !== undefined ? gr.inhale : 6,
            exhale: gr.exhale !== undefined ? gr.exhale : 4,
            hold1,
            hold2
          },
          timeDisplay: this.formatTime(defaultDuration)
        })
      }

      const sectionLabelWrap = 'display:flex;align-items:center;gap:14rpx;margin:18rpx 0 16rpx;'
      const sectionBarBlue = 'width:6rpx;height:34rpx;border-radius:6rpx;background:rgba(94,200,255,0.95);'
      const sectionBarYellow = 'width:6rpx;height:34rpx;border-radius:6rpx;background:rgba(255,204,0,0.90);'
      const sectionBarGreen = 'width:6rpx;height:34rpx;border-radius:6rpx;background:rgba(92,255,185,0.85);'
      const sectionLabelText = 'font-size:30rpx;font-weight:800;color:rgba(255,255,255,0.92);line-height:1.1;letter-spacing:1rpx;'

      const paragraphStyle = 'font-size:30rpx;color:rgba(255,255,255,0.82);line-height:2.15;'
      const paragraphMutedStyle = 'font-size:28rpx;color:rgba(255,255,255,0.72);line-height:2.1;'

      const glassCard = 'background:rgba(255,255,255,0.05);border:1rpx solid rgba(255,255,255,0.10);border-radius:28rpx;padding:26rpx 24rpx;margin-bottom:18rpx;'
      const rowCard = glassCard + 'display:flex;gap:20rpx;align-items:flex-start;'
      const iconBox = 'width:88rpx;height:88rpx;border-radius:24rpx;background:rgba(255,255,255,0.06);border:1rpx solid rgba(255,255,255,0.10);display:flex;align-items:center;justify-content:center;flex-shrink:0;'
      const iconText = 'font-size:42rpx;line-height:1;'
      const cardTitle = 'font-size:32rpx;font-weight:850;color:#FFFFFF;line-height:1.35;margin-bottom:12rpx;'
      const cardBody = paragraphStyle + 'white-space:pre-wrap;'
      const metaLine = 'font-size:24rpx;color:rgba(255,255,255,0.55);line-height:1.2;margin-bottom:10rpx;'

      const breathInfoNodes = [
        { name: 'div', attrs: { style: 'padding:0 2rpx;' }, children: [
          { name: 'div', attrs: { style: 'font-size:40rpx;font-weight:900;color:#FFFFFF;line-height:1.25;margin:2rpx 0 18rpx;' }, children: [{ type: 'text', text: '腹式呼吸' }] },

          { name: 'div', attrs: { style: sectionLabelWrap }, children: [
            { name: 'div', attrs: { style: sectionBarBlue }, children: [] },
            { name: 'div', attrs: { style: sectionLabelText }, children: [{ type: 'text', text: '原理' }] }
          ] },

          { name: 'div', attrs: { style: glassCard }, children: [
            { name: 'div', attrs: { style: paragraphStyle }, children: [{ type: 'text', text: '腹式呼吸（Diaphragmatic Breathing）并不是“玄学”，它来源于多个被验证的科学领域：' }] }
          ] },

          { name: 'div', attrs: { style: rowCard }, children: [
            { name: 'div', attrs: { style: iconBox }, children: [{ name: 'span', attrs: { style: iconText }, children: [{ type: 'text', text: '🫁' }] }] },
            { name: 'div', attrs: { style: 'flex:1;min-width:0;' }, children: [
              { name: 'div', attrs: { style: cardTitle }, children: [{ type: 'text', text: '呼吸生理学' }] },
              { name: 'div', attrs: { style: cardBody }, children: [{ type: 'text', text: '研究表明，横膈膜主导的深呼吸能提高肺泡通气效率，改善氧气交换。' }] }
            ] }
          ] },
          { name: 'div', attrs: { style: rowCard }, children: [
            { name: 'div', attrs: { style: iconBox }, children: [{ name: 'span', attrs: { style: iconText }, children: [{ type: 'text', text: '🧘' }] }] },
            { name: 'div', attrs: { style: 'flex:1;min-width:0;' }, children: [
              { name: 'div', attrs: { style: cardTitle }, children: [{ type: 'text', text: '副交感神经系统调节机制' }] },
              { name: 'div', attrs: { style: cardBody }, children: [{ type: 'text', text: '缓慢深呼吸可以激活“放松系统”，降低心率与压力水平。' }] }
            ] }
          ] },
          { name: 'div', attrs: { style: rowCard }, children: [
            { name: 'div', attrs: { style: iconBox }, children: [{ name: 'span', attrs: { style: iconText }, children: [{ type: 'text', text: '📈' }] }] },
            { name: 'div', attrs: { style: 'flex:1;min-width:0;' }, children: [
              { name: 'div', attrs: { style: cardTitle }, children: [{ type: 'text', text: '心率变异性（HRV）研究' }] },
              { name: 'div', attrs: { style: cardBody }, children: [{ type: 'text', text: '节律性呼吸（约 4–6 次/分钟）能显著提升 HRV，代表身体恢复能力增强。' }] }
            ] }
          ] },
          { name: 'div', attrs: { style: rowCard }, children: [
            { name: 'div', attrs: { style: iconBox }, children: [{ name: 'span', attrs: { style: iconText }, children: [{ type: 'text', text: '🏛️' }] }] },
            { name: 'div', attrs: { style: 'flex:1;min-width:0;' }, children: [
              { name: 'div', attrs: { style: cardTitle }, children: [{ type: 'text', text: '哈佛医学院 / 美国国立卫生研究院相关研究' }] },
              { name: 'div', attrs: { style: cardBody }, children: [{ type: 'text', text: '均指出深呼吸训练可用于缓解焦虑、改善睡眠和降低慢性压力。' }] }
            ] }
          ] },

          { name: 'div', attrs: { style: 'background:rgba(94,200,255,0.08);border:1rpx solid rgba(94,200,255,0.20);border-radius:28rpx;padding:26rpx 24rpx;margin:6rpx 0 26rpx;' }, children: [
            { name: 'div', attrs: { style: metaLine }, children: [{ type: 'text', text: '简单总结一句话' }] },
            { name: 'div', attrs: { style: paragraphStyle }, children: [{ type: 'text', text: '慢 + 深 + 有节奏的呼吸 = 身体从“紧张模式”切换到“恢复模式”' }] }
          ] },

          { name: 'div', attrs: { style: sectionLabelWrap }, children: [
            { name: 'div', attrs: { style: sectionBarGreen }, children: [] },
            { name: 'div', attrs: { style: sectionLabelText }, children: [{ type: 'text', text: '练习步骤' }] }
          ] },

          { name: 'div', attrs: { style: glassCard }, children: [
            { name: 'div', attrs: { style: paragraphMutedStyle + 'white-space:pre-wrap;' }, children: [{ type: 'text', text: '标准节奏版 4-4-6\n吸气 4 秒 / 停顿 4 秒 / 呼气 6 秒' }] }
          ] },

          { name: 'div', attrs: { style: rowCard }, children: [
            { name: 'div', attrs: { style: iconBox }, children: [{ name: 'span', attrs: { style: iconText }, children: [{ type: 'text', text: '🖐️' }] }] },
            { name: 'div', attrs: { style: 'flex:1;min-width:0;' }, children: [
              { name: 'div', attrs: { style: metaLine }, children: [{ type: 'text', text: '准备开始' }] },
              { name: 'div', attrs: { style: cardBody }, children: [{ type: 'text', text: '把一只手放在胸口，一只手放在腹部\n让注意力慢慢回到呼吸上' }] }
            ] }
          ] },

          { name: 'div', attrs: { style: rowCard }, children: [
            { name: 'div', attrs: { style: iconBox }, children: [{ name: 'span', attrs: { style: iconText }, children: [{ type: 'text', text: '🌬️' }] }] },
            { name: 'div', attrs: { style: 'flex:1;min-width:0;' }, children: [
              { name: 'div', attrs: { style: metaLine }, children: [{ type: 'text', text: '步骤 1' }] },
              { name: 'div', attrs: { style: cardTitle }, children: [{ type: 'text', text: '吸气（4秒）' }] },
              { name: 'div', attrs: { style: cardBody }, children: [{ type: 'text', text: '慢慢吸气……\n让空气进入腹部\n感受小腹轻轻鼓起' }] }
            ] }
          ] },

          { name: 'div', attrs: { style: rowCard }, children: [
            { name: 'div', attrs: { style: iconBox }, children: [{ name: 'span', attrs: { style: iconText }, children: [{ type: 'text', text: '⏸️' }] }] },
            { name: 'div', attrs: { style: 'flex:1;min-width:0;' }, children: [
              { name: 'div', attrs: { style: metaLine }, children: [{ type: 'text', text: '步骤 2' }] },
              { name: 'div', attrs: { style: cardTitle }, children: [{ type: 'text', text: '停顿（4秒）' }] },
              { name: 'div', attrs: { style: cardBody }, children: [{ type: 'text', text: '保持呼吸\n不要用力\n让身体自然停留' }] }
            ] }
          ] },

          { name: 'div', attrs: { style: rowCard }, children: [
            { name: 'div', attrs: { style: iconBox }, children: [{ name: 'span', attrs: { style: iconText }, children: [{ type: 'text', text: '💨' }] }] },
            { name: 'div', attrs: { style: 'flex:1;min-width:0;' }, children: [
              { name: 'div', attrs: { style: metaLine }, children: [{ type: 'text', text: '步骤 3' }] },
              { name: 'div', attrs: { style: cardTitle }, children: [{ type: 'text', text: '呼气（6秒）' }] },
              { name: 'div', attrs: { style: cardBody }, children: [{ type: 'text', text: '缓缓呼气……\n让腹部慢慢回落\n释放身体的紧张' }] }
            ] }
          ] },

          { name: 'div', attrs: { style: glassCard }, children: [
            { name: 'div', attrs: { style: metaLine }, children: [{ type: 'text', text: '循环提示' }] },
            { name: 'div', attrs: { style: paragraphStyle + 'white-space:pre-wrap;' }, children: [{ type: 'text', text: '继续\n吸气……停……呼气……' }] }
          ] },

          { name: 'div', attrs: { style: paragraphStyle + 'white-space:pre-wrap;margin:8rpx 0 6rpx;padding:0 4rpx;' }, children: [{ type: 'text', text: '每一次呼吸\n都让身体更放松一点' }] }
        ] }
      ]
      this.setData({ breathInfoNodes })
    } catch (err) {
      console.error('home onLoad error', (err && (err.stack || err.message || err.errMsg)) || err)
    }
  },

  showSoundSettings() {
    this.setData({
      showSoundSettingsModal: true,
      timeSectionZIndex: 0,
      tempSoundMode: this.normalizeSoundMode(this.data.soundMode),
      tempVibrationEnabled: this.data.vibrationEnabled
    })
  },

  hideSoundSettings() {
    this.setData({
      showSoundSettingsModal: false,
      timeSectionZIndex: 4
    })
  },

  selectSoundMode(e) {
    const mode = e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.mode : ''
    if (!mode) return
    this.setData({ tempSoundMode: mode })
  },

  onVibrationToggle(e) {
    const enabled = !!(e && e.detail && e.detail.value)
    this.setData({ tempVibrationEnabled: enabled })
    if (enabled) this.triggerHaptic()
  },

  onTestVibrationTap() {
    wx.showToast({ title: '已触发震动测试', icon: 'none' })
    this.triggerHaptic(true)
  },

  cancelSoundSettings() {
    this.hideSoundSettings()
  },

  saveSoundSettings() {
    const soundMode = this.normalizeSoundMode(this.data.tempSoundMode)
    const vibrationEnabled = this.data.tempVibrationEnabled
    this.setData({ soundMode, vibrationEnabled })
    this.persistTrainingSettings({ soundMode, vibrationEnabled })
    wx.setStorageSync('trainingVibrationEnabled', vibrationEnabled)
    this.hideSoundSettings()
  },

  normalizeSoundMode(mode) {
    if (mode === 'voice' || mode === 'bowl') return mode
    return 'mute'
  },

  triggerHaptic(showError = false) {
    let fallbackTried = false
    const tryLongFallback = () => {
      if (fallbackTried) return
      fallbackTried = true
      if (wx.vibrateLong) {
        wx.vibrateLong({
          fail: () => {
            if (showError) wx.showToast({ title: '系统未响应震动', icon: 'none' })
          }
        })
      } else if (showError) {
        wx.showToast({ title: '当前设备不支持震动', icon: 'none' })
      }
    }

    if (wx.vibrateShort) {
      wx.vibrateShort({ type: 'heavy', fail: tryLongFallback })
      setTimeout(() => wx.vibrateShort({ type: 'medium', fail: tryLongFallback }), 120)
      setTimeout(() => tryLongFallback(), 260)
      return
    }

    tryLongFallback()
  },

  persistTrainingSettings(partial) {
    const settings = wx.getStorageSync('trainingSettings') || {}
    const merged = { ...settings, ...partial }
    wx.setStorageSync('trainingSettings', merged)
    if (app && app.globalData) {
      app.globalData.trainingSettings = { ...(app.globalData.trainingSettings || {}), ...partial }
    }
  },

  showBreathInfo() {
    this.setData({ showBreathInfoModal: true, timeSectionZIndex: 1 })
  },

  hideBreathInfo() {
    this.setData({ showBreathInfoModal: false, timeSectionZIndex: 4 })
  },

  onReady() {
    this.ensureShareMenu()
  },

  // 统一生成分享文案
  getShareContent() {
    const { duration, rhythm } = this.data
    const rhythmText = `${rhythm.inhale}-${rhythm.exhale}-${rhythm.hold}`
    return {
      title: `一起练腹式呼吸，${duration}分钟放松一下`,
      path: `/pages/home/index?from=share&duration=${duration}&rhythm=${rhythmText}`,
      query: `from=share&duration=${duration}&rhythm=${rhythmText}`
    }
  },

  // 分享给朋友
  onShareAppMessage() {
    const share = this.getShareContent()
    return {
      title: share.title,
      path: share.path
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    const share = this.getShareContent()
    return {
      title: share.title,
      query: share.query
    }
  },

  // 朋友圈分享需从右上角菜单发起，这里给用户提示
  handleShareTimeline() {
    wx.showToast({
      title: '请点击右上角 ··· 分享到朋友圈',
      icon: 'none',
      duration: 2000
    })
  },

  onShow() {
    try {
      this.ensureShareMenu()
    } catch (err) {
      console.error('home onShow error', (err && (err.stack || err.message || err.errMsg)) || err)
    }
  },

  ensureShareMenu() {
    if (!wx.showShareMenu) return
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline'],
      fail: (err) => {
        console.warn('showShareMenu 失败', err)
      }
    })
  },

  // 静默续期：在已开启提醒的前提下调用 requestSubscribeMessage 以累积授权次数，便于每天都能发
  trySilentSubscribeRenew() {
    const templateId = 'YUP2qo8lHFjeWTaJiEuBLSI0W_5zsYzPTEHmZ6tjZAQ'
    const settings = wx.getStorageSync('subscribeSettings')
    if (!settings || !settings.enabled || !(settings.times && settings.times.length)) return
    const last = wx.getStorageSync('lastSubscribeRenewAt') || 0
    if (Date.now() - last < 20 * 60 * 60 * 1000) return // 每 20 小时最多一次
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo || !userInfo.openid) return
    if (!wx.cloud) return

    wx.requestSubscribeMessage({
      tmplIds: [templateId],
      success: async (res) => {
        wx.setStorageSync('lastSubscribeRenewAt', Date.now())
        if (res[templateId] !== 'accept') return
        try {
          const db = wx.cloud.database()
          const r = await db.collection('subscribe_settings').where({ openid: userInfo.openid }).get()
          if (r.data.length && r.data[0]._id) {
            await db.collection('subscribe_settings').doc(r.data[0]._id).update({
              data: { subscribeResult: res, updateTime: db.serverDate() }
            })
          }
        } catch (e) { console.warn('静默续期写库失败', e) }
      },
      fail: () => { wx.setStorageSync('lastSubscribeRenewAt', Date.now()) }
    })
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

  // 显示练习时长选择器
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
      tempRhythm: { ...this.data.rhythm },
      timeSectionZIndex: 1 // 弹窗打开时，降低时间显示区域的 z-index
    })
  },

  // 隐藏呼吸节奏编辑器
  hideRhythmEditor() {
    this.setData({
      showRhythmEditor: false,
      timeSectionZIndex: 4 // 弹窗关闭时，恢复时间显示区域的 z-index
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
  onHold1Change(e) {
    const tempRhythm = { ...this.data.tempRhythm }
    tempRhythm.hold1 = e.detail.value
    this.setData({
      tempRhythm: tempRhythm
    })
  },

  onHold2Change(e) {
    const tempRhythm = { ...this.data.tempRhythm }
    tempRhythm.hold2 = e.detail.value
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
  async startTraining() {
    // 检查是否已阅读安全须知（仅第一次）
    const hasReadSafety = wx.getStorageSync('hasReadSafety')
    if (!hasReadSafety) {
      // 显示安全须知弹窗
      this.setData({
        showSafetyModal: true
      })
      return
    }

    await this.promptSubscribeOnStart()

    try {
      await this.ensureLogin()
    } catch (err) {
      wx.showToast({
        title: '初始化用户失败，请重试',
        icon: 'none'
      })
      return
    }
    await this.loginAndStartTraining()
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

  async handleSafetyConfirm() {
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

    await this.promptSubscribeOnStart()

    try {
      await this.ensureLogin()
    } catch (err) {
      wx.showToast({
        title: '初始化用户失败，请重试',
        icon: 'none'
      })
      return
    }
    await this.loginAndStartTraining()
  },

  async loginAndStartTraining() {
    const settings = wx.getStorageSync('trainingSettings') || {}
    const mergedSettings = {
      ...settings,
      duration: this.data.duration,
      rhythm: this.data.rhythm,
      soundMode: this.data.soundMode,
      vibrationEnabled: this.data.vibrationEnabled
    }
    wx.setStorageSync('trainingSettings', mergedSettings)
    app.globalData.trainingSettings = { ...(app.globalData.trainingSettings || {}), ...mergedSettings }
    
    // 跳转到训练页面
    wx.navigateTo({
      url: `/pages/training/index?duration=${this.data.duration}&inhale=${this.data.rhythm.inhale}&hold1=${this.data.rhythm.hold1}&exhale=${this.data.rhythm.exhale}&hold2=${this.data.rhythm.hold2}&vibrationEnabled=${this.data.vibrationEnabled ? 1 : 0}`
    })
  },

  hasLoginCache() {
    const userInfo = wx.getStorageSync('userInfo')
    return !!(userInfo && userInfo.openid)
  },

  async promptSubscribeOnStart() {
    const templateId = 'YUP2qo8lHFjeWTaJiEuBLSI0W_5zsYzPTEHmZ6tjZAQ'
    if (!wx.requestSubscribeMessage) return
    const lastAt = wx.getStorageSync('lastStartSubscribePromptAt') || 0
    if (lastAt && Date.now() - lastAt < 24 * 60 * 60 * 1000) return

    return new Promise((resolve) => {
      wx.showModal({
        title: '订阅提醒',
        content: '订阅后可接收训练提醒通知（可随时在微信设置中关闭）。',
        confirmText: '订阅',
        cancelText: '跳过',
        success: (res) => {
          wx.setStorageSync('lastStartSubscribePromptAt', Date.now())
          if (!res.confirm) {
            resolve()
            return
          }
          wx.requestSubscribeMessage({
            tmplIds: [templateId],
            complete: () => resolve()
          })
        },
        fail: () => {
          wx.setStorageSync('lastStartSubscribePromptAt', Date.now())
          resolve()
        }
      })
    })
  },

  showPhoneLogin() {
    this.setData({
      showPhoneLoginModal: true
    })
  },

  hidePhoneLogin() {
    this.setData({
      showPhoneLoginModal: false
    })
  },

  async handlePhoneQuickLogin(e) {
    if (!e.detail || !e.detail.code) {
      wx.showToast({
        title: '请先授权手机号',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '登录中...',
      mask: true
    })

    try {
      await this.ensureLogin(false, e.detail.code)
      wx.hideLoading()
      this.hidePhoneLogin()
      await this.loginAndStartTraining()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      })
    }
  },

  ensureLogin(force = false, phoneCode = '') {
    return new Promise((resolve, reject) => {
      // 检查是否已有用户信息
      const userInfo = wx.getStorageSync('userInfo')
      // 如果这次是手机号快捷登录（phoneCode 存在），必须走云函数换取手机号，不能直接用 openid 缓存短路
      if (!force && !phoneCode && userInfo && userInfo.openid) {
        console.log('用户已登录', userInfo.openid)
        resolve(userInfo)
        return
      }

      // 检查云开发是否初始化
      if (!wx.cloud) {
        reject(new Error('云开发未初始化'))
        return
      }

      const callData = phoneCode
        ? { type: 'getPhoneNumber', code: phoneCode }
        : { type: 'getOpenId' }

      wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: callData,
        success: (res) => {
          console.log('登录成功', res)
          if (res.result && res.result.openid) {
            // 保存用户信息到本地存储
            const userInfo = {
              openid: res.result.openid,
              appid: res.result.appid,
              unionid: res.result.unionid || '',
              phoneNumber: res.result.phoneInfo ? res.result.phoneInfo.phoneNumber : ''
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

  hideTimePicker() {
    this.setData({
      showTimePicker: false
    })
  }
})
