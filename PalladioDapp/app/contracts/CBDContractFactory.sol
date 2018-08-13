pragma solidity ^0.4.17;

import "./CBDContract.sol";


contract CBDContractFactory {

    // In order to verify incoming orders are from
    // licensed Planners, we check the address vs
    // our saved list of users. (Because we need
    // to verify existence of the Planner, we 
    // use a mapping instead of an array)
    uint numLicensedPlanners;
    mapping(address => uint) licensedPlanners;


    // Contract address array.  Lists all
    // open contracts.  After a contract is
    // complete it will be removed from this
    // list.  The mapping is id->contract
    // mainly used for iterating over all open contracts
    //uint totalCBDs;
    //uint liveCBDs;
    //mapping(uint => address) public CBDs;
    address[] public CBDs;
 
    // The management address is the address that is 
    // allowed to register new verified Planners
    address palladioManagement;

    address tokenContract;

    event NewCBD(address indexed newCBDAddress);

    // Constructor sets the address of our management account
    // This is the only account able to add new licensedPlanners
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

    // Add a new Planner to the system.  This Planner
    // will then be able to register new contracts
    function registerPlanner(address Planner)
    public
    payable
    fromPalladio()
    checkPlanner(Planner, false)
    {
        // Skip first value (0 represents null)
        numLicensedPlanners += 1;
        licensedPlanners[Planner] = numLicensedPlanners;
    }

    // Returns the number of Planners registered with Palladio
    function numPlanners()
    public 
    constant
    returns (uint)
    {
        return numLicensedPlanners;
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
    // Only a licensed Planner is permitted to do this
    function newCBDContract(uint autoreleaseInterval, string recordBook, string initialStatement)
    public
    payable
    checkPlanner(msg.sender, true)
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

    // Check if the address passed is registered as an Planner
    modifier checkPlanner(address Planner, bool wantPlanner) {
        bool isPlanner = licensedPlanners[Planner] != 0;
        require(isPlanner == wantPlanner); 
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