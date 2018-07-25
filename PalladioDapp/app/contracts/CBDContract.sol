pragma solidity ^0.4.17;

import "./CBDContractFactory.sol";
import "./PalladioCad.sol";

//*Collaborative Blockchain Design (CBD) begins when the Licensed Architect (Ontario Association of Architects)is: 
// (1) digitally-verified using their unique Public Key assigned by the Palladio; 
// (2) creates an open call for submissions; and 
// (3) defines the inital value of the contract.
//
//*A verified Associate "intern" Architect can join the contract, in order to submit work annonymously when
// The Associacte Architect has:

// (1) been accredicted by the Canadian Architecture Certification Board (CACB); 
// (2) authenticated their identity using their unique CACB Public Key to access the form;
// (3) commits to the contract by making a deposit with PalladioCAD Tokens (PCAD)

// The constructor is payable, so the contract can be instantiated with initial funds.
// In addition, anyone can add more funds to the Payment by calling addFunds.

// The Licensed Architect controls most functions, but
// the lLicensed Architect can never recover the payment, so they should pay a small disposable amount.
//
// If he calls the recover() function before anyone else commit() the funds will be returned, minus the 2% fee.

// If the CBD is in the Open state, ANYONE can join the contract anonymously by a verified professional. 
// Only a digitally-verified Associate Architect can receive payment in the commited state.
// The Associate Architect MUST be verified or their submission will not be posted and the contract remains OPEN.

// An Associate Architect is digitally-verified, instantly, their Record Book Experience Form 
// is digitally signed with a time-stamp, and the contract state changes from "open()" to "commit()"
// for their eventual license review. 

// This change in the state from Open to Committed is instantaneous and cannot be reversed. 
// The CBD will never revert to the Open state once commited.
// Any associate can join the contract once it's been set via commit().

// In the committed state,
// the Licensed Architect can at any time choose to release any amount of PL1 Tokens.
// any Associate Architect and any amount of funds.*

contract CBDContract {

    // Cache the address of the owning factory
    // so we can notify on deletion
    address factory;
    // Cache the ID of this 
    uint id;

//recordBook will never change and must be one of the following:
//A Design / Construction Documents
// 1 Programming
// 2 Site Analysis
// 3 Schematic Design
// 4 Engineering Systems Coordination
// 5 Building Cost Analysis
// 6 Code Research
// 7 Design Development
// 8 Construction Documents
// 9 Specifications & Materials Research
// 10 Document Checking and Coordination //

    string public recordBook;
    string public initialStatement;

    //CBD will start with a licensedArchitect but no associateArchitect (associateArchitect==0x0)
    address public licensedArchitect;
    address public associateArchitect;
            
    //Set to true if fundsRecovered is called
    bool recovered = false;

    //Note that these will track, but not influence the CBD logic.
    uint public amountDeposited;
    uint public amountReleased;

    //How long should we wait before allowing the default release to be called?
    uint public autoreleaseInterval;

    //Has the Associate Architect uploaded a file before the timer reaches zero?
    string public fileUpload;

    //Calculated from autoreleaseInterval in commit(),
    //and recaluclated whenever the licensedArchitect (or possibly the associateArchitect) 
    //calls delayhasDefaultRelease()
    //After this time, auto-release can be called by the associateArchitect.
    uint public autoreleaseTime;

    //Most action happens in the Committed state.
    enum State {
        Open,
        Committed,
        Closed
    }
    
    State public state;
    //Note that a CBD cannot go from Committed back to Open, but it can go from Closed back to Committed
    //(this would retain the committed associateArchitect). Search for Closed and Unclosed events to see how this works.

    event Created(address indexed contractAddress, address _licensedArchitect, uint _autoreleaseInterval, string _recordBook);
    event FundsAdded(address from, uint amount); //The licensedArchitect has added funds to the CBD.
    event LicensedArchitectStatement(string statement);
    event AssociateArchitectStatement(string statement);
    event FundsRecovered();
    event Committed(address _associateArchitect);
    event RecordBook(string statement);
    event FundsReleased(uint amount);
    event FileSubmitted(string fileUpload);
    event Closed();
    event Unclosed();
    event AutoreleaseTriggered();

    function CBDContract(address architect, uint _id, uint _autoreleaseInterval, string _recordBook, string _initialStatement)
    payable 
    public
    {
        // Cache identifying variables linking us back to factory
        id = _id;
        factory = msg.sender;

        licensedArchitect = architect;
        
        recordBook = _recordBook;

        state = State.Open;

        autoreleaseInterval = _autoreleaseInterval;

        initialStatement = _initialStatement;

        if (bytes(initialStatement).length > 0)
            LicensedArchitectStatement(initialStatement);

        if (msg.value > 0) {
            FundsAdded(architect, msg.value);
            amountDeposited += msg.value;
        }

        Created(this, licensedArchitect, _autoreleaseInterval, _recordBook);		
    }

    // Allow the factory to reset our index
    function setId(uint _id)
    public
    isFromFactory()
    {
        id = _id;
    }

    function getId()
    public
    constant
    returns(uint)
    {
        return id;
    }

    function getArchitect()
    public
    constant
    returns(address)
    {
        return licensedArchitect;
    }

    function getAssociate()
    public
    constant
    returns(address)
    {
        return associateArchitect;
    }

    function getState()
    public
    constant
    returns(State)
    {
        return state;
    }

    function getFileSubmitted()
    public
    constant
    returns(string)
    {
        return fileUpload;
    }

    function getFullState()
    public
    constant
    returns(address, string, string, State, address, uint, uint, uint, uint, uint, string) 
    {
        return (licensedArchitect, recordBook, initialStatement, state, associateArchitect, this.balance, amountDeposited, amountReleased, autoreleaseInterval, autoreleaseTime, fileUpload);
    }

    function getBalance()
    public
    constant
    returns(uint)
    {
        return this.balance;
    }

    function addFunds()
    public
    payable
    {
        require(msg.value > 0);

        FundsAdded(msg.sender, msg.value);
        amountDeposited += msg.value;
        if (state == State.Closed) {
            state = State.Committed;
            Unclosed();
        }
    }

    function recoverFunds()
    public
    onlylicensedArchitect()
    inState(State.Open) 
    {
        recovered = true;
        
        CBDContractFactory owner = CBDContractFactory(factory);
        owner.removeCBDContract(id);

        FundsRecovered();
        selfdestruct(licensedArchitect);
    }

    // An associate can commit
    function commit(address associate)
    public
    inState(State.Open)
    {
        CBDContractFactory owner = CBDContractFactory(factory);
        require(msg.sender == owner.getTokenAddress());
        
        // We assume, that having been called from the token contract
        // means that the transfer has been made and it is valid for the
        // originator of this call to become the associate
        associateArchitect = associate;
        state = State.Committed;
        Committed(associateArchitect);

        autoreleaseTime = now + autoreleaseInterval;
    }

    //////////////////////////////////////////////////////

    function getAutoReleaseTime()
    public
    constant
    inState(State.Committed)
    returns(uint)
    {
        return autoreleaseTime;
    }


// File must uploaded by associate before timer reaches 0.

function fileSubmitted(string fileUpload)
public
payable
inState(State.Committed) {
{
    if (string(fileUpload).length == 0)
    return fileUpload;
}





// Autorelease function will send all funds to Associate Architect
// Automatically sends 2% (in Wei) to Palladio Address; returns false on failure.

    function triggerAutoRelease()
    public
    inState(State.Committed)
    isPastAutoRelease()
    {
        AutoreleaseTriggered();
        internalRelease(this.balance);
    }

   

    ////////////////////////////////////////////////////////

    // Chat/logging functions
    function loglicensedArchitectStatement(string statement)
    public
    onlylicensedArchitect() 
    {
        LicensedArchitectStatement(statement);
    }

    function logassociateArchitectStatement(string statement)
    public
    onlyassociateArchitect() 
    {
        AssociateArchitectStatement(statement);
    }

    ////////////////////////////////////////////////////////

     function internalRelease(uint amount)
    private
    inState(State.Closed)
    {
        CBDContractFactory owner = CBDContractFactory(factory);
        // Palladio charges service fee
        // Note: we can't use float operators
        // on uint256
        uint palladioFee = amount * 2 / 100;
        owner.getPalladioAddress().transfer(palladioFee);

        // subtract fee from amount sent
        uint associateAmount = amount - palladioFee;
        associateArchitect.transfer(associateAmount);

        amountReleased += amount;
        FundsReleased(amount);

        if (this.balance == 0) {
            state = State.Closed;
            Closed();

            owner.removeCBDContract(id);
        }
    }
    

    modifier isFromFactory() {
        require(msg.sender == factory);
        _;
    }

    modifier inState(State s) {
        require(s == state);
        _;
    }

    modifier onlylicensedArchitect() {
        require(msg.sender == licensedArchitect);
        _;
    }

    modifier onlyassociateArchitect() {
        require(msg.sender == associateArchitect);
        _;
    }
    modifier onlylicensedArchitectOrassociateArchitect() {
        require((msg.sender == licensedArchitect) || (msg.sender == associateArchitect));
        _;
    }

    modifier isPastAutoRelease() {
        require(now >= autoreleaseTime);
        _;
    }

    modifier isBeforeAutoRelease() {
        require(now < autoreleaseTime);
        _;
    }
}