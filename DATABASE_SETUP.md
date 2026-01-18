# 数据库初始化指南

## 🚀 第一步：开通云开发并获取环境ID

### 1. 开通云开发服务

1. 打开微信开发者工具
2. 点击顶部菜单栏的 **"云开发"** 按钮
3. 如果是首次使用，会提示开通云开发服务
4. 点击 **"开通"** 并按照提示完成开通流程

### 2. 创建云开发环境

1. 开通后，会进入云开发控制台
2. 如果是首次使用，需要创建环境：
   - 点击 **"创建环境"**
   - 选择环境类型：**基础版**（免费）即可
   - 填写环境名称（如：`dev` 或 `prod`）
   - 点击 **"确定"**
3. 创建完成后，会显示环境ID（格式类似：`cloud1-xxx`）

### 3. 配置环境ID到代码

1. 打开 `miniprogram/app.js` 文件
2. 找到第9行的 `env: ""`
3. 将环境ID填入，例如：
   ```javascript
   env: "cloud1-xxx",  // 替换为你的实际环境ID
   ```
4. 保存文件

**重要提示**：
- 如果不填写环境ID，会使用默认环境（第一个创建的环境）
- 但建议明确指定环境ID，避免环境切换时出现问题
- 环境ID可以在云开发控制台的"设置" → "环境设置"中查看

---

## 📊 数据库集合创建

### 1. training_records（训练记录）

#### 创建步骤

1. 打开云开发控制台 → 数据库
2. 点击"+"创建集合
3. 集合名称：`training_records`
4. 点击"确定"

#### 权限设置

1. 点击集合名称进入集合详情
2. 点击"权限设置"
3. 设置为：
   - **所有用户可读**
   - **仅创建者可写**

#### 字段说明

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| duration | Number | 训练总时长（秒） | 600 |
| elapsedTime | Number | 实际训练时长（秒） | 600 |
| cycleCount | Number | 完成循环数 | 10 |
| rhythm | Object | 呼吸节奏 | {inhale: 3, exhale: 6, hold: 2} |
| date | Date | 训练日期 | 2024-01-01 |
| createTime | Date | 创建时间（服务器时间） | 自动生成 |

**注意**：字段会在首次保存数据时自动创建，无需手动创建索引。

---

### 2. subscribe_settings（订阅设置）

#### 创建步骤

1. 打开云开发控制台 → 数据库
2. 点击"+"创建集合
3. 集合名称：`subscribe_settings`
4. 点击"确定"

#### 权限设置

1. 点击集合名称进入集合详情
2. 点击"权限设置"
3. 设置为：
   - **仅创建者可读写**

#### 字段说明

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| frequency | Number | 提醒频率 | 3（每周3次） |
| subscribeResult | Object | 订阅结果 | {} |
| openid | String | 用户openid | 自动获取 |
| createTime | Date | 创建时间 | 自动生成 |
| updateTime | Date | 更新时间 | 自动生成 |

---

## 🔍 数据查询示例

### 查询所有训练记录

```javascript
const db = wx.cloud.database()
const records = await db.collection('training_records')
  .orderBy('date', 'desc')
  .get()
```

### 查询今日训练记录

```javascript
const db = wx.cloud.database()
const _ = db.command
const today = new Date()
today.setHours(0, 0, 0, 0)

const records = await db.collection('training_records')
  .where({
    date: _.gte(today.getTime())
  })
  .get()
```

### 统计总训练次数

```javascript
const db = wx.cloud.database()
const result = await db.collection('training_records')
  .count()
```

---

## 🛠️ 数据管理

### 清空测试数据

如果需要清空测试数据：

1. 在云开发控制台 → 数据库
2. 选择集合
3. 点击"数据管理"
4. 选择要删除的记录
5. 点击"删除"

**注意**：生产环境请谨慎操作！

---

## 📈 索引优化（可选）

如果数据量较大，可以创建索引提升查询性能：

### 为 date 字段创建索引

1. 在集合详情页 → 索引管理
2. 点击"添加索引"
3. 字段：`date`
4. 排序：降序
5. 点击"确定"

---

## ✅ 验证

创建完成后，可以通过以下方式验证：

1. 在小程序中完成一次训练
2. 在云开发控制台查看 `training_records` 集合
3. 确认数据已保存

---

**完成！** 数据库已配置完成，可以开始使用小程序了。
