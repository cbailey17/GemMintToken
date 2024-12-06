const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

describe('GemMint (proxy) - Transfers and Rewards Accumulation', function () {
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
    // Give addr1 some tokens
    await gemMint.connect(rewardsPool).transfer(addr1.address, 10000);
  });

  it('accumulates 1% reward on normal transfer', async function () {
    await gemMint.connect(addr1).transfer(addr2.address, 1000);
    const reward = await gemMint.rewardsBalance(addr1.address);
    expect(reward).to.equal(10); // 1% of 1000 is 10
  });

  it('zero amount transfer does not accumulate or record spending', async function () {
    await gemMint.connect(addr1).transfer(addr2.address, 0);
    expect(await gemMint.rewardsBalance(addr1.address)).to.equal(0);
  });

  it('transfer does not fail if not partner and just records 1% reward', async function () {
    await gemMint.connect(addr1).transfer(development.address, 2000);
    expect(await gemMint.rewardsBalance(addr1.address)).to.equal(20);
    expect(await gemMint.monthlyPartnerSpending(addr1.address)).to.equal(0);
  });
});
