// TODO: Some sort of serious logging
function onError(err) {
    alert("Quick, Call batman! We have a: " + err);
    $('#onCreateCBDBtn')[0].disabled = false
}

function callNewCBD(valueInEth, licensedArchitect, defaultTimeoutLengthInHours, commitRecordBook, description) {
    var valueInWei = web3.utils.toWei(valueInEth, 'ether');
    var autoreleaseInterval = defaultTimeoutLengthInHours*60*60;

    $('#onCreateCBDBtn')[0].disabled = true
    $("#outputDiv").html("Contract submitted to the blockchain (view Contract on Etherscan)");
    CBDContractFactory.methods.newCBDContract(autoreleaseInterval, commitRecordBook, description)
        .send({'from':licensedArchitect,'value': valueInWei})
        .then(function(result){
            $('#onCreateCBDBtn')[0].disabled = false
            $("#outputDiv").html("Contract submitted successfully (updating number of live contracts)");
            return CBDContractFactory.methods.getCBDCount().call();
        }, onError).then(function(result) {
            $("#outputDiv").html("CBD Creation transaction submitted successfully. There are " + result + " available contracts");
        }, onError);
}

function useCBDFormInput() {
    var valueInEth = $("#paymentAmountInput").val();
    if (valueInEth == '') {
        alert("Please specify payment amount!");
        return;
    }
    valueInEth = Number(valueInEth);

    var architectAccount = getSelectedAccount("#architectAccount")
    if (!validateAccount(architectAccount))
        return

    var commitRecordBook = $("#category").val();
    if (commitRecordBook == '') {
            alert("Which service would you like to use?");
            return;

    }
    var defaultTimeoutLengthInHours = $("#defaultTimeoutLengthInHoursInput").val();
    if (defaultTimeoutLengthInHours == '') {
        alert("Must specify a default timeout length!)");
        return;
    }
    defaultTimeoutLengthInHours = Number(defaultTimeoutLengthInHours);


    var description = $("#description").val();
    if (description == '') {
        if (!confirm("Include a link to your file?")) {
            return;
        }
    }
    callNewCBD(valueInEth, architectAccount, defaultTimeoutLengthInHours, commitRecordBook, description);
}

populateSelectWithAccounts("#architectAccount")