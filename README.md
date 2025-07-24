# FHEVM Gaming System 🎮

基于FHEVM的机密游戏系统，支持加密分数存储和隐私保护的排行榜，为玩家提供公平、透明的游戏体验。

## ✨ 核心特性

### 🔐 隐私保护
- **加密分数**: 所有游戏分数都经过FHEVM加密存储
- **隐私排行榜**: 排行榜数据加密，防止作弊和恶意竞争
- **机密成就**: 成就数据加密保护，增加游戏神秘感

### 🎮 游戏功能
- **多游戏类型**: 支持益智、动作、策略、休闲等多种游戏类型
- **等级系统**: 基于经验值的等级提升机制
- **成就系统**: 丰富的成就奖励机制
- **实时统计**: 玩家游戏数据实时更新

### 🛡️ 反作弊系统
- **分数验证**: 多重验证机制确保分数真实性
- **异常检测**: 自动检测可疑游戏行为
- **时间限制**: 游戏会话时间限制防止异常操作
- **冷却机制**: 防止频繁提交分数

## 🚀 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0
- Hardhat 开发环境
- FHEVM 兼容网络

### 安装依赖
```bash
npm install
```

### 环境配置
```bash
cp .env.example .env
# 编辑 .env 文件，配置网络和密钥信息
```

### 编译合约
```bash
npm run compile
```

### 运行测试
```bash
npm test
```

### 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:3000 查看游戏系统界面。

## 📁 项目结构

```
gaming-system/
├── contracts/              # 智能合约
│   └── GamingSystem.sol   # 游戏系统主合约
├── scripts/                # 部署脚本
│   └── deploy.js          # 合约部署脚本
├── test/                   # 测试文件
│   └── GamingSystem.test.js # 合约测试
├── public/                 # 前端文件
│   └── index.html         # 游戏界面
├── .env.example           # 环境变量模板
├── hardhat.config.js      # Hardhat配置
├── package.json           # 项目配置
├── server.js              # Express服务器
└── README.md              # 项目文档
```

## 🎯 核心功能

### 玩家管理
- **玩家注册**: 新玩家注册和初始化
- **统计追踪**: 总分数、最高分、游戏次数等统计
- **等级系统**: 基于经验值的等级计算
- **活跃状态**: 玩家活跃状态管理

### 游戏会话
- **会话创建**: 开始新的游戏会话
- **分数提交**: 加密分数安全提交
- **会话管理**: 游戏会话状态控制
- **超时处理**: 自动处理超时会话

### 排行榜系统
- **分类排行**: 按游戏类型分类的排行榜
- **实时更新**: 排行榜实时更新
- **隐私保护**: 排行榜数据加密存储
- **历史记录**: 排行榜历史数据保存

### 成就系统
- **成就解锁**: 达成条件自动解锁成就
- **加密存储**: 成就数据加密保护
- **奖励机制**: 成就奖励自动发放
- **进度追踪**: 成就进度实时更新

## 📡 API 文档

### 智能合约接口

#### 注册玩家
```solidity
function registerPlayer() external
```

#### 开始游戏会话
```solidity
function startGameSession(GameType gameType, uint256 duration) external returns (uint256)
```

#### 提交分数
```solidity
function submitScore(uint256 sessionId, bytes calldata encryptedScore) external
```

#### 结束游戏会话
```solidity
function endGameSession(uint256 sessionId) external
```

### REST API

#### 健康检查
```
GET /api/health
```

#### 获取配置
```
GET /api/config
```

#### 部署信息
```
GET /api/deployments
```

## 🧪 测试

### 运行所有测试
```bash
npm test
```

### 测试覆盖率
```bash
npm run coverage
```

### Gas 使用报告
```bash
npm run gas
```

## 🚀 部署

### 本地部署
```bash
npm run deploy:local
```

### 测试网部署
```bash
npm run deploy:sepolia
```

### 主网部署
```bash
npm run deploy:mainnet
```

## ⚙️ 配置说明

### 游戏参数
- `DEFAULT_GAME_DURATION`: 默认游戏时长（秒）
- `MAX_GAME_DURATION`: 最大游戏时长（秒）
- `MAX_SCORE_PER_GAME`: 单局游戏最高分数
- `LEADERBOARD_SIZE`: 排行榜显示数量
- `ANTI_CHEAT_THRESHOLD`: 反作弊阈值

### 反作弊设置
- `SCORE_VERIFICATION_ENABLED`: 是否启用分数验证
- `SUSPICIOUS_ACTIVITY_LIMIT`: 可疑行为限制次数
- `MIN_SCORE_INTERVAL`: 最小分数提交间隔

### 成就系统
- `ACHIEVEMENT_SYSTEM_ENABLED`: 是否启用成就系统
- `EXPERIENCE_MULTIPLIER`: 经验值倍数
- `LEVEL_UP_THRESHOLD`: 升级所需经验值

## 🔒 安全考虑

1. **分数验证**: 多重验证机制防止分数作弊
2. **时间控制**: 游戏会话时间限制防止异常操作
3. **频率限制**: 防止频繁提交和刷分行为
4. **异常检测**: 自动检测和标记可疑行为
5. **权限管理**: 严格的管理员权限控制

## 🎮 游戏类型

### 益智游戏 (PUZZLE)
- 逻辑推理类游戏
- 数学计算类游戏
- 记忆训练类游戏

### 动作游戏 (ACTION)
- 反应速度类游戏
- 操作技巧类游戏
- 竞技对战类游戏

### 策略游戏 (STRATEGY)
- 战略规划类游戏
- 资源管理类游戏
- 回合制策略游戏

### 休闲游戏 (CASUAL)
- 轻松娱乐类游戏
- 社交互动类游戏
- 放置挂机类游戏

## 🏆 成就系统

### 分数成就
- 首次得分
- 达到特定分数
- 连续高分

### 游戏成就
- 游戏次数里程碑
- 连续游戏天数
- 不同游戏类型体验

### 等级成就
- 等级提升
- 经验值累积
- 排行榜位置

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [FHEVM](https://github.com/zama-ai/fhevm) - 全同态加密虚拟机
- [Hardhat](https://hardhat.org/) - 以太坊开发环境
- [OpenZeppelin](https://openzeppelin.com/) - 安全的智能合约库

## 📞 联系我们

- 项目主页: [GitHub Repository](https://github.com/your-org/gaming-system)
- 问题反馈: [Issues](https://github.com/your-org/gaming-system/issues)
- 邮箱: contact@your-org.com

---

**注意**: 这是一个演示项目，请在生产环境使用前进行充分的安全审计和测试。