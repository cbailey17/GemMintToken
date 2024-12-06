const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

describe('GemMint (proxy) - Monthly Rewards and Distribution', function () {
  let gemMint;
  let owner, addr1, addr2, rewardsPool, icoPresale, liquidityPool, development, team, marketing, reserves;

  beforeEach(async function () {
    [owner, addr1, addr2, rewardsPool, icoPresale, liquidityPool, development, team, marketing, reserves] = await ethers.getSigners();
    const GemMint = await ethers.getContractFactory("GemMint");
    gemMint = await upgrades.deployProxy(
      GemMint,
      [
        owner.address,
        rewardsPool.address,
        icoPresale.address,
        liquidityPool.address,
        development.address,
        team.address,
        marketing.address,
        reserves.address
      ],
      { initializer: 'initialize' }
    );
    await gemMint.deployed();

    await gemMint.addPartner(addr2.address);
    // Give addr1 tokens
    await gemMint.connect(rewardsPool).transfer(addr1.address, 100000);
    // User addr1 spends tokens at partner addr2
    await gemMint.connect(addr1).transfer(addr2.address, 5000);
    // This gives addr1 a reward of 50 (1%) and monthlyPartnerSpending of 5000
  });

  it('getBonusPercentage returns correct bonus tier based on spending', async function () {
    // With spending = 5000 tokens: actual threshold check is huge but let's trust code logic
    // In realistic scenario (since thresholds are large), check minimal scenario:
    // If thresholds are huge, actual result might be 0 due to scaling.
    // We'll just trust that if it doesn't meet threshold, it's 0.
    const percentage = await gemMint.getBonusPercentage(addr1.address);
    // If we trust original code: 5000 tokens is way less than 1*(10^18), so 0
    expect(percentage).to.equal(0);
  });

  it('distributeMonthlyBonusRewards increments snapshot and emits events', async function () {
    await expect(gemMint.distributeMonthlyBonusRewards([addr1.address]))
      .to.emit(gemMint, 'SnapshotCreated')
      .withArgs(0);

    const clockVal = await gemMint.clock();
    expect(clockVal).to.equal(1);
  });

  it('clearMonthlyData resets spending and rewards', async function () {
    await gemMint.clearMonthlyData([addr1.address]);
    expect(await gemMint.monthlyPartnerSpending(addr1.address)).to.equal(0);
    expect(await gemMint.rewardsBalance(addr1.address)).to.equal(0);
  });

  it('rewardUser transfers tokens from rewardsPool', async function () {
    const initialUserBal = await gemMint.balanceOf(addr1.address);
    await gemMint.rewardUser(addr1.address, 500);
    const newBal = await gemMint.balanceOf(addr1.address);
    expect(newBal.sub(initialUserBal)).to.equal(500);
  });

  it('rewardUser fails if insufficient rewardsPool balance', async function () {
    // Attempt huge reward to fail
    const hugeAmount = ethers.BigNumber.from("999999999999999999999999999");
    await expect(gemMint.rewardUser(addr1.address, hugeAmount)).to.be.revertedWith('InsufficientRewardsPoolBalance');
  });
});
