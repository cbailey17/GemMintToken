const hre = require("hardhat");

async function main() {
    // Get signers (wallet addresses)
    const [deployer, rewardsPool, icoPresale, liquidityPool, development, team, marketing, reserves] = await hre.ethers.getSigners();
    const contractAddress = "DEPLOYED_CONTRACT_ADDRESS";

    // Attach to the deployed contract
    const GemMint = await hre.ethers.getContractFactory("GemMint");
    const gemMint = await GemMint.attach(contractAddress);

    console.log("Interacting with contract at:", contractAddress);

    // Verify the deployer's balance
    const deployerBalance = await gemMint.balanceOf(deployer.address);
    console.log("Deployer balance:", hre.ethers.utils.formatUnits(deployerBalance, 18));

    // Verify the rewards pool balance
    const rewardsPoolBalance = await gemMint.balanceOf(rewardsPool.address);
    console.log("Rewards Pool balance:", hre.ethers.utils.formatUnits(rewardsPoolBalance, 18));

    // Verify the ICO Presale balance
    const icoPresaleBalance = await gemMint.balanceOf(icoPresale.address);
    console.log("ICO Presale balance:", hre.ethers.utils.formatUnits(icoPresaleBalance, 18));

    // Verify the Liquidity Pool balance
    const liquidityPoolBalance = await gemMint.balanceOf(liquidityPool.address);
    console.log("Liquidity Pool balance:", hre.ethers.utils.formatUnits(liquidityPoolBalance, 18));

    // Verify the Development balance
    const developmentBalance = await gemMint.balanceOf(development.address);
    console.log("Development balance:", hre.ethers.utils.formatUnits(developmentBalance, 18));

    // Verify the Team balance
    const teamBalance = await gemMint.balanceOf(team.address);
    console.log("Team balance:", hre.ethers.utils.formatUnits(teamBalance, 18));

    // Verify the Marketing balance
    const marketingBalance = await gemMint.balanceOf(marketing.address);
    console.log("Marketing balance:", hre.ethers.utils.formatUnits(marketingBalance, 18));

    // Verify the Reserves balance
    const reservesBalance = await gemMint.balanceOf(reserves.address);
    console.log("Reserves balance:", hre.ethers.utils.formatUnits(reservesBalance, 18));

    // Check if deployer is the owner
    const owner = await gemMint.owner();
    console.log("Owner address:", owner);
    console.assert(owner === deployer.address, "Deployer is not the owner!");

    // Check rewards pool address is correct
    const rewardsPoolFromContract = await gemMint.rewardsPool();
    console.log("Rewards Pool Address (from contract):", rewardsPoolFromContract);
    console.assert(rewardsPoolFromContract === rewardsPool.address, "Rewards Pool address mismatch!");

    // Add rewards pool as a partner
    await gemMint.addPartner(rewardsPool.address);
    console.log("Added Rewards Pool as a partner.");

    // Verify the partner status
    const isPartner = await gemMint.partners(rewardsPool.address);
    console.log("Is Rewards Pool a partner?", isPartner);
    console.assert(isPartner, "Rewards Pool was not correctly added as a partner!");

    console.log("All initialization tests passed.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

