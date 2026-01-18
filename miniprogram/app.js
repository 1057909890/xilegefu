// app.js
App({
  onLaunch: function () {
    this.globalData = {
      env: "cloud1-2g5bmg8b9e15497e",
      // 训练设置
      trainingSettings: {
        duration: 10, // 默认10分钟
        rhythm: {
          inhale: 3,  // 吸气3秒
          exhale: 6,  // 呼气6秒
          hold: 2     // 保持2秒
        }
      }
    };
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
      
      // 用户登录：获取 openid
      this.login()
    }
  },

  // 用户登录
  login() {
    // 检查云开发是否初始化
    if (!wx.cloud) {
      console.error('云开发未初始化，无法获取 openid')
      return
    }

    // 检查是否已有用户信息
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo.openid) {
      console.log('用户已登录', userInfo.openid)
      return
    }

    // 调用云函数获取 openid
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'getOpenId'
      },
      success: (res) => {
        console.log('获取openid成功', res)
        if (res.result && res.result.openid) {
          // 保存用户信息到本地存储
          wx.setStorageSync('userInfo', {
            openid: res.result.openid,
            appid: res.result.appid,
            unionid: res.result.unionid || ''
          })
          this.globalData.userInfo = {
            openid: res.result.openid,
            appid: res.result.appid,
            unionid: res.result.unionid || ''
          }
        }
      },
      fail: (err) => {
        console.error('获取openid失败', err)
        // 如果是云函数不存在，提示用户部署
        if (err.errMsg && err.errMsg.includes('FunctionName')) {
          console.error('请部署 quickstartFunctions 云函数：')
          console.error('1. 在微信开发者工具中打开云开发控制台')
          console.error('2. 进入"云函数"页面')
          console.error('3. 上传并部署 quickstartFunctions 云函数')
        } else if (err.errMsg && err.errMsg.includes('access_token')) {
          console.error('云开发环境未正确初始化，请检查：')
          console.error('1. 是否已开通云开发')
          console.error('2. 环境ID是否正确（当前：' + this.globalData.env + '）')
          console.error('3. 是否已部署 quickstartFunctions 云函数')
        }
      }
    })
  }
});
