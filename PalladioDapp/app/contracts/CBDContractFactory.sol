pragma solidity ^0.4.17;

import "./CBDContract.sol";


contract CBDContractFactory {

    // In order to verify incoming orders are from
    // licensed architects, we check the address vs
    // our saved list of users. (Because we need
    // to verify existence of the architect, we 
    // use a mapping instead of an array)
    uint numLicensedArchitects;
    mapping(address => uint) licensedArchitects;


    // contract address array.  Lists all
    // open contracts.  After a contract is
    // complete it will be removed from this
    // list.  The mapping is id->contract
    // mainly used for iterating over all open contracts
    //uint totalCBDs;
    //uint liveCBDs;
    //mapping(uint => address) public CBDs;
    address[] public CBDs;
 
    // The management address is the address that is 
    // allowed to register new verified architects
    address palladioManagement;

    address tokenContract;

    event NewCBD(address indexed newCBDAddress);

    // Constructor sets the address of our management account
    // This is the only account able to add new licensedArchitects
    function CBDContractFactory() public {
        palladioManagement = msg.sender;
    }

    function getPalladioAddress()
    public
    constant
    returns(address)
    {
        return palladioManagement;
    }

    function getTokenAddress()
    public
    constant
    returns(address)
    {
        return tokenContract;
    }

    // Add a new architect to the system.  This architect
    // will then be able to register new contracts
    function registerArchitect(address architect)
    public
    payable
    fromPalladio()
    checkArchitect(architect, false)
    {
        // Skip first value (0 represents null)
        numLicensedArchitects += 1;
        licensedArchitects[architect] = numLicensedArchitects;
    }

    // Returns the number of architects registered with Palladio
    function numArchitects()
    public 
    constant
    returns (uint)
    {
        return numLicensedArchitects;
    }

    // Get number of currently active contracts
    function getCBDCount()
    public
    constant
    returns(uint)
    {
        return CBDs.length;
    }

    // Create a new Collaborative Blockchain Design contract.  
    // Only a licensed architect is permitted to do this
    function newCBDContract(uint autoreleaseInterval, string recordBook, string initialStatement)
    public
    payable
    checkArchitect(msg.sender, true)
    {
        //pass along any ether to the constructor
        uint nextId = CBDs.length;
        CBDContract cbd = (new CBDContract).value(msg.value)(msg.sender, nextId, autoreleaseInterval,
        recordBook, initialStatement);
        NewCBD(cbd);

        //save created CBDs in contract array
        CBDs.push(cbd);
    }

    function getCBDContract(uint id)
    public
    constant
    returns(address)
    {
        return CBDs[id];
    }

    // A contract may request cleanup here
    // We always assume for valid reasons,
    // it is the responsiblity of the contract
    // to ensure this request is valid
    function removeCBDContract(uint contractId)
    public
    calledFromContract(contractId)
    {
        // Shuffle contracts down, remove destructed contract
        uint numContracts = CBDs.length;
        CBDs[contractId] = CBDs[numContracts - 1];
        CBDContract(CBDs[contractId]).setId(contractId);
        CBDs.length = numContracts - 1;
    }

    function setTokenContract(address newTokenContract)
    public
    fromPalladio()
    {
        tokenContract = newTokenContract;
    }
    
    // Modifiers below:
    // Ensure function call came from Palladio Management (aLPHA TEST ACCOUNT): 0x26e0c9d26433188bDB1A9D896B75134eFe2F3959
    modifier fromPalladio() {
    require(palladioManagement == msg.sender);
        _;
    }

    // Check if the address passed is registered as an architect
    modifier checkArchitect(address architect, bool wantArchitect) {
        bool isArchitect = licensedArchitects[architect] != 0;
        require(isArchitect == wantArchitect); 
        _;
    }

    modifier contractExists(uint contractId) {
        require(CBDs[contractId] != 0);
        _;
    }

    modifier calledFromContract(uint id) {
        require(id < CBDs.length);
        require(msg.sender == CBDs[id]);
        _;
    }
}