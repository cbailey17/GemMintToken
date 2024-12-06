const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');
const { keccak256 } = require('ethers/lib/utils');

describe('GemMint (proxy) - ERC20Permit with actual EIP-712 test', function () {
  let gemMint;
  let owner, addr1, addr2, rewardsPool, icoPresale, liquidityPool, development, team, marketing, reserves;

  beforeEach(async function () {
    [owner, addr1, addr2, rewardsPool, icoPresale, liquidityPool, development, team, marketing, reserves] = await ethers.getSigners();
    const GemMint = await ethers.getContractFactory("GemMint");
    gemMint = await upgrades.deployProxy(
      GemMint,
      [owner.address, rewardsPool.address, icoPresale.address, liquidityPool.address, development.address, team.address, marketing.address, reserves.address],
      { initializer: 'initialize' }
    );
    await gemMint.deployed();
  });

  it('permit sets allowance correctly using EIP-712 signature', async function () {
    // Preparing a permit signature
    const name = "GemMint";
    const version = "1";
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const verifyingContract = gemMint.address;

    // spender is addr2
    const spender = addr2.address;
    const value = 500; // allowance to set
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    // Nonce before permit
    const nonceBefore = await gemMint.nonces(addr1.address);

    // EIP-712 domain
    const domain = {
      name,
      version,
      chainId,
      verifyingContract
    };

    // EIP-712 types
    const types = {
      Permit: [
        {name: "owner", type: "address"},
        {name: "spender", type: "address"},
        {name: "value", type: "uint256"},
        {name: "nonce", type: "uint256"},
        {name: "deadline", type: "uint256"}
      ]
    };

    const message = {
      owner: addr1.address,
      spender,
      value,
      nonce: nonceBefore.toNumber(),
      deadline
    };

    // Sign typed data with addr1
    const signature = await addr1._signTypedData(domain, types, message);
    const sig = ethers.utils.splitSignature(signature);

    // Call permit
    await gemMint.permit(addr1.address, spender, value, deadline, sig.v, sig.r, sig.s);

    // Check allowance
    const allowance = await gemMint.allowance(addr1.address, spender);
    expect(allowance).to.equal(value);

    // Nonce incremented
    const nonceAfter = await gemMint.nonces(addr1.address);
    expect(nonceAfter).to.equal(nonceBefore.add(1));
  });
});

