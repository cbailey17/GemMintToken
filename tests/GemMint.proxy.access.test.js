const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

describe('GemMint (proxy) - Access Control', function () {
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

  it('non-owner cannot call onlyOwner functions', async function () {
    // Trying to pause by non-owner
    await expect(gemMint.connect(addr1).pause()).to.be.revertedWith('Ownable: caller is not the owner');
    // Trying to mint by non-owner
    await expect(gemMint.connect(addr1).mint(addr1.address, 100)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('owner can transfer ownership', async function () {
    // Transfer ownership to addr1
    await gemMint.transferOwnership(addr1.address);
    expect(await gemMint.owner()).to.equal(addr1.address);
  });
});
