const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('GemMint - Non-Proxy Deployment', function () {
  let GemMint;
  let gemMint;
  let owner, rewardsPool, icoPresale, liquidityPool, development, team, marketing, reserves, addr1, addr2;

  before(async function () {
    [owner, rewardsPool, icoPresale, liquidityPool, development, team, marketing, reserves, addr1, addr2] = await ethers.getSigners();
    GemMint = await ethers.getContractFactory("GemMint");
  });

  beforeEach(async function () {
    // Deploy GemMint directly without proxy
    gemMint = await GemMint.deploy();
    await gemMint.deployed();

    // Manually call initialize
    await gemMint.initialize(
      owner.address,
      rewardsPool.address,
      icoPresale.address,
      liquidityPool.address,
      development.address,
      team.address,
      marketing.address,
      reserves.address
    );
  });

  describe('Initialization', function () {
    it('initialized correctly', async function () {
      expect(await gemMint.owner()).to.equal(owner.address);
      const initialSupply = await gemMint.INITIAL_SUPPLY();
      expect(await gemMint.totalSupply()).to.equal(initialSupply);
      expect(await gemMint.rewardsPool()).to.equal(rewardsPool.address);
    });

    it('fails reinitialization', async function () {
      await expect(
        gemMint.initialize(
          owner.address,
          rewardsPool.address,
          icoPresale.address,
          liquidityPool.address,
          development.address,
          team.address,
          marketing.address,
          reserves.address
        )
      ).to.be.revertedWith('Initializable: contract is already initialized');
    });
  });

  describe('ERC20 Functionality', function () {
    it('transfers tokens correctly', async function () {
      await gemMint.connect(rewardsPool).transfer(addr1.address, 1000);
      expect(await gemMint.balanceOf(addr1.address)).to.equal(1000);
    });

    it('rejects transfers when paused', async function () {
      await gemMint.pause();
      await expect(gemMint.connect(rewardsPool).transfer(addr1.address, 1000)).to.be.revertedWith('TokenTransferWhilePaused');
    });

    it('respects MAX_SUPPLY on minting', async function () {
      const maxSupply = await gemMint.MAX_SUPPLY();
      const currentSupply = await gemMint.totalSupply();
      const remaining = maxSupply.sub(currentSupply);
      await gemMint.mint(addr1.address, remaining);

      await expect(gemMint.mint(addr1.address, 1)).to.be.revertedWith('ExceedsMaxSupply');
    });
  });

  describe('Access Control', function () {
    it('only owner can pause/unpause', async function () {
      await expect(gemMint.connect(addr1).pause()).to.be.revertedWith('Ownable: caller is not the owner');
      await gemMint.pause();
      expect(await gemMint.paused()).to.equal(true);
      await gemMint.unpause();
      expect(await gemMint.paused()).to.equal(false);
    });

    it('only owner can add/remove partners', async function () {
      await gemMint.addPartner(addr1.address);
      expect(await gemMint.partners(addr1.address)).to.equal(true);

      await gemMint.removePartner(addr1.address);
      expect(await gemMint.partners(addr1.address)).to.equal(false);
    });

    it('reverts when non-owner tries to add/remove partners', async function () {
      await expect(gemMint.connect(addr1).addPartner(addr2.address)).to.be.revertedWith('Ownable: caller is not the owner');
      await expect(gemMint.connect(addr1).removePartner(addr2.address)).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('Reward Mechanisms', function () {
    it('accumulates 1% rewards on each transfer', async function () {
      await gemMint.connect(rewardsPool).transfer(addr1.address, 1000);
      await gemMint.connect(addr1).transfer(addr2.address, 100);

      const reward = await gemMint.rewardsBalance(addr1.address);
      expect(reward).to.equal(1);
    });

    it('records spending at partner establishments', async function () {
      await gemMint.addPartner(addr2.address);
      await gemMint.connect(addr1).transfer(addr2.address, 500);
      expect(await gemMint.monthlyPartnerSpending(addr1.address)).to.equal(500);
    });

    it('distributes monthly rewards correctly', async function () {
      await gemMint.addPartner(addr2.address);
      await gemMint.connect(addr1).transfer(addr2.address, 5000);

      const rewardsBefore = await gemMint.rewardsBalance(addr1.address);
      await gemMint.distributeMonthlyBonusRewards([addr1.address]);

      const bonus = (rewardsBefore * 2) / 100; // 2% for spending $1-$999.99
      const rewardsAfter = await gemMint.rewardsBalance(addr1.address);
      expect(rewardsAfter).to.equal(rewardsBefore.add(bonus));
    });

    it('clears monthly data correctly', async function () {
      await gemMint.addPartner(addr2.address);
      await gemMint.connect(addr1).transfer(addr2.address, 500);

      await gemMint.clearMonthlyData([addr1.address]);
      expect(await gemMint.monthlyPartnerSpending(addr1.address)).to.equal(0);
      expect(await gemMint.rewardsBalance(addr1.address)).to.equal(0);
    });
  });

  describe('Permit Functionality', function () {
    it('sets allowance correctly with valid EIP-712 signature', async function () {
      // Prepare EIP-712 permit signature
      const name = "GemMint";
      const version = "1";
      const chainId = (await ethers.provider.getNetwork()).chainId;
      const verifyingContract = gemMint.address;
      const spender = addr2.address;
      const value = 1000;
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      const nonceBefore = await gemMint.nonces(addr1.address);

      const domain = { name, version, chainId, verifyingContract };
      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" }
        ]
      };
      const message = { owner: addr1.address, spender, value, nonce: nonceBefore.toNumber(), deadline };

      const signature = await addr1._signTypedData(domain, types, message);
      const sig = ethers.utils.splitSignature(signature);

      // Call permit
      await gemMint.permit(addr1.address, spender, value, deadline, sig.v, sig.r, sig.s);

      // Verify allowance and nonce
      const allowance = await gemMint.allowance(addr1.address, spender);
      expect(allowance).to.equal(value);

      const nonceAfter = await gemMint.nonces(addr1.address);
      expect(nonceAfter).to.equal(nonceBefore.add(1));
    });
  });
});

