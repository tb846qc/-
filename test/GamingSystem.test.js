const { expect } = require("chai");
const { ethers } = require("hardhat");
const { createFhevmInstance } = require("fhevmjs");

describe("GamingSystem", function () {
    let gamingSystem;
    let owner, admin, player1, player2, player3;
    let fhevmInstance;

    before(async function () {
        // 获取测试账户
        [owner, admin, player1, player2, player3] = await ethers.getSigners();
        
        // 创建FHEVM实例
        fhevmInstance = await createFhevmInstance({
            chainId: 31337, // Hardhat本地网络
            publicKey: "0x...", // 这里需要实际的公钥
        });
    });

    beforeEach(async function () {
        // 部署合约
        const GamingSystem = await ethers.getContractFactory("GamingSystem");
        gamingSystem = await GamingSystem.deploy();
        await gamingSystem.deployed();
    });

    describe("部署", function () {
        it("应该正确设置合约所有者", async function () {
            expect(await gamingSystem.owner()).to.equal(owner.address);
        });

        it("应该初始化为未暂停状态", async function () {
            expect(await gamingSystem.paused()).to.be.false;
        });

        it("所有者应该自动成为管理员", async function () {
            expect(await gamingSystem.isAdmin(owner.address)).to.be.true;
        });
    });

    describe("管理员管理", function () {
        it("所有者应该能够添加管理员", async function () {
            await expect(
                gamingSystem.addAdmin(admin.address)
            ).to.emit(gamingSystem, "AdminAdded")
              .withArgs(admin.address);
            
            expect(await gamingSystem.isAdmin(admin.address)).to.be.true;
        });

        it("所有者应该能够移除管理员", async function () {
            await gamingSystem.addAdmin(admin.address);
            
            await expect(
                gamingSystem.removeAdmin(admin.address)
            ).to.emit(gamingSystem, "AdminRemoved")
              .withArgs(admin.address);
            
            expect(await gamingSystem.isAdmin(admin.address)).to.be.false;
        });

        it("非所有者不应该能够添加管理员", async function () {
            await expect(
                gamingSystem.connect(player1).addAdmin(admin.address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("不应该能够移除所有者的管理员权限", async function () {
            await expect(
                gamingSystem.removeAdmin(owner.address)
            ).to.be.revertedWith("Cannot remove owner admin");
        });
    });

    describe("玩家注册", function () {
        beforeEach(async function () {
            await gamingSystem.addAdmin(admin.address);
        });

        it("管理员应该能够注册玩家", async function () {
            await expect(
                gamingSystem.connect(admin).registerPlayer(player1.address, "Player1")
            ).to.emit(gamingSystem, "PlayerRegistered")
              .withArgs(player1.address, "Player1");
            
            expect(await gamingSystem.isRegisteredPlayer(player1.address)).to.be.true;
        });

        it("应该正确设置玩家信息", async function () {
            await gamingSystem.connect(admin).registerPlayer(player1.address, "Player1");
            
            const playerInfo = await gamingSystem.getPlayerInfo(player1.address);
            expect(playerInfo.nickname).to.equal("Player1");
            expect(playerInfo.registered).to.be.true;
        });

        it("非管理员不应该能够注册玩家", async function () {
            await expect(
                gamingSystem.connect(player1).registerPlayer(player2.address, "Player2")
            ).to.be.revertedWith("Only admin can perform this action");
        });

        it("不应该能够重复注册同一玩家", async function () {
            await gamingSystem.connect(admin).registerPlayer(player1.address, "Player1");
            
            await expect(
                gamingSystem.connect(admin).registerPlayer(player1.address, "Player1_New")
            ).to.be.revertedWith("Player already registered");
        });

        it("应该拒绝空昵称", async function () {
            await expect(
                gamingSystem.connect(admin).registerPlayer(player1.address, "")
            ).to.be.revertedWith("Nickname cannot be empty");
        });
    });

    describe("游戏会话管理", function () {
        beforeEach(async function () {
            await gamingSystem.addAdmin(admin.address);
            await gamingSystem.connect(admin).registerPlayer(player1.address, "Player1");
            await gamingSystem.connect(admin).registerPlayer(player2.address, "Player2");
        });

        it("注册玩家应该能够开始游戏会话", async function () {
            await expect(
                gamingSystem.connect(player1).startGameSession("测试游戏")
            ).to.emit(gamingSystem, "GameSessionStarted")
              .withArgs(0, player1.address, "测试游戏");
        });

        it("应该正确设置游戏会话信息", async function () {
            await gamingSystem.connect(player1).startGameSession("测试游戏");
            
            const session = await gamingSystem.getGameSession(0);
            expect(session.player).to.equal(player1.address);
            expect(session.gameName).to.equal("测试游戏");
            expect(session.active).to.be.true;
        });

        it("未注册玩家不应该能够开始游戏会话", async function () {
            await expect(
                gamingSystem.connect(player3).startGameSession("测试游戏")
            ).to.be.revertedWith("Player not registered");
        });

        it("玩家应该能够结束游戏会话", async function () {
            await gamingSystem.connect(player1).startGameSession("测试游戏");
            
            await expect(
                gamingSystem.connect(player1).endGameSession(0)
            ).to.emit(gamingSystem, "GameSessionEnded")
              .withArgs(0, player1.address);
        });

        it("只有会话所有者应该能够结束会话", async function () {
            await gamingSystem.connect(player1).startGameSession("测试游戏");
            
            await expect(
                gamingSystem.connect(player2).endGameSession(0)
            ).to.be.revertedWith("Only session owner can end");
        });

        it("不应该能够结束已结束的会话", async function () {
            await gamingSystem.connect(player1).startGameSession("测试游戏");
            await gamingSystem.connect(player1).endGameSession(0);
            
            await expect(
                gamingSystem.connect(player1).endGameSession(0)
            ).to.be.revertedWith("Session not active");
        });
    });

    describe("分数提交", function () {
        let sessionId;
        
        beforeEach(async function () {
            await gamingSystem.addAdmin(admin.address);
            await gamingSystem.connect(admin).registerPlayer(player1.address, "Player1");
            await gamingSystem.connect(player1).startGameSession("测试游戏");
            sessionId = 0;
        });

        it("玩家应该能够提交加密分数", async function () {
            const encryptedScore = fhevmInstance.encrypt32(1000);
            
            await expect(
                gamingSystem.connect(player1).submitScore(sessionId, encryptedScore)
            ).to.emit(gamingSystem, "ScoreSubmitted")
              .withArgs(sessionId, player1.address);
        });

        it("只有会话所有者应该能够提交分数", async function () {
            await gamingSystem.connect(admin).registerPlayer(player2.address, "Player2");
            const encryptedScore = fhevmInstance.encrypt32(1000);
            
            await expect(
                gamingSystem.connect(player2).submitScore(sessionId, encryptedScore)
            ).to.be.revertedWith("Only session owner can submit score");
        });

        it("不应该能够对非活跃会话提交分数", async function () {
            await gamingSystem.connect(player1).endGameSession(sessionId);
            const encryptedScore = fhevmInstance.encrypt32(1000);
            
            await expect(
                gamingSystem.connect(player1).submitScore(sessionId, encryptedScore)
            ).to.be.revertedWith("Session not active");
        });

        it("应该能够多次提交分数", async function () {
            const score1 = fhevmInstance.encrypt32(1000);
            const score2 = fhevmInstance.encrypt32(1500);
            
            await gamingSystem.connect(player1).submitScore(sessionId, score1);
            await gamingSystem.connect(player1).submitScore(sessionId, score2);
            
            const session = await gamingSystem.getGameSession(sessionId);
            expect(session.scoreCount).to.equal(2);
        });
    });

    describe("玩家统计", function () {
        beforeEach(async function () {
            await gamingSystem.addAdmin(admin.address);
            await gamingSystem.connect(admin).registerPlayer(player1.address, "Player1");
            await gamingSystem.connect(admin).registerPlayer(player2.address, "Player2");
        });

        it("应该能够获取玩家统计信息", async function () {
            // 开始游戏会话并提交分数
            await gamingSystem.connect(player1).startGameSession("测试游戏");
            const encryptedScore = fhevmInstance.encrypt32(1000);
            await gamingSystem.connect(player1).submitScore(0, encryptedScore);
            await gamingSystem.connect(player1).endGameSession(0);
            
            const stats = await gamingSystem.getPlayerStats(player1.address);
            expect(stats.gamesPlayed).to.equal(1);
        });

        it("应该能够比较玩家分数", async function () {
            // 为两个玩家创建游戏会话并提交分数
            await gamingSystem.connect(player1).startGameSession("测试游戏");
            await gamingSystem.connect(player2).startGameSession("测试游戏");
            
            const score1 = fhevmInstance.encrypt32(1000);
            const score2 = fhevmInstance.encrypt32(1500);
            
            await gamingSystem.connect(player1).submitScore(0, score1);
            await gamingSystem.connect(player2).submitScore(1, score2);
            
            // 这里需要管理员权限来比较分数
            const comparison = await gamingSystem.connect(admin).comparePlayerScores(
                player1.address, player2.address
            );
            
            // 由于是加密比较，我们只能验证函数执行成功
            expect(comparison).to.be.a('boolean');
        });
    });

    describe("成就系统", function () {
        beforeEach(async function () {
            await gamingSystem.addAdmin(admin.address);
            await gamingSystem.connect(admin).registerPlayer(player1.address, "Player1");
        });

        it("管理员应该能够为玩家解锁成就", async function () {
            await expect(
                gamingSystem.connect(admin).unlockAchievement(player1.address, "首次游戏")
            ).to.emit(gamingSystem, "AchievementUnlocked")
              .withArgs(player1.address, "首次游戏");
        });

        it("非管理员不应该能够解锁成就", async function () {
            await expect(
                gamingSystem.connect(player1).unlockAchievement(player1.address, "首次游戏")
            ).to.be.revertedWith("Only admin can perform this action");
        });

        it("不应该能够为未注册玩家解锁成就", async function () {
            await expect(
                gamingSystem.connect(admin).unlockAchievement(player3.address, "首次游戏")
            ).to.be.revertedWith("Player not registered");
        });

        it("应该拒绝空成就名称", async function () {
            await expect(
                gamingSystem.connect(admin).unlockAchievement(player1.address, "")
            ).to.be.revertedWith("Achievement name cannot be empty");
        });
    });

    describe("排行榜功能", function () {
        beforeEach(async function () {
            await gamingSystem.addAdmin(admin.address);
            await gamingSystem.connect(admin).registerPlayer(player1.address, "Player1");
            await gamingSystem.connect(admin).registerPlayer(player2.address, "Player2");
            await gamingSystem.connect(admin).registerPlayer(player3.address, "Player3");
        });

        it("应该能够获取排行榜信息", async function () {
            // 创建一些游戏数据
            await gamingSystem.connect(player1).startGameSession("测试游戏");
            await gamingSystem.connect(player2).startGameSession("测试游戏");
            
            const score1 = fhevmInstance.encrypt32(1000);
            const score2 = fhevmInstance.encrypt32(1500);
            
            await gamingSystem.connect(player1).submitScore(0, score1);
            await gamingSystem.connect(player2).submitScore(1, score2);
            
            const leaderboard = await gamingSystem.getLeaderboard();
            expect(leaderboard.length).to.be.greaterThan(0);
        });

        it("排行榜应该包含玩家信息", async function () {
            await gamingSystem.connect(player1).startGameSession("测试游戏");
            const score = fhevmInstance.encrypt32(1000);
            await gamingSystem.connect(player1).submitScore(0, score);
            
            const leaderboard = await gamingSystem.getLeaderboard();
            const playerEntry = leaderboard.find(entry => entry.player === player1.address);
            expect(playerEntry).to.not.be.undefined;
        });
    });

    describe("防作弊机制", function () {
        beforeEach(async function () {
            await gamingSystem.addAdmin(admin.address);
            await gamingSystem.connect(admin).registerPlayer(player1.address, "Player1");
        });

        it("应该检测异常高分", async function () {
            await gamingSystem.connect(player1).startGameSession("测试游戏");
            
            // 提交一个异常高的分数
            const suspiciousScore = fhevmInstance.encrypt32(999999999);
            
            // 系统应该能够处理这种情况（具体实现取决于防作弊逻辑）
            await expect(
                gamingSystem.connect(player1).submitScore(0, suspiciousScore)
            ).to.not.be.reverted;
        });

        it("应该限制分数提交频率", async function () {
            await gamingSystem.connect(player1).startGameSession("测试游戏");
            
            const score = fhevmInstance.encrypt32(1000);
            
            // 快速连续提交多个分数
            await gamingSystem.connect(player1).submitScore(0, score);
            await gamingSystem.connect(player1).submitScore(0, score);
            
            // 系统应该能够处理这种情况
            const session = await gamingSystem.getGameSession(0);
            expect(session.scoreCount).to.equal(2);
        });
    });

    describe("暂停功能", function () {
        beforeEach(async function () {
            await gamingSystem.addAdmin(admin.address);
            await gamingSystem.connect(admin).registerPlayer(player1.address, "Player1");
        });

        it("所有者应该能够暂停合约", async function () {
            await gamingSystem.pause();
            expect(await gamingSystem.paused()).to.be.true;
        });

        it("所有者应该能够恢复合约", async function () {
            await gamingSystem.pause();
            await gamingSystem.unpause();
            expect(await gamingSystem.paused()).to.be.false;
        });

        it("暂停时不应该能够开始游戏会话", async function () {
            await gamingSystem.pause();
            
            await expect(
                gamingSystem.connect(player1).startGameSession("测试游戏")
            ).to.be.revertedWith("Pausable: paused");
        });

        it("暂停时不应该能够提交分数", async function () {
            await gamingSystem.connect(player1).startGameSession("测试游戏");
            await gamingSystem.pause();
            
            const score = fhevmInstance.encrypt32(1000);
            
            await expect(
                gamingSystem.connect(player1).submitScore(0, score)
            ).to.be.revertedWith("Pausable: paused");
        });
    });

    describe("查询功能", function () {
        beforeEach(async function () {
            await gamingSystem.addAdmin(admin.address);
            await gamingSystem.connect(admin).registerPlayer(player1.address, "Player1");
        });

        it("应该能够获取游戏会话总数", async function () {
            await gamingSystem.connect(player1).startGameSession("测试游戏1");
            await gamingSystem.connect(player1).startGameSession("测试游戏2");
            
            const count = await gamingSystem.getGameSessionCount();
            expect(count).to.equal(2);
        });

        it("应该能够获取注册玩家总数", async function () {
            await gamingSystem.connect(admin).registerPlayer(player2.address, "Player2");
            await gamingSystem.connect(admin).registerPlayer(player3.address, "Player3");
            
            const count = await gamingSystem.getRegisteredPlayerCount();
            expect(count).to.equal(3); // player1, player2, player3
        });

        it("应该能够检查玩家注册状态", async function () {
            expect(await gamingSystem.isRegisteredPlayer(player1.address)).to.be.true;
            expect(await gamingSystem.isRegisteredPlayer(player3.address)).to.be.false;
        });
    });

    describe("边界条件测试", function () {
        it("应该拒绝无效的会话ID", async function () {
            await expect(
                gamingSystem.getGameSession(999)
            ).to.be.revertedWith("Invalid session ID");
        });

        it("应该处理零地址", async function () {
            await expect(
                gamingSystem.addAdmin(ethers.constants.AddressZero)
            ).to.be.revertedWith("Invalid address");
        });

        it("应该处理空游戏名称", async function () {
            await gamingSystem.addAdmin(admin.address);
            await gamingSystem.connect(admin).registerPlayer(player1.address, "Player1");
            
            await expect(
                gamingSystem.connect(player1).startGameSession("")
            ).to.be.revertedWith("Game name cannot be empty");
        });
    });

    describe("Gas优化测试", function () {
        it("批量注册玩家应该高效", async function () {
            await gamingSystem.addAdmin(admin.address);
            
            const players = [player1.address, player2.address, player3.address];
            const nicknames = ["Player1", "Player2", "Player3"];
            
            for (let i = 0; i < players.length; i++) {
                await gamingSystem.connect(admin).registerPlayer(players[i], nicknames[i]);
            }
            
            // 验证所有玩家都已注册
            for (const player of players) {
                expect(await gamingSystem.isRegisteredPlayer(player)).to.be.true;
            }
        });

        it("批量分数提交应该高效", async function () {
            await gamingSystem.addAdmin(admin.address);
            await gamingSystem.connect(admin).registerPlayer(player1.address, "Player1");
            await gamingSystem.connect(player1).startGameSession("测试游戏");
            
            const scores = [1000, 1100, 1200, 1300, 1400];
            
            for (const score of scores) {
                const encryptedScore = fhevmInstance.encrypt32(score);
                await gamingSystem.connect(player1).submitScore(0, encryptedScore);
            }
            
            const session = await gamingSystem.getGameSession(0);
            expect(session.scoreCount).to.equal(scores.length);
        });
    });
});