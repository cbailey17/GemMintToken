const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

describe('GemMint (proxy) - Minting and Supply Limits', function () {
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

  it('owner can mint tokens without exceeding MAX_SUPPLY', async function () {
    const maxSupply = await gemMint.MAX_SUPPLY();
    const currentSupply = await gemMint.totalSupply();
    const remaining = maxSupply.sub(currentSupply);

    await gemMint.mint(addr1.address, remaining);
    expect(await gemMint.totalSupply()).to.equal(maxSupply);
  });

  it('minting beyond MAX_SUPPLY reverts', async function () {
    const maxSupply = await gemMint.MAX_SUPPLY();
    const currentSupply = await gemMint.totalSupply();
    const over = currentSupply.add(1);
    await expect(gemMint.mint(addr1.address, over)).to.be.revertedWith('ExceedsMaxSupply');
  });

  it('non-owner cannot mint', async function () {
    await expect(gemMint.connect(addr1).mint(addr1.address, 100)).to.be.revertedWith('Ownable: caller is not the owner');
  });
});
