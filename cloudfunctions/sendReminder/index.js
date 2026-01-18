const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 设置时区为北京时间（UTC+8），确保时间匹配正确
process.env.TZ = 'Asia/Shanghai'

const db = cloud.database()

// 发送订阅消息
async function sendSubscribeMessage(openid, templateId, page, data) {
  try {
    // 小程序未发版时，优先使用 trial（体验版）
    // 如果失败，再尝试 formal（正式版）或 developer（开发版）
    let result
    try {
      // 先尝试 trial（体验版），因为小程序可能未发版
      result = await cloud.openapi.subscribeMessage.send({
        touser: openid,
        template_id: templateId,
        page: page,
        data: data,
        miniprogram_state: 'trial' // 体验版：'trial'，正式版：'formal'，开发版：'developer'
      })
      console.log(`[发送消息] ✅ 使用 trial 模式成功发送给 ${openid}`, result)
      return result
    } catch (trialErr) {
      console.log(`[发送消息] trial 模式失败，错误: ${trialErr.errCode || trialErr.errMsg}, 尝试使用 formal 模式`)
      // 如果 trial 失败，尝试 formal（正式版）
      try {
        result = await cloud.openapi.subscribeMessage.send({
          touser: openid,
          template_id: templateId,
          page: page,
          data: data,
          miniprogram_state: 'formal'
        })
        console.log(`[发送消息] ✅ 使用 formal 模式成功发送给 ${openid}`, result)
        return result
      } catch (formalErr) {
        console.error(`[发送消息] formal 模式也失败，错误: ${formalErr.errCode || formalErr.errMsg}`)
        // 最后尝试 developer（开发版）
        try {
          result = await cloud.openapi.subscribeMessage.send({
            touser: openid,
            template_id: templateId,
            page: page,
            data: data,
            miniprogram_state: 'developer'
          })
          console.log(`[发送消息] ✅ 使用 developer 模式成功发送给 ${openid}`, result)
          return result
        } catch (devErr) {
          console.error(`[发送消息] ❌ 所有模式都失败`, {
            trial: trialErr.errCode || trialErr.errMsg,
            formal: formalErr.errCode || formalErr.errMsg,
            developer: devErr.errCode || devErr.errMsg
          })
          throw devErr
        }
      }
    }
  } catch (err) {
    console.error(`[发送消息] 发送失败，用户: ${openid}`, err)
    throw err
  }
}

// 检查时间是否匹配（允许3分钟误差，确保在定时触发器执行时能匹配到）
function isTimeMatch(currentHour, currentMinute, targetHour, targetMinute) {
  // 精确匹配小时
  if (currentHour !== targetHour) {
    return false
  }
  // 允许3分钟的误差（因为定时触发器可能不是完全准时的，且用户可能在整点后几分钟设置）
  const minuteDiff = Math.abs(currentMinute - targetMinute)
  const isMatch = minuteDiff <= 3
  if (isMatch) {
    console.log(`[时间匹配] ✅ 匹配成功: 当前 ${currentHour}:${String(currentMinute).padStart(2, '0')} vs 目标 ${targetHour}:${String(targetMinute).padStart(2, '0')}, 误差: ${minuteDiff}分钟`)
  }
  return isMatch
}

// 检查星期几是否匹配
function isWeekdayMatch(currentWeekday, targetWeekdays) {
  if (!targetWeekdays || targetWeekdays.length === 0) {
    return true // 如果没有指定星期几，则每天都匹配
  }
  // 注意：JavaScript的getDay()返回0-6，0是周日，1是周一
  // 但我们的配置中1是周一，所以需要转换
  const weekday = currentWeekday === 0 ? 7 : currentWeekday // 将周日转换为7
  return targetWeekdays.includes(weekday)
}

// 获取北京时间（UTC+8）
function getBeijingTime() {
  const now = new Date()
  // 获取 UTC 时间戳（毫秒）
  const utcTime = now.getTime()
  // 计算北京时间（UTC+8，即加8小时 = 8 * 60 * 60 * 1000 毫秒）
  const beijingTime = new Date(utcTime + 8 * 60 * 60 * 1000)
  return beijingTime
}

// 主函数
exports.main = async (event, context) => {
  // 获取北京时间
  const now = getBeijingTime()
  const currentHour = now.getUTCHours() // 使用 UTC 方法，因为已经加上了8小时
  const currentMinute = now.getUTCMinutes()
  const currentWeekday = now.getUTCDay() // 0=周日, 1=周一, ..., 6=周六
  const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`
  
  // 订阅消息模板ID
  const templateId = 'YUP2qo8lHFjeWTaJiEuBLSI0W_5zsYzPTEHmZ6tjZAQ'
  
  // 获取原始 UTC 时间用于日志
  const utcNow = new Date()
  
  console.log(`[定时提醒] ========== 定时触发器执行 ==========`)
  console.log(`[定时提醒] UTC 时间: ${utcNow.toISOString()}`)
  console.log(`[定时提醒] 北京时间: ${currentTimeStr}, 星期: ${currentWeekday}`)
  console.log(`[定时提醒] 北京时间完整: ${now.toISOString()}`)
  
  try {
    // 查询所有开启了订阅的用户
    // 注意：使用 .where() 查询时，如果字段不存在，该记录不会被返回
    // 所以我们需要查询 enabled: true 的所有记录，然后在代码中处理 openid 字段
    // 按更新时间倒序排列，确保获取最新记录
    const allSubscribeSettings = await db.collection('subscribe_settings')
      .where({
        enabled: true
      })
      .orderBy('updateTime', 'desc')
      .get()
    
    console.log(`[定时提醒] 查询到 ${allSubscribeSettings.data.length} 个开启订阅的用户`)
    
    // 打印所有查询到的记录ID，用于调试
    if (allSubscribeSettings.data.length > 0) {
      console.log(`[定时提醒] 查询到的记录列表:`)
      allSubscribeSettings.data.forEach((s, index) => {
        console.log(`[定时提醒] 记录 ${index + 1}:`, {
          _id: s._id,
          openid: s.openid || '无',
          _openid: s._openid || '无',
          updateTime: s.updateTime ? new Date(s.updateTime).toLocaleString('zh-CN') : '无',
          frequency: s.frequency,
          reminderTimesCount: s.reminderTimes ? s.reminderTimes.length : 0
        })
      })
    }
    
    if (allSubscribeSettings.data.length === 0) {
      return {
        success: true,
        message: '没有需要提醒的用户',
        count: 0
      }
    }
    
    let successCount = 0
    let failCount = 0
    let matchedUsers = []
    
    // 遍历所有订阅设置，检查是否需要发送提醒
    for (const setting of allSubscribeSettings.data) {
      // 优先使用 openid 字段，如果没有则使用 _openid（微信自动添加的字段）
      const userOpenid = setting.openid || setting._openid
      const { type, frequency, reminderTimes } = setting
      let shouldSend = false
      let matchedTime = null
      
      if (!userOpenid) {
        console.log(`[定时提醒] ⚠️ 用户记录缺少 openid，跳过:`, setting._id)
        continue
      }
      
      console.log(`[定时提醒] 检查用户 ${userOpenid}, 频率: ${frequency}, 类型: ${type}`)
      console.log(`[定时提醒] 记录ID: ${setting._id}, 更新时间: ${setting.updateTime || '无'}`)
      
      // 检查用户是否设置了提醒时间
      if (!reminderTimes || !Array.isArray(reminderTimes) || reminderTimes.length === 0) {
        console.log(`[定时提醒] ⚠️ 用户 ${userOpenid} 未设置提醒时间`)
        console.log(`[定时提醒] 记录详情:`, JSON.stringify(setting, null, 2))
        continue
      }
      
      console.log(`[定时提醒] 用户设置的提醒时间:`, JSON.stringify(reminderTimes))
      console.log(`[定时提醒] times 字段:`, JSON.stringify(setting.times))
      
      // 根据用户设置的具体时间检查是否匹配
      for (const timeConfig of reminderTimes) {
        // 兼容不同的数据结构：可能是 {hour, minute} 或 {hour: 9, minute: 0}
        const hour = timeConfig.hour !== undefined ? timeConfig.hour : parseInt(timeConfig.hour)
        const minute = timeConfig.minute !== undefined ? timeConfig.minute : parseInt(timeConfig.minute)
        
        if (isNaN(hour) || isNaN(minute)) {
          console.log(`[定时提醒] ⚠️ 时间格式错误:`, timeConfig)
          continue
        }
        
        const targetTimeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        console.log(`[定时提醒] 比较时间: 当前 ${currentTimeStr} vs 目标 ${targetTimeStr}`)
        
        if (isTimeMatch(currentHour, currentMinute, hour, minute)) {
          shouldSend = true
          matchedTime = { hour, minute }
          console.log(`[定时提醒] ✅✅✅ 时间匹配成功！准备发送提醒: ${targetTimeStr}`)
          break
        } else {
          const minuteDiff = Math.abs(currentMinute - minute)
          console.log(`[定时提醒] ❌ 时间不匹配，误差: ${minuteDiff}分钟 (允许3分钟误差)`)
        }
      }
      
      // 如果需要发送，则发送提醒
      if (shouldSend && matchedTime) {
        try {
          // 检查用户是否授权了订阅消息
          // 微信订阅消息授权返回格式: { 'templateId': 'accept'/'reject'/'ban' }
          const subscribeStatus = setting.subscribeResult && setting.subscribeResult[templateId]
          
          console.log(`[定时提醒] 用户 ${userOpenid} 的订阅状态:`, subscribeStatus)
          console.log(`[定时提醒] subscribeResult 完整内容:`, JSON.stringify(setting.subscribeResult))
          
          if (!subscribeStatus || subscribeStatus !== 'accept') {
            console.log(`[定时提醒] ⚠️ 用户 ${userOpenid} 未授权订阅消息, 状态: ${subscribeStatus}`)
            console.log(`[定时提醒] 提示: 用户需要在小程序中重新授权订阅消息`)
            continue
          }
          
          console.log(`[定时提醒] ✅ 准备发送提醒给用户: ${userOpenid}`)
          
          // 构建消息内容
          const year = now.getFullYear()
          const month = String(now.getMonth() + 1).padStart(2, '0')
          const day = String(now.getDate()).padStart(2, '0')
          const timeStr = `${year}年${month}月${day}日 ${String(matchedTime.hour).padStart(2, '0')}:${String(matchedTime.minute).padStart(2, '0')}`
          
          // 根据提醒频率生成提示信息
          let planName = '腹式呼吸训练'
          let reminderText = '今日计划还未完成哦,请及时完成!'
          
          if (type === 'daily') {
            if (frequency === 1) {
              planName = '每日提醒'
              reminderText = '今天的训练时间到了，开始练习吧！'
            } else if (frequency === 2) {
              planName = '每日提醒'
              reminderText = matchedTime.hour < 12 ? '早上好，开始今天的第一次练习吧！' : '晚上好，完成今天的第二次练习吧！'
            } else if (frequency === 3) {
              planName = '每日提醒'
              reminderText = '今日计划还未完成哦,请及时完成!'
            }
          }
          
          const messageData = {
            thing1: { value: planName },
            time7: { value: timeStr },
            thing3: { value: reminderText }
          }
          
          await sendSubscribeMessage(
            userOpenid,
            templateId,
            'pages/home/index',
            messageData
          )
          
          successCount++
          matchedUsers.push(userOpenid)
          console.log(`[定时提醒] ✅✅✅ 成功发送提醒给用户: ${userOpenid}, 频率: ${frequency}次/天, 时间: ${matchedTime.hour}:${String(matchedTime.minute).padStart(2, '0')}`)
        } catch (err) {
          failCount++
          const errCode = err.errCode || err.errCode
          const errMsg = err.errMsg || err.message || ''
          
          console.error(`[定时提醒] ❌❌❌ 发送提醒失败，用户: ${userOpenid}`)
          console.error(`[定时提醒] 错误代码: ${errCode}, 错误信息: ${errMsg}`)
          
          // 如果是用户拒绝订阅消息（43101），更新数据库状态
          if (errCode === 43101) {
            try {
              await db.collection('subscribe_settings')
                .doc(setting._id)
                .update({
                  data: {
                    [`subscribeResult.${templateId}`]: 'reject',
                    updateTime: db.serverDate()
                  }
                })
              console.log(`[定时提醒] ⚠️ 用户 ${userOpenid} 已拒绝订阅消息，已更新数据库状态为 reject`)
              console.log(`[定时提醒] 提示：用户需要在小程序中重新授权订阅消息才能收到提醒`)
            } catch (updateErr) {
              console.error(`[定时提醒] 更新数据库状态失败:`, updateErr)
            }
          }
          
          if (err.stack) {
            console.error(`[定时提醒] 错误堆栈:`, err.stack)
          }
        }
      }
    }
    
    return {
      success: true,
      message: `提醒发送完成`,
      currentTime: `${currentHour}:${currentMinute}`,
      currentWeekday: currentWeekday,
      total: allSubscribeSettings.data.length,
      successCount: successCount,
      failCount: failCount,
      matchedUsers: matchedUsers
    }
  } catch (err) {
    console.error('定时提醒执行失败:', err)
    return {
      success: false,
      message: err.message || '定时提醒执行失败'
    }
  }
}
