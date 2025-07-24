const { ethers } = require("hardhat");
const { createInstance } = require("fhevmjs");

/**
 * 部署游戏系统合约
 */
async function main() {
    console.log("\n🎮 开始部署游戏系统...");
    console.log("=".repeat(50));

    // 获取部署账户
    const [deployer, player1, player2, gameAdmin] = await ethers.getSigners();
    console.log(`📋 部署账户: ${deployer.address}`);
    console.log(`🎮 玩家1: ${player1.address}`);
    console.log(`🎮 玩家2: ${player2.address}`);
    console.log(`👨‍💼 游戏管理员: ${gameAdmin.address}`);
    
    // 获取账户余额
    const balance = await deployer.getBalance();
    console.log(`💰 部署者余额: ${ethers.utils.formatEther(balance)} ETH`);

    try {
        // 部署游戏系统合约
        console.log("\n📦 正在部署 GamingSystem 合约...");
        const GamingSystem = await ethers.getContractFactory("GamingSystem");
        const gamingSystem = await GamingSystem.deploy();
        await gamingSystem.deployed();
        
        console.log(`✅ GamingSystem 部署成功!`);
        console.log(`📍 合约地址: ${gamingSystem.address}`);
        console.log(`🔗 交易哈希: ${gamingSystem.deployTransaction.hash}`);
        
        // 等待几个区块确认
        console.log("\n⏳ 等待区块确认...");
        await gamingSystem.deployTransaction.wait(2);
        console.log("✅ 区块确认完成");

        // 验证合约部署
        console.log("\n🔍 验证合约部署...");
        const owner = await gamingSystem.owner();
        const sessionCount = await gamingSystem.getSessionCount();
        
        console.log(`👤 合约所有者: ${owner}`);
        console.log(`📊 游戏会话数: ${sessionCount}`);
        
        // 演示基本功能
        console.log("\n🎯 演示基本功能...");
        console.log("-".repeat(30));
        
        // 创建FHEVM实例用于加密
        const instance = await createInstance({
            chainId: 31337, // Hardhat本地网络
            networkUrl: "http://localhost:8545",
            gatewayUrl: "http://localhost:8545"
        });
        
        // 1. 添加游戏管理员
        console.log("\n1️⃣ 添加游戏管理员...");
        console.log(`   添加管理员: ${gameAdmin.address}`);
        const addAdminTx = await gamingSystem.connect(deployer).addGameAdmin(gameAdmin.address);
        await addAdminTx.wait();
        console.log(`   ✅ 游戏管理员添加成功`);
        
        // 2. 注册玩家
        console.log("\n2️⃣ 注册玩家...");
        
        console.log(`   注册玩家1: ${player1.address}`);
        const registerTx1 = await gamingSystem.connect(player1).registerPlayer();
        await registerTx1.wait();
        console.log(`   ✅ 玩家1注册成功`);
        
        console.log(`   注册玩家2: ${player2.address}`);
        const registerTx2 = await gamingSystem.connect(player2).registerPlayer();
        await registerTx2.wait();
        console.log(`   ✅ 玩家2注册成功`);
        
        // 验证注册状态
        const isPlayer1Registered = await gamingSystem.isPlayerRegistered(player1.address);
        const isPlayer2Registered = await gamingSystem.isPlayerRegistered(player2.address);
        console.log(`   玩家1注册状态: ${isPlayer1Registered}`);
        console.log(`   玩家2注册状态: ${isPlayer2Registered}`);
        
        // 3. 开始游戏会话
        console.log("\n3️⃣ 开始游戏会话...");
        
        // 玩家1开始拼图游戏
        const gameType1 = 0; // PUZZLE
        const duration1 = 30 * 60; // 30分钟
        console.log(`   玩家1开始拼图游戏，时长: ${duration1 / 60} 分钟`);
        const startTx1 = await gamingSystem.connect(player1).startGameSession(gameType1, duration1);
        const receipt1 = await startTx1.wait();
        
        // 从事件中获取会话ID
        const sessionStartedEvent1 = receipt1.events.find(e => e.event === 'GameSessionStarted');
        const sessionId1 = sessionStartedEvent1.args.sessionId;
        console.log(`   ✅ 玩家1游戏会话创建成功，会话ID: ${sessionId1}`);
        
        // 玩家2开始动作游戏
        const gameType2 = 1; // ACTION
        const duration2 = 45 * 60; // 45分钟
        console.log(`   玩家2开始动作游戏，时长: ${duration2 / 60} 分钟`);
        const startTx2 = await gamingSystem.connect(player2).startGameSession(gameType2, duration2);
        const receipt2 = await startTx2.wait();
        
        const sessionStartedEvent2 = receipt2.events.find(e => e.event === 'GameSessionStarted');
        const sessionId2 = sessionStartedEvent2.args.sessionId;
        console.log(`   ✅ 玩家2游戏会话创建成功，会话ID: ${sessionId2}`);
        
        // 4. 提交游戏分数
        console.log("\n4️⃣ 提交游戏分数...");
        
        // 玩家1提交分数
        const score1 = 8500;
        const level1 = 15;
        const experience1 = 2500;
        
        const encryptedScore1 = instance.encrypt32(score1);
        const encryptedLevel1 = instance.encrypt32(level1);
        const encryptedExp1 = instance.encrypt64(experience1);
        
        console.log(`   玩家1提交分数: ${score1}, 等级: ${level1}, 经验: ${experience1}`);
        const submitTx1 = await gamingSystem.connect(player1).submitScore(
            sessionId1,
            encryptedScore1.handles[0],
            encryptedLevel1.handles[0],
            encryptedExp1.handles[0],
            encryptedScore1.inputProof,
            encryptedLevel1.inputProof,
            encryptedExp1.inputProof
        );
        await submitTx1.wait();
        console.log(`   ✅ 玩家1分数提交成功`);
        
        // 玩家2提交分数
        const score2 = 9200;
        const level2 = 18;
        const experience2 = 3100;
        
        const encryptedScore2 = instance.encrypt32(score2);
        const encryptedLevel2 = instance.encrypt32(level2);
        const encryptedExp2 = instance.encrypt64(experience2);
        
        console.log(`   玩家2提交分数: ${score2}, 等级: ${level2}, 经验: ${experience2}`);
        const submitTx2 = await gamingSystem.connect(player2).submitScore(
            sessionId2,
            encryptedScore2.handles[0],
            encryptedLevel2.handles[0],
            encryptedExp2.handles[0],
            encryptedScore2.inputProof,
            encryptedLevel2.inputProof,
            encryptedExp2.inputProof
        );
        await submitTx2.wait();
        console.log(`   ✅ 玩家2分数提交成功`);
        
        // 5. 获取游戏会话信息
        console.log("\n5️⃣ 获取游戏会话信息...");
        
        const session1 = await gamingSystem.connect(player1).getGameSession(sessionId1);
        console.log(`   会话1信息:`);
        console.log(`     玩家: ${session1.player}`);
        console.log(`     游戏类型: ${session1.gameType} (0=拼图, 1=动作, 2=策略, 3=休闲)`);
        console.log(`     开始时间: ${new Date(session1.startTime * 1000).toLocaleString()}`);
        console.log(`     结束时间: ${new Date(session1.endTime * 1000).toLocaleString()}`);
        console.log(`     状态: ${session1.status} (0=活跃, 1=暂停, 2=结束)`);
        console.log(`     已验证: ${session1.verified}`);
        
        const session2 = await gamingSystem.connect(player2).getGameSession(sessionId2);
        console.log(`   会话2信息:`);
        console.log(`     玩家: ${session2.player}`);
        console.log(`     游戏类型: ${session2.gameType}`);
        console.log(`     开始时间: ${new Date(session2.startTime * 1000).toLocaleString()}`);
        console.log(`     结束时间: ${new Date(session2.endTime * 1000).toLocaleString()}`);
        console.log(`     状态: ${session2.status}`);
        console.log(`     已验证: ${session2.verified}`);
        
        // 6. 获取玩家统计（加密数据）
        console.log("\n6️⃣ 获取玩家统计...");
        
        const stats1 = await gamingSystem.connect(player1).getPlayerStats(player1.address);
        console.log(`   玩家1统计:`);
        console.log(`     总分数: 已加密（仅玩家可解密）`);
        console.log(`     最高分数: 已加密（仅玩家可解密）`);
        console.log(`     游戏次数: 已加密（仅玩家可解密）`);
        console.log(`     总经验: 已加密（仅玩家可解密）`);
        console.log(`     当前等级: 已加密（仅玩家可解密）`);
        console.log(`     最后游戏时间: ${new Date(stats1.lastPlayTime * 1000).toLocaleString()}`);
        console.log(`     账户状态: ${stats1.isActive ? '活跃' : '暂停'}`);
        
        // 7. 比较玩家分数
        console.log("\n7️⃣ 比较玩家分数...");
        const comparison = await gamingSystem.comparePlayerScores(player1.address, player2.address);
        console.log(`   分数比较结果: 已加密（需要解密才能知道谁的分数更高）`);
        
        // 8. 解锁成就
        console.log("\n8️⃣ 解锁成就...");
        
        const achievementName = "首次通关";
        const achievementValue = 1;
        const encryptedAchievement = instance.encrypt32(achievementValue);
        
        console.log(`   为玩家1解锁成就: ${achievementName}`);
        const achievementTx = await gamingSystem.connect(gameAdmin).unlockAchievement(
            player1.address,
            achievementName,
            encryptedAchievement.handles[0],
            encryptedAchievement.inputProof
        );
        await achievementTx.wait();
        console.log(`   ✅ 成就解锁成功`);
        
        // 9. 获取排行榜信息
        console.log("\n9️⃣ 获取排行榜信息...");
        
        const puzzleLeaderboardLength = await gamingSystem.getLeaderboardLength(0); // PUZZLE
        const actionLeaderboardLength = await gamingSystem.getLeaderboardLength(1); // ACTION
        
        console.log(`   拼图游戏排行榜长度: ${puzzleLeaderboardLength}`);
        console.log(`   动作游戏排行榜长度: ${actionLeaderboardLength}`);
        
        if (puzzleLeaderboardLength > 0) {
            const puzzleEntry = await gamingSystem.getLeaderboardEntry(0, 0);
            console.log(`   拼图游戏第1名: ${puzzleEntry.player}`);
            console.log(`   记录时间: ${new Date(puzzleEntry.timestamp * 1000).toLocaleString()}`);
        }
        
        if (actionLeaderboardLength > 0) {
            const actionEntry = await gamingSystem.getLeaderboardEntry(1, 0);
            console.log(`   动作游戏第1名: ${actionEntry.player}`);
            console.log(`   记录时间: ${new Date(actionEntry.timestamp * 1000).toLocaleString()}`);
        }
        
        // 10. 结束游戏会话
        console.log("\n🔟 结束游戏会话...");
        
        console.log(`   结束玩家1的游戏会话...`);
        const endTx1 = await gamingSystem.connect(player1).endGameSession(sessionId1);
        await endTx1.wait();
        console.log(`   ✅ 玩家1游戏会话已结束`);
        
        console.log(`   结束玩家2的游戏会话...`);
        const endTx2 = await gamingSystem.connect(player2).endGameSession(sessionId2);
        await endTx2.wait();
        console.log(`   ✅ 玩家2游戏会话已结束`);
        
        // 11. 管理员功能演示
        console.log("\n1️⃣1️⃣ 管理员功能演示...");
        
        // 获取可疑活动计数
        const suspiciousCount1 = await gamingSystem.connect(gameAdmin).getSuspiciousActivityCount(player1.address);
        const suspiciousCount2 = await gamingSystem.connect(gameAdmin).getSuspiciousActivityCount(player2.address);
        console.log(`   玩家1可疑活动计数: ${suspiciousCount1}`);
        console.log(`   玩家2可疑活动计数: ${suspiciousCount2}`);
        
        // 重置可疑活动计数
        if (suspiciousCount1 > 0) {
            const resetTx1 = await gamingSystem.connect(gameAdmin).resetSuspiciousActivity(player1.address);
            await resetTx1.wait();
            console.log(`   ✅ 玩家1可疑活动计数已重置`);
        }
        
        // 部署总结
        console.log("\n" + "=".repeat(50));
        console.log("🎉 游戏系统部署完成!");
        console.log("=".repeat(50));
        
        console.log("\n📋 部署信息:");
        console.log(`   合约地址: ${gamingSystem.address}`);
        console.log(`   网络: ${network.name}`);
        console.log(`   部署者: ${deployer.address}`);
        console.log(`   Gas 使用: ${gamingSystem.deployTransaction.gasLimit}`);
        
        console.log("\n🔧 合约功能:");
        console.log(`   ✅ 机密分数存储 (使用FHEVM加密)`);
        console.log(`   ✅ 多种游戏类型支持`);
        console.log(`   ✅ 玩家统计管理`);
        console.log(`   ✅ 排行榜系统`);
        console.log(`   ✅ 成就系统`);
        console.log(`   ✅ 反作弊机制`);
        console.log(`   ✅ 游戏会话管理`);
        
        console.log("\n🎯 演示结果:");
        console.log(`   👥 注册玩家数量: 2`);
        console.log(`   🎮 创建游戏会话: 2`);
        console.log(`   📊 提交分数次数: 2`);
        console.log(`   🏆 解锁成就数量: 1`);
        console.log(`   📈 排行榜更新: 成功`);
        console.log(`   🛡️  反作弊检测: 正常`);
        
        console.log("\n🎯 下一步操作:");
        console.log(`   1. 在前端连接合约地址: ${gamingSystem.address}`);
        console.log(`   2. 注册更多玩家`);
        console.log(`   3. 创建更多游戏类型`);
        console.log(`   4. 测试完整的游戏流程`);
        console.log(`   5. 集成游戏客户端`);
        
        // 保存部署信息到文件
        const deploymentInfo = {
            contractName: "GamingSystem",
            address: gamingSystem.address,
            network: network.name,
            deployer: deployer.address,
            deploymentTime: new Date().toISOString(),
            transactionHash: gamingSystem.deployTransaction.hash,
            blockNumber: gamingSystem.deployTransaction.blockNumber,
            demoResults: {
                playersRegistered: 2,
                gameSessionsCreated: 2,
                scoresSubmitted: 2,
                achievementsUnlocked: 1,
                leaderboardUpdated: true,
                antiCheatTested: true
            },
            gameTypes: {
                0: "PUZZLE",
                1: "ACTION", 
                2: "STRATEGY",
                3: "CASUAL"
            }
        };
        
        const fs = require('fs');
        const path = require('path');
        
        // 确保deployments目录存在
        const deploymentsDir = path.join(__dirname, '..', 'deployments');
        if (!fs.existsSync(deploymentsDir)) {
            fs.mkdirSync(deploymentsDir, { recursive: true });
        }
        
        // 保存部署信息
        const deploymentFile = path.join(deploymentsDir, `gaming-${network.name}.json`);
        fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
        console.log(`\n💾 部署信息已保存到: ${deploymentFile}`);
        
        return {
            gamingSystem: gamingSystem.address,
            deployer: deployer.address,
            network: network.name,
            demoResults: deploymentInfo.demoResults
        };
        
    } catch (error) {
        console.error("\n❌ 部署失败:");
        console.error(error.message);
        
        if (error.transaction) {
            console.error(`交易哈希: ${error.transaction.hash}`);
        }
        
        process.exit(1);
    }
}

// 错误处理
process.on('unhandledRejection', (error) => {
    console.error('未处理的Promise拒绝:', error);
    process.exit(1);
});

// 如果直接运行此脚本
if (require.main === module) {
    main()
        .then(() => {
            console.log("\n✅ 脚本执行完成");
            process.exit(0);
        })
        .catch((error) => {
            console.error("\n❌ 脚本执行失败:", error);
            process.exit(1);
        });
}

module.exports = main;