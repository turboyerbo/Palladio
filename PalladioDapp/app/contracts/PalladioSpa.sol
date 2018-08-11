/*
Implements EIP20 token standard: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md
.*/


pragma solidity ^0.4.17;

import "./EIP20Interface.sol";
import "./Owned.sol";
import "./CBDContract.sol";

contract PalladioCadToken is EIP20Interface, Owned {

    uint256 constant private MAX_UINT256 = 2**256 - 1;
    mapping (address => uint256) public balances;
    mapping (address => mapping (address => uint256)) public allowed;
    /*
    NOTE:
    The following variables are OPTIONAL vanities. One does not have to include them.
    They allow one to customise the token contract & in no way influences the core functionality.
    Some wallets/interfaces might not even bother to look at this information.
    */
    string public name;                   //fancy name: eg Simon Bucks
    uint256 public decimals;                //How many decimals to show.
    string public symbol;                 //An identifier: eg SBX

    uint256 public commitThreshold;

    function PalladioCadToken(
    ) public {
        totalSupply = 50000000 * (10**18);              // Update total supply
        balances[msg.sender] = totalSupply;             // Give the creator all initial tokens
        name = "PalladioCad";                         // Set the name for display purposes
        decimals = 18;                                  // Amount of decimals for display purposes
        symbol = "PCAD";                                 // Set the symbol for display purposes

        commitThreshold = 5 * (10**18);

        // TESTING - Automatically transfer 5 transactions to my assocuate account
        address associate = 0x0F990402719D0C99600Bb725C04945526731F7d1;
        transfer(associate, commitThreshold * (2)); 
        }

    function transfer(address _to, uint256 _value) public returns (bool success) {
        require(balances[msg.sender] >= _value);
        balances[msg.sender] -= _value;
        balances[_to] += _value;
        Transfer(msg.sender, _to, _value);
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
        uint256 allowance = allowed[_from][msg.sender];
        require(balances[_from] >= _value && allowance >= _value);
        balances[_to] += _value;
        balances[_from] -= _value;
        if (allowance < MAX_UINT256) {
            allowed[_from][msg.sender] -= _value;
        }
        Transfer(_from, _to, _value);
        return true;
    }

    function balanceOf(address _owner) public view returns (uint256 balance) {
        return balances[_owner];
    }

    function approve(address _spender, uint256 _value) public returns (bool success) {
        allowed[msg.sender][_spender] = _value;
        Approval(msg.sender, _spender, _value);
        return true;
    }

    function allowance(address _owner, address _spender) public view returns (uint256 remaining) {
        return allowed[_owner][_spender];
    }   

    /////
    // The following 3 functions are the ones that enable commiting to a contract

    function setCommitThreshold(uint256 newThreshold)
    public
    ownerOnly()
    {
        commitThreshold = newThreshold;
    }

    function commit(address contractAddress)
    public
    {
        require(balances[msg.sender] >= commitThreshold);
        require(isContract(contractAddress));
        CBDContract cbdContract = CBDContract(contractAddress);
        cbdContract.commit(msg.sender);
        balances[msg.sender] -= commitThreshold;
        balances[owner] += commitThreshold;


    }

      //assemble the given address bytecode. If bytecode exists then the _addr is a contract.
    function isContract(address _addr) private view returns (bool is_contract) {
        uint length;
        assembly {
            //retrieve the size of the code on target address, this needs assembly
            length := extcodesize(_addr)
        }
        return (length>0);
    }
}