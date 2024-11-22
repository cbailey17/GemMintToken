const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("GemMint", function () {
  let gemMint, admin, upgrader, rewardsPool;

  beforeEach(async function () {
    [admin, upgrader, rewardsPool, user1, user2] = await ethers.getSigners();

    const GemMint = await ethers.getContractFactory("GemMint");
    gemMint = await upgrades.deployProxy(
      GemMint,
      [admin.address, upgrader.address, rewardsPool.address],
      { initializer: "initialize" },
    );

    await gemMint.deployed();
  });

  it("should mint the initial supply to the admin", async function () {
    const adminBalance = await gemMint.balanceOf(admin.address);
    expect(adminBalance).to.equal(ethers.utils.parseUnits("10000000", 18));
  });

  it("should add and remove partners", async function () {
    await gemMint.connect(admin).addPartner(user1.address);
    expect(await gemMint.partners(user1.address)).to.be.true;

    await gemMint.connect(admin).removePartner(user1.address);
    expect(await gemMint.partners(user1.address)).to.be.false;
  });

  it("should restrict upgrades to UPGRADER_ROLE", async function () {
    const GemMintV2 = await ethers.getContractFactory("GemMint");
    await expect(
      upgrades.upgradeProxy(gemMint.address, GemMintV2.connect(user1)),
    ).to.be.revertedWith("AccessControl: account");
  });
});
