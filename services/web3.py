from web3 import Web3

# Connect to Ethereum node
w3 = Web3(Web3.HTTPProvider("https://mainnet.infura.io/v3/YOUR-PROJECT-ID"))

# Contract ABI and address
abi = [...]  # Contract ABI
contract_address = "0xYourContractAddress"
contract = w3.eth.contract(address=contract_address, abi=abi)

# Event filter
event_filter = contract.events.TransferWithReward.createFilter(fromBlock="latest")

# Event processing loop
while True:
    for event in event_filter.get_new_entries():
        # Process event
        process_event(event)
    time.sleep(2)
