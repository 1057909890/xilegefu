# 腹式呼吸训练小程序 - 开发文档

## 📋 目录

1. [项目概述](#项目概述)
2. [技术栈](#技术栈)
3. [项目结构](#项目结构)
4. [环境配置](#环境配置)
5. [页面功能说明](#页面功能说明)
6. [云开发配置](#云开发配置)
7. [数据库设计](#数据库设计)
8. [开发步骤](#开发步骤)
9. [注意事项](#注意事项)
10. [常见问题](#常见问题)

---

## 项目概述

**产品名称**：腹式呼吸训练助手

**核心功能**：提供腹式呼吸训练全流程（安全协议→时间/节奏选择→训练引导→打卡统计）

**设计风格**：简洁年轻化，以浅色系 + 低饱和度渐变为基调，交互轻量流畅

**响应式设计**：使用 rpx 单位，适配不同屏幕尺寸

---

## 技术栈

- **框架**：微信小程序原生框架
- **云开发**：微信云开发（数据库、云函数）
- **样式单位**：rpx（响应式像素）
- **基础库版本**：2.2.3 及以上

---

## 项目结构

```
xilegefu/
├── miniprogram/                    # 小程序前端代码
│   ├── app.js                      # 小程序入口文件
│   ├── app.json                    # 全局配置
│   ├── app.wxss                    # 全局样式
│   ├── pages/                      # 页面目录
│   │   ├── safety/                 # 安全须知页
│   │   │   ├── index.js
│   │   │   ├── index.json
│   │   │   ├── index.wxml
│   │   │   └── index.wxss
│   │   ├── home/                   # 首页
│   │   │   ├── index.js
│   │   │   ├── index.json
│   │   │   ├── index.wxml
│   │   │   └── index.wxss
│   │   ├── training/               # 训练进行页
│   │   │   ├── index.js
│   │   │   ├── index.json
│   │   │   ├── index.wxml
│   │   │   └── index.wxss
│   │   ├── complete/               # 训练完成页
│   │   │   ├── index.js
│   │   │   ├── index.json
│   │   │   ├── index.wxml
│   │   │   └── index.wxss
│   │   ├── subscribe/              # 订阅通知页
│   │   │   ├── index.js
│   │   │   ├── index.json
│   │   │   ├── index.wxml
│   │   │   └── index.wxss
│   │   └── history/                # 历史记录页
│   │       ├── index.js
│   │       ├── index.json
│   │       ├── index.wxml
│   │       └── index.wxss
│   └── images/                     # 图片资源
│       └── icons/                  # 图标资源
├── cloudfunctions/                 # 云函数目录
│   └── trainingRecord/             # 训练记录云函数
│       ├── index.js
│       ├── package.json
│       └── config.json
├── project.config.json             # 项目配置
└── ui.md                           # 设计稿色值文档
```

---

## 环境配置

### 1. 微信开发者工具设置

1. 打开微信开发者工具
2. 导入项目，选择项目根目录
3. 在项目设置中：
   - **AppID**：填写你的小程序 AppID
   - **开发模式**：选择"小程序"
   - **基础库版本**：选择 2.2.3 或以上

### 2. 云开发环境初始化

1. 在微信开发者工具中，点击"云开发"按钮
2. 开通云开发服务（首次使用需要）
3. 创建云开发环境（选择"基础版"即可）
4. 记录环境 ID（在云开发控制台查看）

### 3. 配置云开发环境

在 `miniprogram/app.js` 中，云开发初始化代码已包含：

```javascript
wx.cloud.init({
  traceUser: true,
})
```

如果需要指定环境 ID，可以修改为：

```javascript
wx.cloud.init({
  env: 'your-env-id', // 替换为你的环境ID
  traceUser: true,
})
```

---

## 页面功能说明

### 1. 安全须知页 (`pages/safety/index`)

**功能**：
- 展示安全须知内容（适应症、禁忌症、紧急情况）
- 用户需勾选"我已阅读并同意"才能继续
- 首次进入小程序时自动跳转至此页

**关键代码**：
- 使用 `wx.setStorageSync('hasReadSafety', true)` 保存阅读状态
- 勾选后按钮变为可点击状态

### 2. 首页 (`pages/home/index`)

**功能**：
- **时间选择**：点击时间显示弹窗，可选择 5-30 分钟
- **呼吸节奏设置**：默认 吸气3s→呼气6s→屏息2s，可自定义
- **训练要点展示**：4 条训练要点说明
- **开始按钮**：发光动效，点击开始训练

**关键代码**：
- 使用 `slider` 组件实现时间滑动选择
- 使用弹窗（modal）实现时间选择和节奏编辑
- 设置保存在 `wx.setStorageSync('trainingSettings', settings)`

### 3. 训练进行页 (`pages/training/index`)

**功能**：
- **环形进度条**：使用 Canvas 绘制，显示剩余时间
- **计时器**：倒计时显示，实时更新
- **数据统计**：已训练时长、完成循环数、总时长
- **呼吸引导**：水滴形指示器，随呼吸节奏放大缩小
- **控制按钮**：暂停/继续、停止

**关键代码**：
- 使用 `setInterval` 实现计时
- 使用 `requestAnimationFrame` 实现呼吸动画
- 使用 Canvas API 绘制进度环
- 训练记录保存到云数据库

### 4. 训练完成页 (`pages/complete/index`)

**功能**：
- **成功图标**：渐变色对勾，带光圈动效
- **数据展示**：本次训练时长、今日完成次数、连续打卡天数、累计训练次数
- **操作按钮**：返回首页、查看历史记录
- **自动触发订阅提示**：首次完成训练后 2 秒弹出订阅页

**关键代码**：
- 从云数据库查询统计数据
- 计算连续打卡天数（简化版逻辑）

### 5. 订阅通知页 (`pages/subscribe/index`)

**功能**：
- **仪表盘展示**：累计打卡天数、今日完成次数
- **提醒频率选择**：每周 3 次、每周 5 次、自定义
- **订阅消息**：调用微信订阅消息 API

**关键代码**：
- 使用 `wx.requestSubscribeMessage` 调用订阅消息
- 需要在小程序后台配置订阅消息模板
- 订阅设置保存到云数据库

### 6. 历史记录页 (`pages/history/index`)

**功能**：
- **统计卡片**：总训练次数、累计时长、连续打卡天数
- **历史列表**：按时间倒序显示训练记录
- **记录详情**：点击可查看单次训练详情

**关键代码**：
- 从云数据库查询训练记录
- 使用 `orderBy` 排序，`limit` 限制数量

---

## 云开发配置

### 1. 创建数据库集合

在云开发控制台的"数据库"中，创建以下集合：

#### `training_records`（训练记录）

**字段说明**：
- `duration` (Number): 训练总时长（秒）
- `elapsedTime` (Number): 实际训练时长（秒）
- `cycleCount` (Number): 完成循环数
- `rhythm` (Object): 呼吸节奏
  - `inhale` (Number): 吸气秒数
  - `exhale` (Number): 呼气秒数
  - `hold` (Number): 屏息秒数
- `date` (Date): 训练日期
- `createTime` (Date): 创建时间（服务器时间）

**权限设置**：
- 所有用户可读
- 仅创建者可写

#### `subscribe_settings`（订阅设置）

**字段说明**：
- `frequency` (Number): 提醒频率（3/5/0）
- `subscribeResult` (Object): 订阅结果
- `openid` (String): 用户 openid
- `createTime` (Date): 创建时间
- `updateTime` (Date): 更新时间

**权限设置**：
- 仅创建者可读写

### 2. 云函数部署

#### 部署训练记录云函数

1. 在微信开发者工具中，右键 `cloudfunctions/trainingRecord` 文件夹
2. 选择"上传并部署：云端安装依赖"
3. 等待部署完成

#### 调用云函数（可选）

如果使用云函数保存记录，可以在 `pages/training/index.js` 中调用：

```javascript
wx.cloud.callFunction({
  name: 'trainingRecord',
  data: {
    duration: this.data.totalDuration,
    elapsedTime: this.data.totalDuration,
    cycleCount: this.data.cycleCount,
    rhythm: {
      inhale: this.data.inhale,
      exhale: this.data.exhale,
      hold: this.data.hold
    }
  },
  success: (res) => {
    console.log('保存成功', res)
  }
})
```

**注意**：当前代码直接使用 `db.collection().add()` 保存，也可以正常工作。使用云函数可以添加更多业务逻辑。

---

## 数据库设计

### training_records 集合

```javascript
{
  _id: "自动生成",
  duration: 600,              // 总时长（秒）
  elapsedTime: 600,          // 实际训练时长（秒）
  cycleCount: 10,            // 完成循环数
  rhythm: {
    inhale: 3,               // 吸气秒数
    exhale: 6,               // 呼气秒数
    hold: 2                  // 屏息秒数
  },
  date: Date,                // 训练日期
  createTime: Date           // 创建时间（服务器时间）
}
```

### subscribe_settings 集合

```javascript
{
  _id: "自动生成",
  frequency: 3,              // 提醒频率：3=每周3次，5=每周5次，0=自定义
  subscribeResult: {},       // 订阅消息结果
  openid: "用户openid",
  createTime: Date,
  updateTime: Date
}
```

---

## 开发步骤

### 第一步：环境准备

1. 安装微信开发者工具
2. 注册小程序账号，获取 AppID
3. 开通云开发服务

### 第二步：导入项目

1. 在微信开发者工具中导入项目
2. 配置 AppID
3. 开通云开发，创建环境

### 第三步：创建数据库集合

1. 在云开发控制台创建 `training_records` 集合
2. 创建 `subscribe_settings` 集合
3. 设置集合权限

### 第四步：配置订阅消息（可选）

1. 在小程序后台 → 功能 → 订阅消息
2. 申请订阅消息模板
3. 获取模板 ID
4. 在 `pages/subscribe/index.js` 中替换模板 ID：

```javascript
wx.requestSubscribeMessage({
  tmplIds: ['your-template-id-1', 'your-template-id-2'], // 替换为实际模板ID
  // ...
})
```

### 第五步：添加图标资源

在 `miniprogram/images/icons/` 目录下添加以下图标（或使用字体图标）：

- `clock.png` - 时钟图标
- `refresh.png` - 刷新图标
- `calendar.png` - 日历图标
- `arrow-up.png` - 箭头图标
- `bell.png` - 铃铛图标

**替代方案**：可以使用 iconfont 或使用文字图标（当前代码已使用文字图标作为备选）

### 第六步：测试运行

1. 编译项目
2. 在模拟器中测试各个页面
3. 检查云数据库数据是否正常保存

### 第七步：真机调试

1. 点击"预览"，生成二维码
2. 用微信扫码在真机上测试
3. 检查响应式布局是否正常

---

## 注意事项

### 1. 响应式设计

- 所有尺寸使用 `rpx` 单位
- 1rpx = 屏幕宽度 / 750
- 设计稿基于 750px 宽度

### 2. 颜色使用

- 严格按照 `ui.md` 中的色值使用
- 渐变使用 `linear-gradient`
- 透明度使用 `rgba` 或 `opacity`

### 3. 云开发权限

- 确保数据库集合权限设置正确
- 首次使用需要用户授权

### 4. Canvas 使用

- 训练页的进度环使用 Canvas 2D API
- 需要在小程序基础库 2.9.0+ 支持
- 使用 `wx.createSelectorQuery()` 获取 canvas 节点

### 5. 订阅消息

- 订阅消息需要用户主动触发（点击按钮）
- 每个模板 ID 需要单独申请
- 订阅结果需要保存，用于后续推送

### 6. 性能优化

- 历史记录列表使用 `limit` 限制数量
- 图片使用合适的尺寸，避免过大
- 动画使用 `transform` 和 `opacity`，避免触发重排

---

## 常见问题

### Q1: 云开发初始化失败

**A**: 检查是否已开通云开发，环境 ID 是否正确。

### Q2: Canvas 不显示

**A**: 确保使用 Canvas 2D，基础库版本 2.9.0+，使用 `wx.createSelectorQuery()` 获取节点。

### Q3: 订阅消息调用失败

**A**: 
- 检查模板 ID 是否正确
- 确保在按钮点击事件中调用（用户主动触发）
- 检查小程序后台是否已申请模板

### Q4: 数据查询为空

**A**: 
- 检查数据库集合权限设置
- 确认数据已正确保存
- 检查查询条件是否正确

### Q5: 页面跳转失败

**A**: 
- 检查 `app.json` 中页面路径是否正确
- 确保页面文件已创建
- 检查页面路径大小写

### Q6: 样式不生效

**A**: 
- 检查 `rpx` 单位是否正确
- 确认样式文件路径正确
- 检查是否有样式覆盖

---

## 后续优化建议

1. **打卡逻辑优化**：实现更精确的连续打卡天数计算
2. **数据统计**：添加周报、月报统计
3. **个性化设置**：保存用户偏好设置
4. **推送提醒**：实现定时推送训练提醒
5. **数据导出**：支持导出训练数据
6. **社交功能**：分享训练成果、排行榜等

---

## 技术支持

如有问题，请查看：
- [微信小程序官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- [订阅消息文档](https://developers.weixin.qq.com/miniprogram/dev/api/open-api/subscribe-message/wx.requestSubscribeMessage.html)

---

**文档版本**：v1.0  
**最后更新**：2024年
