# 善缘阁 API 协议文档

> 基于现有前端 UI 反向推导的 API 契约。
> 所有接口统一返回: `{ success: boolean, data?: any, message?: string }`

---

## 前置: 匿名用户注册

### POST /api/user/anonymous

生成匿名 userId 并返回。

| 字段 | 值 |
|------|-----|
| 说明 | 创建匿名用户，无需传参 |
| Method | `POST` |
| Body | `{}` (可为空) |

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "anon_abc123def456"
  }
}
```

**前端使用字段:** `data.userId`

---

## 前置: 手机号验证码登录

开发环境可使用本地验证码模式，默认验证码为 `123456`。生产环境需关闭本地验证码并接入真实短信服务商。

### POST /api/auth/sms/send

发送登录验证码。

| 字段 | 值 |
|------|-----|
| Method | `POST` |
| Body | `{ phone, userId? }` |

**Response:**
```json
{
  "success": true,
  "data": {
    "phoneMasked": "138****8000",
    "expiresIn": 300
  }
}
```

### POST /api/auth/sms/login

使用验证码登录。若手机号已有账号，会把当前匿名 `userId` 下的记录合并到手机号账号。

| 字段 | 值 |
|------|-----|
| Method | `POST` |
| Body | `{ phone, code, userId? }` |

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "anon_or_user_xxx",
    "sessionToken": "sess_xxx",
    "expiresAt": "2026-08-02T00:00:00.000Z",
    "phoneMasked": "138****8000",
    "merged": true
  }
}
```

---

## 一、心愿供灯 (qifu)

### POST /api/blessing/create

提交点灯订单。

| 字段 | 值 |
|------|-----|
| 页面 | `/qifu` |
| 动作 | 用户填写表单后点击「点亮此灯」 |
| Method | `POST` |
| Body | `{ userId, name, relation, lampType, duration, wish?, donorName? }` |

**Request:**
```json
{
  "userId": "anon_abc123",
  "name": "母亲姓名",
  "relation": "母亲",
  "lampType": "平安灯",
  "duration": "month",
  "wish": "希望家人平安",
  "donorName": "善信"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recordId": "rec_xxx",
    "orderId": "ord_xxx",
    "needsPayment": true,
    "amount": 3.9,
    "preview": {
      "lampType": "平安灯",
      "duration": "一月供奉",
      "maskedName": "母**",
      "maskedDonor": "善**"
    }
  }
}
```

**字段校验:**
- `name`: 必填, 1-20 字符
- `relation`: 必填, 枚举 [父亲,母亲,爱人,孩子,孙辈,朋友,自己]
- `lampType`: 必填, 枚举 [清心灯,智慧灯,长寿灯,平安灯,姻缘灯,财福灯]
- `duration`: 必填, 枚举 [month,100days,year,forever]
- `wish`: 可选, 0-80 字符
- `donorName`: 可选, 0-10 字符

**前端使用字段:** `data.recordId`, `data.orderId`, `data.needsPayment`, `data.amount`, `data.preview`

---

### GET /api/blessing/wall

获取心愿灯墙列表。

| 字段 | 值 |
|------|-----|
| 页面 | `/qifu` 心愿灯墙区域 |
| 动作 | 页面加载和滚动时获取 |
| Method | `GET` |
| Query | `?page=1&pageSize=40` |

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "maskedDonor": "善**",
        "maskedName": "武**",
        "lampType": "平安灯",
        "createdAt": "2026-06-29T10:00:00Z"
      }
    ],
    "total": 47,
    "todayNew": 0
  }
}
```

**前端使用字段:** `data.items[].maskedDonor`, `data.items[].maskedName`, `data.total`, `data.todayNew`

---

## 二、求灵签 (lottery)

### POST /api/fortune/draw

抽一支签。

| 字段 | 值 |
|------|-----|
| 页面 | `/lottery` |
| 动作 | 用户选择师父 + 输入问题后点击「默念所求 · 求一支签」 |
| Method | `POST` |
| Body | `{ userId, master, question?, recordId? }` |

**Request:**
```json
{
  "userId": "anon_abc123",
  "master": "huiming",
  "question": "家人身体能否安康？"
}
```

**Response (未支付 preview):**
```json
{
  "success": true,
  "data": {
    "recordId": "rec_xxx",
    "orderId": "ord_xxx",
    "needsPayment": true,
    "amount": 0,
    "preview": {
      "lotNumber": 42,
      "level": "中吉",
      "shortVerse": "万事顺遂，贵人相助",
      "masterName": "慧照长老"
    }
  }
}
```

**Response (已支付 fullResult):**
```json
{
  "success": true,
  "data": {
    "recordId": "rec_xxx",
    "orderId": "ord_xxx",
    "needsPayment": false,
    "preview": { ... },
    "fullResult": {
      "lotNumber": 42,
      "level": "中吉",
      "verse": "君问归期未有期...",
      "interpretation": "此签主...",
      "advice": "建议你...",
      "masterName": "慧照长老",
      "masterStyle": "庄重持重，引经据典"
    }
  }
}
```

**字段校验:**
- `master`: 必填, 枚举 [huiming, mingxin, xuanzhen]
- `question`: 可选, 0-200 字符

**前端使用字段:** `data.preview.lotNumber`, `data.preview.level`, `data.preview.shortVerse`, `data.preview.masterName`, `data.fullResult.*`

---

## 三、八字精批 (bazi)

### POST /api/fortune/bazi

提交生辰真排盘。

| 字段 | 值 |
|------|-----|
| 页面 | `/bazi` |
| 动作 | 填写生辰信息后点击「开始真排盘」 |
| Method | `POST` |
| Body | `{ userId, master, year, month, day, hour, gender }` |

**Request:**
```json
{
  "userId": "anon_abc123",
  "master": "huiming",
  "year": 1990,
  "month": 5,
  "day": 15,
  "hour": "未时 (13:00-15:00)",
  "gender": "男"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recordId": "rec_xxx",
    "orderId": "ord_xxx",
    "needsPayment": true,
    "amount": 19.9,
    "preview": {
      "bazi": "庚午 辛巳 甲戌 辛未",
      "dayMaster": "甲木",
      "summary": "命主甲木生于巳月，火旺木焚..."
    }
  }
}
```

**字段校验:**
- `master`: 必填, 枚举 [huiming, mingxin, xuanzhen]
- `year`: 必填, 1900-2100
- `month`: 必填, 1-12
- `day`: 必填, 1-31
- `hour`: 必填, 日期字符串
- `gender`: 必填, "男" | "女"

**前端使用字段:** `data.preview.bazi`, `data.preview.dayMaster`, `data.preview.summary`

---

## 四、周公解梦 (dream)

### POST /api/fortune/dream

解梦查询。

| 字段 | 值 |
|------|-----|
| 页面 | `/dream` |
| 动作 | 输入梦境内容后点击「解梦」 |
| Method | `POST` |
| Body | `{ userId, query }` |

**Request:**
```json
{
  "userId": "anon_abc123",
  "query": "梦见龙"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recordId": "rec_xxx",
    "query": "梦见龙",
    "result": {
      "title": "梦见龙",
      "level": "上上",
      "interpretation": "龙为祥瑞之兆..."
    }
  }
}
```

**字段校验:**
- `query`: 必填, 1-100 字符

**前端使用字段:** `data.result.title`, `data.result.level`, `data.result.interpretation`

---

## 五、手相/面相 (palmistry)

### POST /api/fortune/palmistry

提交手相/面相分析请求。

| 字段 | 值 |
|------|-----|
| 页面 | `/palmistry` |
| 动作 | 上传照片后点击「开始专业解读」 |
| Method | `POST` (multipart/form-data) |
| Body | `{ userId, master, mode, hand, image: File }` |

**Request (FormData):**
```
userId: anon_abc123
master: huiming
mode: hand
hand: left
image: [binary]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recordId": "rec_xxx",
    "orderId": "ord_xxx",
    "needsPayment": true,
    "amount": 29.9,
    "preview": {
      "summary": "掌色红润，生命线清晰...",
      "imageUrl": "/r2/palmistry/abc123.png"
    }
  }
}
```

**字段校验:**
- `master`: 必填
- `mode`: 必填, "hand" | "face"
- `hand`: 必填(当mode=hand时), "left" | "right"
- `image`: 必填, < 5MB, jpg/png

**前端使用字段:** `data.preview.summary`, `data.preview.imageUrl`

---

## 六、宝宝起名 (naming)

### POST /api/fortune/naming

提交起名请求。

| 字段 | 值 |
|------|-----|
| 页面 | `/naming` |
| 动作 | 填写信息后点击「开始专业起名」 |
| Method | `POST` |
| Body | `{ userId, mode, year, month, day, hour, gender, surname, wordCount, styles, beiFenZi?, avoidZi? }` |

**Request:**
```json
{
  "userId": "anon_abc123",
  "mode": "professional",
  "year": 2026,
  "month": 6,
  "day": 29,
  "hour": "未时 (13:00-15:00)",
  "gender": "男",
  "surname": "李",
  "wordCount": 3,
  "styles": ["诗意", "儒雅"],
  "beiFenZi": "",
  "avoidZi": ""
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recordId": "rec_xxx",
    "orderId": "ord_xxx",
    "needsPayment": true,
    "amount": 29.9,
    "preview": {
      "bazi": "丙午 甲午 甲戌 辛未",
      "wuxing": "火旺缺金",
      "samples": [
        { "name": "李清远", "reason": "清字补水..." }
      ]
    }
  }
}
```

**字段校验:**
- `surname`: 必填, 1-2 字符
- `wordCount`: 2 | 3
- `styles`: 可选数组, 每项枚举 [诗意,刚毅,儒雅,清逸,典雅,温润], 最多3项
- `beiFenZi`: 可选, 0-5 字符
- `avoidZi`: 可选, 0-100 字符

---

## 七、六爻占卜 (divination)

### POST /api/fortune/divination

六爻起卦。

| 字段 | 值 |
|------|-----|
| 页面 | `/divination` |
| 动作 | 输入问题后点击「摇动签筒」 |
| Method | `POST` |
| Body | `{ userId, master, question }` |

**Request:**
```json
{
  "userId": "anon_abc123",
  "master": "huiming",
  "question": "这次出行是否顺利？"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recordId": "rec_xxx",
    "orderId": "ord_xxx",
    "needsPayment": true,
    "amount": 0,
    "preview": {
      "hexagram": "䷀ 乾为天",
      "lines": [6, 7, 9, 7, 8, 7],
      "summary": "乾卦，大吉大利..."
    }
  }
}
```

**前端使用字段:** `data.preview.hexagram`, `data.preview.lines`, `data.preview.summary`

---

## 八、记录查询 (records)

### GET /api/records?userId={userId}&page=1&pageSize=20

获取用户所有服务记录。

| 字段 | 值 |
|------|-----|
| 说明 | 用户查看历史记录 |
| Method | `GET` |
| Query | `userId`, `page`, `pageSize` |

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "recordId": "rec_xxx",
        "type": "fortune_draw",
        "title": "关帝灵签 · 第42签",
        "summary": "中吉",
        "paid": false,
        "createdAt": "2026-06-29T10:00:00Z"
      }
    ],
    "total": 5,
    "page": 1,
    "pageSize": 20
  }
}
```

### GET /api/records/:recordId?userId={userId}

获取单条记录详情。

| 字段 | 值 |
|------|-----|
| 说明 | 已支付返回 fullResult，未支付仅返回 preview |
| Method | `GET` |

**Response:**
```json
{
  "success": true,
  "data": {
    "recordId": "rec_xxx",
    "type": "fortune_draw",
    "paid": true,
    "preview": { ... },
    "fullResult": { ... }
  }
}
```

---

## 九、订单与支付 (orders)

### POST /api/order/create

创建支付订单。

| 字段 | 值 |
|------|-----|
| 说明 | 所有付费服务需先生成订单 |
| Method | `POST` |
| Body | `{ userId, recordId, amount, type }` |

**Request:**
```json
{
  "userId": "anon_abc123",
  "recordId": "rec_xxx",
  "amount": 19.9,
  "type": "bazi"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "ord_xxx",
    "amount": 19.9,
    "status": "pending"
  }
}
```

### POST /api/order/complete

本地开发环境的支付确认接口。仅在 `MOCK_PAYMENT=true` 且非生产环境时可用，生产环境应接入正式支付回调。

| 字段 | 值 |
|------|-----|
| Method | `POST` |
| Body | `{ orderId, userId }` |

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "ord_xxx",
    "status": "paid",
    "recordId": "rec_xxx"
  }
}
```

---

## 统一错误响应

所有接口错误时返回:
```json
{
  "success": false,
  "message": "错误描述",
  "data": null
}
```

HTTP 状态码:
- `200` 业务成功
- `400` 参数校验失败
- `401` userId 无效
- `404` 记录/订单不存在
- `500` 服务器内部错误

---

## 脱敏规则

所有 `name` 字段仅在存储和展示时保留首字符，其余替换为 `*`:
- "张三" → "张*"
- "李思远" → "李**"
- "ABCD" → "A***"

`donorName` 同此规则。

---

## 定价表

| 服务 | 价格 |
|------|------|
| 心愿供灯 - 一月 | ¥3.9 |
| 心愿供灯 - 百日 | ¥5.9 |
| 心愿供灯 - 一年 | ¥9.9 |
| 心愿供灯 - 永久 | ¥19.9 |
| 八字精批 | ¥19.9 |
| 手相/面相 | ¥29.9 |
| 宝宝起名 | ¥29.9 |
| 求灵签 | 免费 |
| 周公解梦 | 免费 |
| 六爻占卜 | 免费 |
| 黄历查询 | 免费 |
