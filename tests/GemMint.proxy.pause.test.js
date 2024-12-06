const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

describe('GemMint (proxy) - Pausing and Unpausing', function () {
  let gemMint;
  let owner, addr1, rewardsPool, icoPresale, liquidityPool, development, team, marketing, reserves;

  beforeEach(async function () {
    [owner, addr1, rewardsPool, icoPresale, liquidityPool, development, team, marketing, reserves] = await ethers.getSigners();
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
  });

  it('owner can pause and unpause transfers', async function () {
    await gemMint.pause();
    expect(await gemMint.paused()).to.equal(true);

    await expect(gemMint.connect(addr1).transfer(addr1.address, 10)).to.be.revertedWith('TokenTransferWhilePaused');

    await gemMint.unpause();
    expect(await gemMint.paused()).to.equal(false);
    // Now transfers should work
    await gemMint.connect(rewardsPool).transfer(addr1.address, 100);
    expect(await gemMint.balanceOf(addr1.address)).to.equal(100);
  });

  it('non-owner cannot pause/unpause', async function () {
    await expect(gemMint.connect(addr1).pause()).to.be.revertedWith('Ownable: caller is not the owner');
  });
});
