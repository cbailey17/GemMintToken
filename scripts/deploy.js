const { ethers, upgrades } = require("hardhat");

async function main() {
  const GemMint = await ethers.getContractFactory("GemMint");

  console.log("Deploying GemMint...");
  const gemMint = await upgrades.deployProxy(
    GemMint,
    ["0xAdminAddress", "0xUpgraderAddress", "0xRewardsPoolAddress"],
    { initializer: "initialize" },
  );

  await gemMint.deployed();
  console.log("GemMint deployed at:", gemMint.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
