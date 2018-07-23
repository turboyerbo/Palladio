var CBDContract_JSON = require('../dist/contracts/CBDContract.json');

function bn_equals(lhs, rhs, message) {
    assert.equal(lhs.equals(rhs), true, message + " (" + lhs.toString() + " != " + rhs.toString());
}

describe("CBDContractFactory", function() {

    // First, get the array of all accounts on the testnet
    var accounts = null
    var palladio = null
    var architect = null
    var associate = null
    before(function(done) {
        this.timeout(0);
        web3.eth.getAccounts(function(error, result) {
            if(error != null)
                console.log("Couldn't get accounts: " + error);
            accounts = result

            palladio = accounts[0]
            architect = accounts[1]
            associate = accounts[2]
            done()
        });
    });

    // Deploy the contract
    before(function(done) {
        this.timeout(0);
        var contractsConfig = {
            "CBDContractFactory": {
                args: [palladio]
            }
        };
        EmbarkSpec.deployAll(contractsConfig, done);
    });

    // Test we are initialized in a valid state (and that we
    // can call the functions listed)
    it("Should have no contracts after deployment", function(done) {
        CBDContractFactory.getCBDCount(function(err, result) {
            assert.equal(result.toNumber(), 0);
            done();
        });
    });

    it("Should have no architects after deployment", function(done) {
        CBDContractFactory.numArchitects(function(err, result) {
            assert.equal(result.toNumber(), 0);
            done();
        });
    });

    
    it("Registering an architect", function(done) {
        CBDContractFactory.registerArchitect(architect, function(err, accountaddress) {
            CBDContractFactory.numArchitects(function(err, result) {
                assert.equal(result.toNumber(), 1);
                done();
            });
        });
    });

    it("Refuse duplicate architects", function(done) {
        CBDContractFactory.registerArchitect(architect, function(err, accountaddress) {
            CBDContractFactory.numArchitects(function(err, result) {
                assert.equal(result.toNumber(), 1);
                done();
            });
        });
    });

    it("Only Palladio can register architects", function(done) {
        CBDContractFactory.registerArchitect(associate, {value: 30, from: accounts[3]}, function(err, result) {
            CBDContractFactory.numArchitects(function(err, result) {
                assert.equal(result.toNumber(), 1);
                done();
            });
        });
    });

    // Create a new contract
    var cbd = null;
    var recordBook = "RecordBook: record";
    var instructions = "Some Basic Instructions"
    serviceDeposit = web3.toBigNumber(web3.toWei(10, 'ether'));
    autoReleaseInterval = 5; //60 * 60 * 24 * 3; // 5 seconds
    payout = web3.toBigNumber(web3.toWei(30, 'ether'));
    it("Architect can create contract", function(done) {
        CBDContractFactory.newCBDContract(serviceDeposit.toString(), autoReleaseInterval, recordBook, instructions, {from: architect, value:payout, gas: 4500000}, function(err, result) {
            assert.equal(result != null, true);
            CBDContractFactory.getCBDCount(function(err, result) {
                assert.equal(result.toNumber(), 1);
                CBDContractFactory.getCBDContract(0, function(err, result) {
                    assert.equal(result != null, true);
                    assert.equal(web3.isAddress(result), true);
                    cbd = web3.eth.contract(CBDContract_JSON.abi).at(result)
                    done();
                });
            });


        });
    });

    // Only architect can create contract
    it("Associate cannot create contract", function(done) {
        CBDContractFactory.newCBDContract(serviceDeposit.toString(), autoReleaseInterval, recordBook, instructions, {from: associate, gas: 4500000}, function(err, result) {
            assert.equal(result, null);
            CBDContractFactory.getCBDCount(function(err, result) {
                assert.equal(result.toNumber(), 1);
                done();
            });
        });
    });

    // Test Contract
    it ("Initial State Valid", function(done) {
        cbd.getFullState(function(err, result) {
            assert.equal(result[0], architect);
            assert.equal(result[1], recordBook);
            assert.equal(result[2], instructions);
            assert.equal(result[3], 0);
            assert.equal(result[4], 0);
            bn_equals(result[5], payout)
            bn_equals(result[6], serviceDeposit)
            bn_equals(result[7], payout)
            assert.equal(result[8].toNumber(), 0); // Amount released
            assert.equal(result[9].toNumber(), autoReleaseInterval);
            assert.equal(result[10].toNumber(), 0);
            done();
        });
    });

    // test adding some more funds to contract
    it ("Can add funds", function(done) {
        cbd.getBalance(function(err, result) {
            bn_equals(result, payout);
            additionalFunds = web3.toWei(7, 'ether');
            cbd.addFunds({from: accounts[3], value: additionalFunds}, function(err, result) {
                cbd.getBalance(function(err, result) {
                    payout = payout.add(additionalFunds)
                    bn_equals(result, payout);
                    done()
                })                
            })
        })
    })

    var autoReleaseTime;
    it ("Associate can commit", function(done) {
        cbd.commit({from: associate, value: serviceDeposit}, function(err, result) {
            // Assume insta-mine, and our commit time is this second
            commitTime = Math.floor(Date.now() / 1000)
            payout = payout.add(serviceDeposit)
            cbd.getBalance(function(err, result) {
                bn_equals(result, payout);
                cbd.getAutoReleaseTime(function(err, result) {
                    // Check this
                    autoReleaseTime = result.toNumber()
                    
                    // Check autorelease time is within 2 seconds of our time
                    timeDiff = autoReleaseTime - (autoReleaseInterval + commitTime)
                    closeEnough = timeDiff >= 0 && timeDiff <= 2
                    assert.equal(closeEnough, true, "AutoRelease time not within 2 seconds of expected time");
                    done();
                })
            })
        })
    })

    // Should not be able to release any funds before timer is up
    it ("Architect cannot recover funds after commit", function(done) {
        cbd.recoverFunds(function(err, result) {
            cbd.getBalance(function(err, result) {
                bn_equals(result, payout);
                done()
            });
        })
    })

    // Should not be able to release any funds before timer is up
    it ("Associate cannot trigger autoRelase funds", function(done) {
        cbd.triggerAutoRelease(function(err, result) {
            cbd.getBalance(function(err, result) {
                bn_equals(result, payout);
                cbd.release(5, function(err, result) {
                    cbd.getBalance(function(err, result) {
                        bn_equals(result, payout);
                        done()
                    });
                });
            });
        })
    })

    it ("Another associate cannot commit", function(done) {
        cbd.commit({from: accounts[4], value: serviceDeposit}, function(err, result) {
            cbd.getAssociate(function(err, result) {
                assert.equal(result, associate);
                // Assert that no extra funds were added
                cbd.getBalance(function(err, result) {
                    bn_equals(result, payout);
                    done()
                });
            });
        });
    });
    it ("Architect can delay fund release before timeout", function(done) {
        cbd.delayAutorelease({from: architect}, function(err, result) {
            // Assume insta-mine, and our commit time is this second
            var newCommitTime = Math.floor(Date.now() / 1000)
            cbd.getAutoReleaseTime(function(err, result) {
                // Check this
                autoReleaseTime = result.toNumber()
                
                assert.equal(autoReleaseTime, autoReleaseInterval + newCommitTime);
                done();
            })
        })
    })
    it ("Associate cannot delay funds (why would they?)", function(done) {
        cbd.delayAutorelease({from: associate}, function(err, result) {
            cbd.getAutoReleaseTime(function(err, result) {
                // release time hasn't changed
                assert.equal(autoReleaseTime, result.toNumber());
                done()
            });
        });
    });

    it ("Architect cannot delay fund release after timeout", function(done) {
        // This method will pause until auto-release interval has passed.
        // so stop Mocha from thinking it's crashed and timing us out.
        this.timeout(10000)
        setTimeout(function() {
            nowTime = Math.floor(Date.now() / 1000)
            assert.equal(nowTime > autoReleaseTime, true, "We should be passed auto-release time")
            // After timeout, 
            cbd.delayAutorelease({from: architect}, function(err, result) {
                cbd.getAutoReleaseTime(function(err, result) {
                    // release time hasn't changed
                    assert.equal(autoReleaseTime, result.toNumber(), "Architect should not have been able to change timeout once passed");
                    done()
                })
            })
        }, (autoReleaseInterval + 1) * 1000)
    })

    var secondContract = null
    it("Architect can create 2nd contract", function(done) {
        CBDContractFactory.newCBDContract(serviceDeposit.toString(), autoReleaseInterval, recordBook, instructions, {from: architect, value:payout, gas: 4500000}, function(err, result) {
            assert.equal(result != null, true);
            CBDContractFactory.getCBDCount(function(err, result) {
                assert.equal(result.toNumber(), 2);
                CBDContractFactory.getCBDContract(1, function(err, result) {
                    assert.equal(result != null, true);
                    assert.equal(web3.isAddress(result), true);
                    secondContract = result;
                    done();
                });
            });
        });
    });

    // Should now be able to release any funds because timer is up
    it ("Associate can trigger autoRelase funds after timeout", function(done) {
        cbd.getBalance(function(err, result) {
            web3.eth.getBalance(associate, function(err, result){
                var initBalance = result;
                web3.eth.getBalance(palladio, function(err, result){
                    var initPalladio = result;
                    cbd.triggerAutoRelease({from: associate}, function(err, result) {
                        web3.eth.getTransactionReceipt(result, function(err, result) {
                            gasUsed = result.gasUsed
                            cbd.getBalance(function(err, result) {
                                assert.equal(result, 0, "All funds from contract not disbursed");
                                web3.eth.getBalance(associate, function(err, result){
                                    palladioFee = payout.times(2).div(100)
                                    actualPayout = payout.minus(palladioFee)
                                    finalBalance = initBalance.plus(actualPayout).minus(gasUsed)
                                    bn_equals(result, finalBalance, "Associate payment not transfered");

                                    // check 2% transfered to wassisname
                                    web3.eth.getBalance(palladio, function(err, result){
                                        bn_equals(result, initPalladio.add(palladioFee), "Palladio fee not transfered")
                                        done()
                                    })
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    it ("Contract is closed and removed from factory", function(done) {
        cbd.getState(function(err, result) {
            assert.equal(result.toNumber(), 2);
            // Assert that the contract has been removed from the live list
            CBDContractFactory.getCBDCount(function(err, result) {
                assert.equal(result.toNumber(), 1);
                // Check the remaining contract is the 2nd contract
                CBDContractFactory.getCBDContract(0, function(err, result) {
                    assert.equal(result == secondContract, true);
                    done();
                });
            })
        })
    })

    it ("Architect can recover funds before any commits", function(done) {
        cbd = web3.eth.contract(CBDContract_JSON.abi).at(secondContract)
        cbd.getId(function(err, result) {
            assert.equal(result.toNumber(), 0, "Second contract ID not updated to 0");

            web3.eth.getBalance(architect, function(err, result) {
                initBalance = result
                cbd.recoverFunds({from: architect}, function(err, result) {
                    // It doesn't seem like we can recover transaction cost for this
                    // call.  Possibly because the 'self-destruct' initiated
                    CBDContractFactory.getCBDCount(function(err, result) {
                        assert.equal(result.toNumber(), 0, "Second Contract not cleaned up on Factory");
                        web3.eth.getBalance(architect, function(err, result) {

                            finalBalance = initBalance.plus(payout)

                            // console.log("Architect init balance: " + web3.fromWei(initBalance, 'ether'));
                            // console.log("Architect refund: " + web3.fromWei(payout, 'ether'));
                            // console.log("Architect exp balance: " + web3.fromWei(finalBalance));
                            // console.log("Architect actual balance: " + web3.fromWei(result, 'ether'));
                            // console.log("Difference: " + diff);

                            // We can't test exact equality, so just test for really really small difference
                            diff = web3.fromWei(result.minus(finalBalance), 'ether')
                            assert.equal(diff < 0.0000001, true, "Architect did not recover funds when cancelling contract");
                            done()
                        });
                    });
                });
            });
        });
    });
})