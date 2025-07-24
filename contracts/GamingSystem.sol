// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./TFHE.sol";

/**
 * @title GamingSystem
 * @dev 基于FHEVM的机密游戏系统
 * @notice 支持加密分数存储和隐私保护的排行榜
 */
contract GamingSystem {
    using TFHE for euint32;
    using TFHE for euint64;
    using TFHE for ebool;

    // 游戏类型枚举
    enum GameType { PUZZLE, ACTION, STRATEGY, CASUAL }
    
    // 游戏状态枚举
    enum GameStatus { ACTIVE, PAUSED, ENDED }

    // 游戏会话结构
    struct GameSession {
        uint256 id;
        address player;
        GameType gameType;
        uint256 startTime;
        uint256 endTime;
        euint32 score;           // 加密分数
        euint32 level;           // 加密等级
        euint64 experience;      // 加密经验值
        GameStatus status;
        bool verified;
        mapping(string => euint32) achievements; // 加密成就数据
    }

    // 玩家统计结构
    struct PlayerStats {
        euint32 totalScore;      // 总分数（加密）
        euint32 highestScore;    // 最高分数（加密）
        euint32 gamesPlayed;     // 游戏次数（加密）
        euint64 totalExperience; // 总经验（加密）
        euint32 currentLevel;    // 当前等级（加密）
        uint256 lastPlayTime;
        bool isActive;
    }

    // 排行榜条目
    struct LeaderboardEntry {
        address player;
        euint32 score;
        uint256 timestamp;
        GameType gameType;
    }

    // 状态变量
    address public owner;
    uint256 public sessionCount;
    uint256 public constant MAX_SCORE = 1000000;
    uint256 public constant MAX_LEVEL = 100;
    uint256 public constant LEADERBOARD_SIZE = 100;
    uint256 public constant SESSION_TIMEOUT = 30 minutes;
    
    // 存储游戏会话
    mapping(uint256 => GameSession) public gameSessions;
    
    // 玩家统计
    mapping(address => PlayerStats) public playerStats;
    
    // 排行榜（按游戏类型）
    mapping(GameType => LeaderboardEntry[]) public leaderboards;
    
    // 注册玩家
    mapping(address => bool) public registeredPlayers;
    
    // 游戏管理员
    mapping(address => bool) public gameAdmins;
    
    // 反作弊系统
    mapping(address => uint256) public lastScoreSubmission;
    mapping(address => uint256) public suspiciousActivity;
    
    // 事件
    event PlayerRegistered(address indexed player, uint256 timestamp);
    
    event GameSessionStarted(
        uint256 indexed sessionId,
        address indexed player,
        GameType gameType,
        uint256 startTime
    );
    
    event GameSessionEnded(
        uint256 indexed sessionId,
        address indexed player,
        uint256 endTime
    );
    
    event ScoreSubmitted(
        uint256 indexed sessionId,
        address indexed player,
        uint256 timestamp
    );
    
    event AchievementUnlocked(
        address indexed player,
        string achievement,
        uint256 timestamp
    );
    
    event LeaderboardUpdated(
        GameType indexed gameType,
        address indexed player,
        uint256 position
    );
    
    event SuspiciousActivityDetected(
        address indexed player,
        string reason,
        uint256 timestamp
    );
    
    // 修饰符
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyGameAdmin() {
        require(gameAdmins[msg.sender] || msg.sender == owner, "Not authorized");
        _;
    }
    
    modifier onlyRegisteredPlayer() {
        require(registeredPlayers[msg.sender], "Player not registered");
        _;
    }
    
    modifier sessionExists(uint256 sessionId) {
        require(sessionId < sessionCount, "Session does not exist");
        _;
    }
    
    modifier sessionActive(uint256 sessionId) {
        require(
            gameSessions[sessionId].status == GameStatus.ACTIVE &&
            block.timestamp <= gameSessions[sessionId].endTime,
            "Session not active"
        );
        _;
    }

    /**
     * @dev 构造函数
     */
    constructor() {
        owner = msg.sender;
        gameAdmins[msg.sender] = true;
    }

    /**
     * @dev 注册玩家
     */
    function registerPlayer() external {
        require(!registeredPlayers[msg.sender], "Player already registered");
        
        registeredPlayers[msg.sender] = true;
        
        // 初始化玩家统计
        PlayerStats storage stats = playerStats[msg.sender];
        stats.totalScore = TFHE.asEuint32(0);
        stats.highestScore = TFHE.asEuint32(0);
        stats.gamesPlayed = TFHE.asEuint32(0);
        stats.totalExperience = TFHE.asEuint64(0);
        stats.currentLevel = TFHE.asEuint32(1);
        stats.lastPlayTime = block.timestamp;
        stats.isActive = true;
        
        emit PlayerRegistered(msg.sender, block.timestamp);
    }

    /**
     * @dev 开始游戏会话
     * @param gameType 游戏类型
     * @param duration 游戏持续时间（秒）
     */
    function startGameSession(GameType gameType, uint256 duration)
        external
        onlyRegisteredPlayer
        returns (uint256)
    {
        require(duration > 0 && duration <= SESSION_TIMEOUT, "Invalid duration");
        
        uint256 sessionId = sessionCount++;
        GameSession storage session = gameSessions[sessionId];
        
        session.id = sessionId;
        session.player = msg.sender;
        session.gameType = gameType;
        session.startTime = block.timestamp;
        session.endTime = block.timestamp + duration;
        session.score = TFHE.asEuint32(0);
        session.level = TFHE.asEuint32(1);
        session.experience = TFHE.asEuint64(0);
        session.status = GameStatus.ACTIVE;
        session.verified = false;
        
        emit GameSessionStarted(sessionId, msg.sender, gameType, block.timestamp);
        
        return sessionId;
    }

    /**
     * @dev 提交游戏分数
     * @param sessionId 会话ID
     * @param encryptedScore 加密分数
     * @param encryptedLevel 加密等级
     * @param encryptedExperience 加密经验值
     */
    function submitScore(
        uint256 sessionId,
        einput encryptedScore,
        einput encryptedLevel,
        einput encryptedExperience,
        bytes calldata scoreProof,
        bytes calldata levelProof,
        bytes calldata expProof
    ) external
        onlyRegisteredPlayer
        sessionExists(sessionId)
        sessionActive(sessionId)
    {
        GameSession storage session = gameSessions[sessionId];
        require(session.player == msg.sender, "Not your session");
        
        // 反作弊检查
        require(
            block.timestamp >= lastScoreSubmission[msg.sender] + 1 seconds,
            "Score submission too frequent"
        );
        
        euint32 score = TFHE.asEuint32(encryptedScore, scoreProof);
        euint32 level = TFHE.asEuint32(encryptedLevel, levelProof);
        euint64 experience = TFHE.asEuint64(encryptedExperience, expProof);
        
        // 验证分数合理性
        ebool validScore = TFHE.le(score, TFHE.asEuint32(MAX_SCORE));
        ebool validLevel = TFHE.le(level, TFHE.asEuint32(MAX_LEVEL));
        
        if (!TFHE.decrypt(validScore) || !TFHE.decrypt(validLevel)) {
            suspiciousActivity[msg.sender]++;
            emit SuspiciousActivityDetected(
                msg.sender,
                "Invalid score or level",
                block.timestamp
            );
            return;
        }
        
        // 更新会话数据
        session.score = score;
        session.level = level;
        session.experience = experience;
        session.verified = true;
        
        // 更新玩家统计
        PlayerStats storage stats = playerStats[msg.sender];
        stats.totalScore = TFHE.add(stats.totalScore, score);
        stats.gamesPlayed = TFHE.add(stats.gamesPlayed, TFHE.asEuint32(1));
        stats.totalExperience = TFHE.add(stats.totalExperience, experience);
        stats.lastPlayTime = block.timestamp;
        
        // 更新最高分数
        ebool isNewHighScore = TFHE.gt(score, stats.highestScore);
        stats.highestScore = TFHE.select(isNewHighScore, score, stats.highestScore);
        
        // 更新等级
        ebool levelUp = TFHE.gt(level, stats.currentLevel);
        stats.currentLevel = TFHE.select(levelUp, level, stats.currentLevel);
        
        lastScoreSubmission[msg.sender] = block.timestamp;
        
        emit ScoreSubmitted(sessionId, msg.sender, block.timestamp);
        
        // 更新排行榜
        _updateLeaderboard(session.gameType, msg.sender, score);
    }

    /**
     * @dev 结束游戏会话
     * @param sessionId 会话ID
     */
    function endGameSession(uint256 sessionId)
        external
        sessionExists(sessionId)
    {
        GameSession storage session = gameSessions[sessionId];
        require(
            session.player == msg.sender || gameAdmins[msg.sender],
            "Not authorized"
        );
        require(session.status == GameStatus.ACTIVE, "Session not active");
        
        session.status = GameStatus.ENDED;
        session.endTime = block.timestamp;
        
        emit GameSessionEnded(sessionId, session.player, block.timestamp);
    }

    /**
     * @dev 解锁成就
     * @param player 玩家地址
     * @param achievement 成就名称
     * @param encryptedValue 加密的成就值
     */
    function unlockAchievement(
        address player,
        string memory achievement,
        einput encryptedValue,
        bytes calldata inputProof
    ) external onlyGameAdmin {
        require(registeredPlayers[player], "Player not registered");
        
        // 这里应该有一个活跃的会话来添加成就
        // 为简化，我们假设最新的会话
        uint256 latestSessionId = sessionCount - 1;
        GameSession storage session = gameSessions[latestSessionId];
        
        if (session.player == player) {
            euint32 value = TFHE.asEuint32(encryptedValue, inputProof);
            session.achievements[achievement] = value;
            
            emit AchievementUnlocked(player, achievement, block.timestamp);
        }
    }

    /**
     * @dev 比较两个玩家的分数
     * @param player1 玩家1地址
     * @param player2 玩家2地址
     * @return 玩家1分数是否更高（加密结果）
     */
    function comparePlayerScores(address player1, address player2)
        external
        view
        returns (ebool)
    {
        require(registeredPlayers[player1] && registeredPlayers[player2], "Players not registered");
        
        euint32 score1 = playerStats[player1].highestScore;
        euint32 score2 = playerStats[player2].highestScore;
        
        return TFHE.gt(score1, score2);
    }

    /**
     * @dev 获取玩家统计（加密）
     * @param player 玩家地址
     */
    function getPlayerStats(address player)
        external
        view
        returns (
            euint32 totalScore,
            euint32 highestScore,
            euint32 gamesPlayed,
            euint64 totalExperience,
            euint32 currentLevel,
            uint256 lastPlayTime,
            bool isActive
        )
    {
        require(
            msg.sender == player || gameAdmins[msg.sender],
            "Not authorized to view stats"
        );
        
        PlayerStats storage stats = playerStats[player];
        return (
            stats.totalScore,
            stats.highestScore,
            stats.gamesPlayed,
            stats.totalExperience,
            stats.currentLevel,
            stats.lastPlayTime,
            stats.isActive
        );
    }

    /**
     * @dev 获取游戏会话信息
     * @param sessionId 会话ID
     */
    function getGameSession(uint256 sessionId)
        external
        view
        sessionExists(sessionId)
        returns (
            address player,
            GameType gameType,
            uint256 startTime,
            uint256 endTime,
            GameStatus status,
            bool verified
        )
    {
        GameSession storage session = gameSessions[sessionId];
        require(
            session.player == msg.sender || gameAdmins[msg.sender],
            "Not authorized"
        );
        
        return (
            session.player,
            session.gameType,
            session.startTime,
            session.endTime,
            session.status,
            session.verified
        );
    }

    /**
     * @dev 获取排行榜长度
     * @param gameType 游戏类型
     */
    function getLeaderboardLength(GameType gameType)
        external
        view
        returns (uint256)
    {
        return leaderboards[gameType].length;
    }

    /**
     * @dev 获取排行榜条目（不包含加密分数）
     * @param gameType 游戏类型
     * @param index 索引
     */
    function getLeaderboardEntry(GameType gameType, uint256 index)
        external
        view
        returns (
            address player,
            uint256 timestamp
        )
    {
        require(index < leaderboards[gameType].length, "Index out of bounds");
        
        LeaderboardEntry storage entry = leaderboards[gameType][index];
        return (entry.player, entry.timestamp);
    }

    /**
     * @dev 添加游戏管理员
     * @param admin 管理员地址
     */
    function addGameAdmin(address admin) external onlyOwner {
        require(admin != address(0), "Invalid admin address");
        gameAdmins[admin] = true;
    }

    /**
     * @dev 移除游戏管理员
     * @param admin 管理员地址
     */
    function removeGameAdmin(address admin) external onlyOwner {
        require(admin != owner, "Cannot remove owner");
        gameAdmins[admin] = false;
    }

    /**
     * @dev 暂停玩家账户
     * @param player 玩家地址
     */
    function suspendPlayer(address player) external onlyGameAdmin {
        require(registeredPlayers[player], "Player not registered");
        playerStats[player].isActive = false;
    }

    /**
     * @dev 恢复玩家账户
     * @param player 玩家地址
     */
    function unsuspendPlayer(address player) external onlyGameAdmin {
        require(registeredPlayers[player], "Player not registered");
        playerStats[player].isActive = true;
    }

    /**
     * @dev 重置可疑活动计数
     * @param player 玩家地址
     */
    function resetSuspiciousActivity(address player) external onlyGameAdmin {
        suspiciousActivity[player] = 0;
    }

    /**
     * @dev 内部函数：更新排行榜
     * @param gameType 游戏类型
     * @param player 玩家地址
     * @param score 分数
     */
    function _updateLeaderboard(
        GameType gameType,
        address player,
        euint32 score
    ) internal {
        LeaderboardEntry[] storage leaderboard = leaderboards[gameType];
        
        // 创建新条目
        LeaderboardEntry memory newEntry = LeaderboardEntry({
            player: player,
            score: score,
            timestamp: block.timestamp,
            gameType: gameType
        });
        
        // 如果排行榜未满，直接添加
        if (leaderboard.length < LEADERBOARD_SIZE) {
            leaderboard.push(newEntry);
            emit LeaderboardUpdated(gameType, player, leaderboard.length - 1);
            return;
        }
        
        // 找到插入位置（简化实现，实际应该使用更高效的排序）
        for (uint256 i = 0; i < leaderboard.length; i++) {
            ebool higherScore = TFHE.gt(score, leaderboard[i].score);
            if (TFHE.decrypt(higherScore)) {
                // 移动后续元素
                for (uint256 j = leaderboard.length - 1; j > i; j--) {
                    leaderboard[j] = leaderboard[j - 1];
                }
                // 插入新条目
                leaderboard[i] = newEntry;
                emit LeaderboardUpdated(gameType, player, i);
                break;
            }
        }
    }

    /**
     * @dev 转移所有权
     * @param newOwner 新所有者地址
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        require(newOwner != owner, "New owner cannot be current owner");
        
        gameAdmins[newOwner] = true;
        owner = newOwner;
    }

    /**
     * @dev 获取会话总数
     */
    function getSessionCount() external view returns (uint256) {
        return sessionCount;
    }

    /**
     * @dev 检查玩家是否注册
     * @param player 玩家地址
     */
    function isPlayerRegistered(address player) external view returns (bool) {
        return registeredPlayers[player];
    }

    /**
     * @dev 获取可疑活动计数
     * @param player 玩家地址
     */
    function getSuspiciousActivityCount(address player)
        external
        view
        onlyGameAdmin
        returns (uint256)
    {
        return suspiciousActivity[player];
    }
}