const hre = require("hardhat");

async function main() {
  // Get signers (wallet addresses)
  const [deployer, rewardsPool, icoPresale, liquidityPool, development, team, marketing, reserves] = await hre.ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy the GemMint contract
  const GemMint = await hre.ethers.getContractFactory("GemMint");
  const gemMint = await hre.upgrades.deployProxy(GemMint, [
    deployer.address, 
    rewardsPool.address,
    icoPresale.address, 
    liquidityPool.address, 
    development.address, 
    team.address, 
    marketing.address, 
    reserves.address, 
  ]);
  await gemMint.deployed();

  console.log("GemMint deployed to:", gemMint.address);

  console.log("Contract parameters:");
  console.log("Rewards Pool Address:", rewardsPool.address);
  console.log("ICO Presale Address:", icoPresale.address);
  console.log("Liquidity Pool Address:", liquidityPool.address);
  console.log("Development Address:", development.address);
  console.log("Team Address:", team.address);
  console.log("Marketing Address:", marketing.address);
  console.log("Reserves Address:", reserves.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

