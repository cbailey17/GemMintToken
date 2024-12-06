const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

describe('GemMint (proxy) - Partner Management', function () {
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

  it('owner can add a partner', async function () {
    await gemMint.addPartner(addr1.address);
    expect(await gemMint.partners(addr1.address)).to.equal(true);
  });

  it('adding existing partner reverts', async function () {
    await gemMint.addPartner(addr1.address);
    await expect(gemMint.addPartner(addr1.address)).to.be.revertedWith('PartnerAlreadyExists');
  });

  it('owner can remove a partner', async function () {
    await gemMint.addPartner(addr1.address);
    await gemMint.removePartner(addr1.address);
    expect(await gemMint.partners(addr1.address)).to.equal(false);
  });

  it('removing non-existent partner reverts', async function () {
    await expect(gemMint.removePartner(addr1.address)).to.be.revertedWith('PartnerDoesNotExist');
  });

  it('non-owner cannot add or remove partners', async function () {
    await expect(gemMint.connect(addr1).addPartner(development.address)).to.be.revertedWith('Ownable: caller is not the owner');
  });
});
