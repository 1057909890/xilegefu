// 云函数：保存训练记录
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { duration, elapsedTime, cycleCount, rhythm } = event
  
  try {
    const result = await db.collection('training_records').add({
      data: {
        duration: duration,
        elapsedTime: elapsedTime,
        cycleCount: cycleCount,
        rhythm: rhythm,
        date: new Date(),
        createTime: db.serverDate()
      }
    })
    
    return {
      success: true,
      _id: result._id
    }
  } catch (err) {
    return {
      success: false,
      error: err.message
    }
  }
}
