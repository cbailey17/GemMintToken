const { ethers, upgrades } = require("hardhat");

async function main() {
  const GemMintV2 = await ethers.getContractFactory("GemMintV2");
  const proxyAddress = "0xYourProxyAddress";

  console.log("Upgrading GemMint...");
  await upgrades.upgradeProxy(proxyAddress, GemMintV2);
  console.log("Upgrade successful!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
