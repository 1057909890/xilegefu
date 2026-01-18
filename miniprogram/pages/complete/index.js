// pages/complete/index.js
const app = getApp()

Page({
  data: {
    duration: '00:00',
    todayCount: 0,
    checkInDays: 0,
    totalCount: 0,
    showSubscribeModal: false,
    subscribeEnabled: true,
    selectedPlan: 'light'
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
    // 检查云开发是否初始化
    if (!wx.cloud) {
      console.error('云开发未初始化')
      return
    }

    try {
      const db = wx.cloud.database()
      const _ = db.command
      
      // 获取今日训练次数
      // 使用 date 字段查询，因为保存时使用的是 new Date()
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      // 微信云数据库支持 Date 对象的直接比较
      const todayRecords = await db.collection('training_records')
        .where({
          date: _.gte(today)
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
      
      // 如果今日记录为0，可能是数据还没同步，延迟500ms后重试一次
      if (todayRecords.total === 0) {
        setTimeout(async () => {
          try {
            const retryTodayRecords = await db.collection('training_records')
              .where({
                date: _.gte(today)
              })
              .count()
            
            if (retryTodayRecords.total > 0) {
              this.setData({
                todayCount: retryTodayRecords.total
              })
            }
          } catch (retryErr) {
            console.error('重试加载今日记录失败', retryErr)
          }
        }, 500)
      }
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
    // 检查是否首次完成训练且未设置订阅
    const hasShownSubscribe = wx.getStorageSync('hasShownSubscribe')
    const subscribeSettings = wx.getStorageSync('subscribeSettings')
    if (!hasShownSubscribe && !subscribeSettings) {
      // 延迟显示订阅弹窗，避免与完成页冲突
      setTimeout(() => {
        this.setData({
          showSubscribeModal: true
        })
      }, 2000)
    }
  },

  // 订阅相关方法
  hideSubscribeModal() {
    this.setData({
      showSubscribeModal: false
    })
    // 标记已显示过订阅弹窗
    wx.setStorageSync('hasShownSubscribe', true)
  },

  toggleSubscribe(e) {
    this.setData({
      subscribeEnabled: e.detail.value
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

  selectPlan(e) {
    const plan = e.currentTarget.dataset.plan
    this.setData({
      selectedPlan: plan
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

    if (!this.data.subscribeEnabled) {
      wx.showToast({
        title: '请先开启提醒',
        icon: 'none'
      })
      return
    }

    // 保存订阅设置
    const planMap = {
      'light': { type: 'daily', times: 1 },
      'morning': { type: 'daily', times: 2 },
      'deep': { type: 'daily', times: 3 },
      'beginner': { type: 'weekly', times: 3 },
      'advanced': { type: 'weekly', times: 5 }
    }
    
    const selected = planMap[this.data.selectedPlan]
    wx.setStorageSync('subscribeSettings', {
      enabled: this.data.subscribeEnabled,
      plan: this.data.selectedPlan,
      type: selected.type,
      times: selected.times
    })
    
    // 调用订阅消息
    this.subscribeMessage(selected)
    
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

  subscribeMessage(plan) {
    // 调用微信订阅消息接口
    wx.requestSubscribeMessage({
      tmplIds: ['YUP2qo8lHFjeWTaJiEuBLSI0W_5zsYzPTEHmZ6tjZAQ'],
      success: async (res) => {
        console.log('订阅成功', res)
        // 保存订阅设置到云数据库
        const db = wx.cloud.database()
        const userInfo = wx.getStorageSync('userInfo') || {}
        
        // 检查是否已存在该用户的订阅设置
        const existingSetting = await db.collection('subscribe_settings').where({
          openid: userInfo.openid
        }).get()

        if (existingSetting.data.length > 0) {
          // 更新现有记录
          await db.collection('subscribe_settings').doc(existingSetting.data[0]._id).update({
            data: {
              enabled: this.data.subscribeEnabled,
              plan: this.data.selectedPlan,
              type: plan.type,
              times: plan.times,
              subscribeResult: res,
              updateTime: db.serverDate()
            }
          })
        } else {
          // 添加新记录
          await db.collection('subscribe_settings').add({
            data: {
              enabled: this.data.subscribeEnabled,
              plan: this.data.selectedPlan,
              type: plan.type,
              times: plan.times,
              subscribeResult: res,
              openid: userInfo.openid || '',
              createTime: db.serverDate(),
              updateTime: db.serverDate()
            }
          })
        }
      },
      fail: (err) => {
        console.error('订阅失败', err)
      }
    })
  },

  // 阻止事件冒泡
  stopPropagation() {},

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
