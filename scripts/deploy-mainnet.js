const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer, rewardsPool, icoPresale, liquidityPool, development, team, marketing, reserves] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy the proxy
  const GemMint = await ethers.getContractFactory("GemMint");
  const gemMint = await upgrades.deployProxy(GemMint, [
    deployer.address,       // Initial Owner
    rewardsPool.address,    // Rewards Pool Address
    icoPresale.address,     // ICO Presale Address
    liquidityPool.address,  // Liquidity Pool Address
    development.address,    // Development Address
    team.address,           // Team Address
    marketing.address,      // Marketing Address
    reserves.address        // Reserves Address
  ], { initializer: 'initialize' });

  await gemMint.deployed();

  console.log("GemMint deployed to:", gemMint.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
