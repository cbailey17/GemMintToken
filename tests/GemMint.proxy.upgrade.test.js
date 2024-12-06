const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

describe('GemMint (proxy) - Upgrade', function () {
  let gemMint;
  let GemMintV2;
  let owner, rewardsPool, icoPresale, liquidityPool, development, team, marketing, reserves;

  beforeEach(async function () {
    [owner, rewardsPool, icoPresale, liquidityPool, development, team, marketing, reserves] = await ethers.getSigners();
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

    GemMintV2 = await ethers.getContractFactory("GemMintV2");
  });

  it('owner can upgrade the contract', async function () {
    const gemMintV2 = await upgrades.upgradeProxy(gemMint.address, GemMintV2);
    await gemMintV2.deployed();

    expect(await gemMintV2.owner()).to.equal(owner.address);
    const supply = await gemMintV2.totalSupply();
    const initialSupply = await gemMintV2.INITIAL_SUPPLY();
    expect(supply.toString()).to.equal(initialSupply.toString());
  });

  it('non-owner cannot upgrade the contract', async function () {
    await expect(
      upgrades.upgradeProxy(gemMint.address, GemMintV2.connect(rewardsPool))
    ).to.be.reverted;
  });
});
