const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

describe('GemMint (proxy) - Initialization', function () {
  let GemMint;
  let gemMint;
  let owner, rewardsPool, icoPresale, liquidityPool, development, team, marketing, reserves;

  // Deploys the proxy before each test
  beforeEach(async function () {
    [owner, rewardsPool, icoPresale, liquidityPool, development, team, marketing, reserves] = await ethers.getSigners();
    GemMint = await ethers.getContractFactory("GemMint");
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

  it('should set the owner correctly', async function () {
    // Check owner is the one passed during initialization
    expect(await gemMint.owner()).to.equal(owner.address);
  });

  it('should mint the initial supply and set rewardsPool', async function () {
    // Check totalSupply matches INITIAL_SUPPLY
    const initialSupply = await gemMint.INITIAL_SUPPLY();
    expect(await gemMint.totalSupply()).to.equal(initialSupply);
    // Check rewardsPool set
    expect(await gemMint.rewardsPool()).to.equal(rewardsPool.address);
  });

  it('should not be paused initially', async function () {
    // Initially unpaused
    expect(await gemMint.paused()).to.equal(false);
  });

  it('should have no partners by default', async function () {
    // Any address is not a partner unless added
    expect(await gemMint.partners(icoPresale.address)).to.equal(false);
  });
});
