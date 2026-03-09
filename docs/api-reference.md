# Visa Bulletin — iOS 前端对接文档

iOS 直接 fetch GitHub 静态 JSON 文件，无后端服务。

---

## 1. 架构

```
GitHub Actions (每月自动)  →  抓取 travel.state.gov  →  生成 JSON → git push
iOS App                    →  fetch raw URL           →  本地计算 changes / trends
```

---

## 2. 数据源 URL

```
https://raw.githubusercontent.com/aiyurealestateagent/VisaBulletin/main/data/latest.json
https://raw.githubusercontent.com/aiyurealestateagent/VisaBulletin/main/data/trend.json
```

| 文件 | 内容 | iOS 用途 |
|------|------|----------|
| `latest.json` | 最近 2 期 bulletin | 显示排期 + 计算变化 |
| `trend.json` | 最近 12 期 bulletin | 趋势图 |

---

## 3. 数据结构

每条 bulletin 的格式：

```json
{
  "id": "2026-03",
  "bulletin_date": "2026-03",
  "published_date": "2026-03-12",
  "data": { ... },
  "created_at": "2026-03-12T12:00:00.000Z"
}
```

---

## 4. `data` 完整结构

```json
{
  "employmentBased": {
    "finalActionDates": {
      "EB-1":  { "allOther": "C", "china": "2023-02-01", "india": "2023-02-01", "mexico": "C", "philippines": "C" },
      "EB-2":  { "allOther": "2024-04-01", "china": "2021-09-01", "india": "2013-07-15", "mexico": "2024-04-01", "philippines": "2024-04-01" },
      "EB-3":  { ... },
      "Other Workers": { ... },
      "EB-4": { ... },
      "Certain Religious Workers": { ... },
      "EB-5 Unreserved": { ... },
      "EB-5 Set Aside: Rural": { ... },
      "EB-5 Set Aside: High Unemployment": { ... },
      "EB-5 Set Aside: Infrastructure": { ... }
    },
    "datesForFiling": { ... }
  },
  "familyBased": {
    "finalActionDates": {
      "F1":  { "allOther": "2016-11-08", "china": "2016-11-08", "india": "2016-11-08", "mexico": "2006-12-22", "philippines": "2013-03-01" },
      "F2A": { ... },
      "F2B": { ... },
      "F3":  { ... },
      "F4":  { ... }
    },
    "datesForFiling": { ... }
  }
}
```

每个日期值有三种可能：

| 值 | 含义 |
|----|------|
| `"2013-07-15"` | 优先日期截止日 (YYYY-MM-DD) |
| `"C"` | Current，无排期 |
| `"U"` | Unavailable，不可用 |

---

## 5. 枚举值速查

### 国家 key

| Key | 对应 |
|-----|------|
| `allOther` | All Chargeability Areas Except Those Listed |
| `china` | China (Mainland born) |
| `india` | India |
| `mexico` | Mexico |
| `philippines` | Philippines |

### Employment-Based 类别

`EB-1`, `EB-2`, `EB-3`, `Other Workers`, `EB-4`, `Certain Religious Workers`, `EB-5 Unreserved`, `EB-5 Set Aside: Rural`, `EB-5 Set Aside: High Unemployment`, `EB-5 Set Aside: Infrastructure`

### Family-Based 类别

`F1`, `F2A`, `F2B`, `F3`, `F4`

### 表类型

| Key | 说明 |
|-----|------|
| `finalActionDates` | 最终裁定日（签证可签发日） |
| `datesForFiling` | 递交申请日（可提交申请的最早日期） |

---

## 6. iOS 查询方式

直接 fetch JSON URL，解码为 `[BulletinRow]`：

```swift
func fetchLatestBulletins() async throws -> [BulletinRow] {
    let url = URL(string: "https://raw.githubusercontent.com/aiyurealestateagent/VisaBulletin/main/data/latest.json")!
    let (data, _) = try await URLSession.shared.data(from: url)
    return try JSONDecoder().decode([BulletinRow].self, from: data)
}

func fetchTrendData() async throws -> [BulletinRow] {
    let url = URL(string: "https://raw.githubusercontent.com/aiyurealestateagent/VisaBulletin/main/data/trend.json")!
    let (data, _) = try await URLSession.shared.data(from: url)
    return try JSONDecoder().decode([BulletinRow].self, from: data)
}
```

---

## 7. iOS Swift Models

```swift
// MARK: - Date Value

/// 排期日期值："YYYY-MM-DD" / "C" (Current) / "U" (Unavailable)
enum PriorityDateValue: Codable, Equatable {
    case date(Date)
    case current
    case unavailable

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let string = try container.decode(String.self)
        switch string {
        case "C": self = .current
        case "U": self = .unavailable
        default:
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            formatter.locale = Locale(identifier: "en_US_POSIX")
            guard let date = formatter.date(from: string) else {
                throw DecodingError.dataCorruptedError(
                    in: container,
                    debugDescription: "Invalid date: \(string)"
                )
            }
            self = .date(date)
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .current: try container.encode("C")
        case .unavailable: try container.encode("U")
        case .date(let date):
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            formatter.locale = Locale(identifier: "en_US_POSIX")
            try container.encode(formatter.string(from: date))
        }
    }
}

// MARK: - Core Models

struct CountryDates: Codable {
    let allOther: PriorityDateValue
    let china: PriorityDateValue
    let india: PriorityDateValue
    let mexico: PriorityDateValue
    let philippines: PriorityDateValue
}

struct BulletinSection: Codable {
    let finalActionDates: [String: CountryDates]
    let datesForFiling: [String: CountryDates]
}

struct BulletinData: Codable {
    let employmentBased: BulletinSection
    let familyBased: BulletinSection
}

struct BulletinRow: Codable, Identifiable {
    let id: String
    let bulletinDate: String
    let publishedDate: String?
    let data: BulletinData
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case bulletinDate = "bulletin_date"
        case publishedDate = "published_date"
        case data
        case createdAt = "created_at"
    }
}
```

---

## 8. iOS 端计算逻辑

### 8.1 计算两期之间的变化

```swift
/// 计算两个日期值之间相差的天数
func daysAdvanced(current: PriorityDateValue, previous: PriorityDateValue) -> Int? {
    guard case .date(let curr) = current, case .date(let prev) = previous else {
        return nil  // C 或 U 无法计算
    }
    return Calendar.current.dateComponents([.day], from: prev, to: curr).day
}

// 用法：取最新 2 期，对比 EB-2 india
let rows = ... // fetch latest.json 拿到的 [BulletinRow], 按 bulletin_date desc 排序
let current = rows[0].data.employmentBased.finalActionDates["EB-2"]!.india
let previous = rows[1].data.employmentBased.finalActionDates["EB-2"]!.india

if let days = daysAdvanced(current: current, previous: previous) {
    // days > 0: 前进, < 0: 倒退
    // 显示 "+75d" 或 "-30d"
}
```

### 8.2 提取趋势数据

```swift
/// 从多期 bulletin 中提取某个类别/国家的趋势
func extractTrend(
    rows: [BulletinRow],        // 按 bulletin_date 升序
    section: KeyPath<BulletinData, BulletinSection>,
    table: KeyPath<BulletinSection, [String: CountryDates]>,
    category: String,
    country: KeyPath<CountryDates, PriorityDateValue>
) -> [(date: String, value: PriorityDateValue)] {
    rows.compactMap { row in
        guard let categoryData = row.data[keyPath: section][keyPath: table][category] else {
            return nil
        }
        return (row.bulletinDate, categoryData[keyPath: country])
    }
}

// 用法：EB-2 india finalActionDates 最近 12 个月
let trend = extractTrend(
    rows: rows.reversed(),  // 升序
    section: \.employmentBased,
    table: \.finalActionDates,
    category: "EB-2",
    country: \.india
)
// → [("2025-03", .date(...)), ("2025-04", .date(...)), ...]
// 用 Swift Charts 绘制
```
