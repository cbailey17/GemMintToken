const { ethers, upgrades } = require("hardhat");

async function main() {
  const NEW_IMPLEMENTATION_ADDRESS = "ADDRESS_OF_NEW_IMPLEMENTATION"; 

  console.log("Starting upgrade...");

  // Fetch the address of the deployed proxy
  const GEMMINT_PROXY_ADDRESS = ""; 

  // Get the updated implementation contract
  const GemMintV2 = await ethers.getContractFactory("GemMintV2");
  
  // Upgrade the proxy
  const gemMint = await upgrades.upgradeProxy(GEMMINT_PROXY_ADDRESS, GemMintV2);
  console.log("GemMint upgraded successfully. New implementation address:", await upgrades.erc1967.getImplementationAddress(gemMint.address));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

