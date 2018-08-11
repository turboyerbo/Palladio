function getSearchParameters() {
  var prmstr = window.location.search.substr(1);
  return prmstr != null && prmstr != "" ? transformToAssocArray(prmstr) : {};
}

function transformToAssocArray( prmstr ) {
  var params = {};
  var prmarr = prmstr.split("&");
  for ( var i = 0; i < prmarr.length; i++) {
      var tmparr = prmarr[i].split("=");
      params[tmparr[0]] = tmparr[1];
  }
  return params;
}

function onError(err)
{
  console.log("Error calling CBD method: " + err);
  ////workaournd////////////////////////////////////////////////////////
  console.log("This Contract doesn't exist or was destroyed.")
  document.getElementById('licensedArchitectFundsInputGroup').hidden = true;
  document.getElementById('updatelicensedArchitectStringInputGroup').hidden = true;
  document.getElementById('updateApplicantStringInputGroup').hidden = true;
  document.getElementById('commitInputGroup').hidden = true;
  document.getElementById('recoverFundsInputGroup').hidden = true;
  document.getElementById('defaultActionInputGroup').hidden = true;
  document.getElementById('delayDefaultActionForm').hidden = true;

  $('.insertAddress').text(CBD.address);
  $('#etherscanLink').attr("href", '${window.etherscanURL}${CBD.address}');
  $('#CBDInfoOutput').text("Doesn't exist/Destroyed");
  $('#CBDlicensedArchitectOutput').text("None")
  $('#CBDApplicantOutput').text("None")
  $('#CBDlicensedArchitectStringOutput').text("None");
  $('#CBDApplicantStringOutput').text("None");
  $('#CBDBalanceOutput').text("None");
  $('#CBDFundsDepositedOutput').text("None");

  $('#CBDFundsReleasedOutput').text("None");
  $('#CBDDefaultActionOutput').text("None");
  $('#CBDDefaultTimeoutLength').text("None");
  $('#CBDTable').css("background-color", "grey");
}

__loadManagerInstance.execWhenReady(function() {
  //window.etherscanURL = "https://etherscan.io/address/"
  window.etherscanURL = "https://ropsten.etherscan.io/address/";

  params = getSearchParameters();
  address = params.contractAddress;
  CBDContract.options.address = address;

  getEventsAndParticipants('logs','getLogs','address=' + address);
  registerForNewEvents();

  window.checkUserAddressesInterval = setInterval(checkForUserAddresses, 1000);
  window.getFullStateInterval = setInterval(function(){
    web3.eth.getCode(address,function(err,res){
      if(res == "0x"){
        onError(err)
      }
      else{
        CBDContract.methods.getFullState().call()
        .then(function(res){
          CBD = parseCBDState(res, address)
          insertInstanceStatsInPage(CBD);
          updateExtraInput(CBD);
        }, onError);
      }
    })
  }, 3000);
});

function insertInstanceStatsInPage(CBD, address){
  $('.insertAddress').text(CBD.address);
  $('#etherscanLink').attr("href", `${window.etherscanURL}${address}`);
  $('#CBDInfoOutput').text(CBD_STATES[CBD.state]);
  $('#CBDlicensedArchitectOutput').text(CBD.licensedArchitect)
  $('#CBDlicensedArchitectStringOutput').text(CBD.initialStatement);
  CBD.Applicant == '0x0000000000000000000000000000000000000000' ? $('#CBDApplicantOutput').text("None") : $('#CBDApplicantOutput').text(CBD.applicant);
  $('#CBDApplicantStringOutput').text(CBD.ApplicantString, 'ether');
  $('#CBDBalanceOutput').text(CBD.balance + ' ETH');
  $('#CBDFundsDepositedOutput').text(CBD.amountDeposited + ' ETH');
  $('#CBDFundsReleasedOutput').text(CBD.amountReleased + ' ETH');

  $('#CBDDefaultActionOutput').text(CBD.defaultAction);
  $('#CBDDefaultTimeoutLength').text(secondsToDhms(CBD.autoreleaseInterval));
  $('#CBDDefaultActionTriggerTime').text(new Date(CBD.autoreleaseTime * 1000).toLocaleString());

  switch(CBD.state)
  {
    case 0:
    $('#CBDTable').css("background-color", "#fffff");
    break;
    case 1:
    $('#CBDTable').css("background-color", "#2196F3");
    break;
    case 2:
    $('#CBDTable').css("background-color", "grey");
    break;
  }
}


function updateExtraInput(CBD) {
  var userIslicensedArchitect = (CBD.licensedArchitect == web3.eth.defaultAccount);
  var isNulllicensedArchitect = (CBD.licensedArchitect == '0x0000000000000000000000000000000000000000');
  var userIsApplicant = (CBD.applicant == web3.eth.defaultAccount);
  var isNullApplicant = (CBD.applicant == '0x0000000000000000000000000000000000000000');

  document.getElementById('licensedArchitectFundsInputGroup').hidden = !userIslicensedArchitect;
  document.getElementById('updatelicensedArchitectStringInputGroup').hidden = !userIslicensedArchitect;
  document.getElementById('updateApplicantStringInputGroup').hidden = !userIsApplicant;
  document.getElementById('commitInputGroup').hidden = !isNullApplicant;
	document.getElementById('recoverFundsInputGroup').hidden = !(userIslicensedArchitect && isNullApplicant);
  web3.eth.getBlock("latest",
    function(err,res){
      if (err) {
          console.log("Error calling CBD method: " + err.message);
      }
      else{
        currentTime = res.timestamp;
      }
      if(!CBD.defaultAction){
      document.getElementById('CBDDefaultActionTriggerTime').hidden = true;
      document.getElementById('CBDDefaultTimeoutLengthGroup').hidden = true;
      document.getElementById('defaultActionInputGroup').hidden = true;
      document.getElementById('delayDefaultActionForm').hidden = true;
      }
      if(!(userIsApplicant || userIslicensedArchitect)){
        document.getElementById('defaultActionInputGroup').hidden = true;
        document.getElementById('delayDefaultActionForm').hidden = true;
      }
      else if(CBD.autoreleaseTime > 0 && CBD.autoreleaseTime < currentTime && CBD.state === 1 && (userIsApplicant || userIslicensedArchitect)){
        document.getElementById('CBDDefaultActionTriggerTime').hidden = false;
        document.getElementById('CBDDefaultTimeoutLengthGroup').hidden = false;
        document.getElementById('defaultActionInputGroup').hidden = false;
        document.getElementById('delayDefaultActionForm').hidden = false;
      }
      else if((CBD.autoreleaseTime > currentTime && CBD.state == 1 && (userIsApplicant || userIslicensedArchitect))){
        document.getElementById('CBDDefaultActionTriggerTime').hidden = false;
        document.getElementById('CBDDefaultTimeoutLengthGroup').hidden = false;
        document.getElementById('defaultActionInputGroup').hidden = true;
        document.getElementById('delayDefaultActionForm').hidden = true;
        differenceTime = Number(CBD.autoreleaseTime) - res.timestamp;
        if(0 < differenceTime && differenceTime <= 86400){
          $('#CBDDefaultActionTriggerTime').text("Remaining Time: " + secondsToDhms(differenceTime));
        }
        else{
          $('#CBDDefaultActionTriggerTime').text(new Date(CBD.autoreleaseTime * 1000).toLocaleString());
          $('#CBDDefaultActionTriggerTime').css("color", "red");
        }
      }
      else if(CBD.autoreleaseTime < currentTime && CBD.state == 1){
        document.getElementById('CBDDefaultActionTriggerTime').hidden = false;
        document.getElementById('CBDDefaultTimeoutLengthGroup').hidden = false;
      }
      else if(CBD.state == 1){
        document.getElementById('CBDDefaultActionTriggerTime').hidden = false;
        document.getElementById('CBDDefaultTimeoutLengthGroup').hidden = false;
      }
      else {
        document.getElementById('CBDDefaultActionTriggerTime').hidden = true;
        document.getElementById('CBDDefaultTimeoutLengthGroup').hidden = false;
      }
  });
}

function checkForUserAddresses() {
  web3.eth.getAccounts(function(err, accounts) {
    if (accounts != undefined && accounts.length > 0)
    if (validateAccount(accounts[0])) {
      clearInterval(checkUserAddressesInterval);
      onUserAddressesVisible(accounts[0]);
    }
    else {
        onUserAddressesNotVisible();
    }
  });
}

function onUserAddressesNotVisible() {
    document.getElementById('userAddress').innerHTML = "Can't find user addresses. If using metamask, are you sure it's unlocked and initialized?<br>";
}
function onUserAddressesVisible(account) {
    document.getElementById('userAddress').innerHTML = "Registered Account: " + account;
}

function ApplicantStringEditMode(flag) {
	if (flag) {
		$('#ApplicantStringUpdateStartButton').hide();
		$('#applicantMessageUpdateTextarea').show();
		$('#ApplicantStringUpdateCommitButton').show();
		$('#ApplicantStringUpdateCancelButton').show();
		$('#CBDApplicantStringOutput').hide();
	}
	else {
		$('#ApplicantStringUpdateStartButton').show();
		$('#applicantMessageUpdateTextarea').hide();
		$('#ApplicantStringUpdateCommitButton').hide();
		$('#ApplicantStringUpdateCancelButton').hide();
		$('#CBDApplicantStringOutput').show();
	}
}
function startApplicantStringUpdate() {
  ApplicantStringEditMode(true);
  
	$('#applicantMessageUpdateTextarea').val(CBD.ApplicantString);
}
function cancelApplicantStringUpdate() {
	ApplicantStringEditMode(false);
}
function commitapplicantMessageUpdate() {
	callLogapplicantMessage($('#applicantMessageUpdateTextarea').val());
	ApplicantStringEditMode(false);
}

function licensedArchitectStringEditMode(flag) {
	if (flag) {
		$('#licensedArchitectStringUpdateStartButton').hide();
		$('#licensedArchitectMessageUpdateTextarea').show();
		$('#licensedArchitectStringUpdateCommitButton').show();
		$('#licensedArchitectStringUpdateCancelButton').show();
		$('#CBDlicensedArchitectStringOutput').hide();
	}
	else {
		$('#licensedArchitectStringUpdateStartButton').show();
		$('#licensedArchitectMessageUpdateTextarea').hide();
		$('#licensedArchitectStringUpdateCommitButton').hide();
		$('#licensedArchitectStringUpdateCancelButton').hide();
		$('#CBDlicensedArchitectStringOutput').show();
	}
}
function startlicensedArchitectStringUpdate() {
	licensedArchitectStringEditMode(true);

	$('#licensedArchitectMessageUpdateTextarea').val(CBD.licensedArchitectString);
}
function cancellicensedArchitectStringUpdate() {
	licensedArchitectStringEditMode(false);
}
function commitlicensedArchitectMessageUpdate() {
	callLoglicensedArchitectMessage($('#licensedArchitectMessageUpdateTextarea').val());
	licensedArchitectStringEditMode(false);
}


//smart contract caller and handler functions
function handleCommitResult(res) {
  $('#CBDApplicantOutput').text(web3.eth.defaultAccount)
}

function callCommit() {
  //CBDContract.methods.commit().send({'value':commitAmountInWei, "from":web3.eth.defaultAccount})

  PalladioCadToken.methods.commit(CBDContract.options.address).send({"from":web3.eth.defaultAccount})
  .then(handleCommitResult);
}
function handleRecoverFundsResult(err, res) {
	if (err) console.log(err.message);
}
function callRecoverFunds() {
  CBDContract.methods.recoverFunds().call()
  .then(handleRecoverFundsResult);
}
function handleReleaseResult(err, res) {
    if (err) console.log(err.message);
}
function callRelease(amountInEth) {
    CBDContract.methods.release(web3.utils.toWei(amountInEth,'ether')).send()
    .then(handleReleaseResult);
}
function releaseFromForm() {
    var form = document.getElementById('licensedArchitectFundsInputGroup');
    var amount = Number(form.elements['amount'].value);

    callRelease(amount);
}

function callAddFunds(includedEth) {
  CBDContract.methods.addFunds().send({'value':web3.toWei(includedEth,'ether')})
  .then(handleAddFundsResult)
}
function addFundsFromForm() {
	var form = document.getElementById('licensedArchitectFundsInputGroup');
	var amount = Number(form.elements.amount.value);
	callAddFunds(amount);
}
function callDefaultAction(){
  CBDContract.methods.callDefaultAction(logCallResult);
}
function delayDefaultAction(){
  var delayDefaultActionInHours = Number($('input[type=text]', '#delayDefaultActionForm').val());
  CBDContract.methods.delayAutorelease().call()
  .then(logCallResult);
}
function handleUpdateapplicantMessageResult(err, res) {
    if (err) console.log(err.message);
}

function callLogapplicantMessage(message) {
    CBDContract.methods.logapplicantStatement(message).send({"from":web3.eth.defaultAccount})
    .then(handleUpdateapplicantMessageResult);
}
function handleUpdatelicensedArchitectMessageResult(err, res) {
    if (err) console.log(err.message);
}

function callLoglicensedArchitectMessage(message) {
  CBDContract.methods.loglicensedArchitectStatement(message).send({"from":web3.eth.defaultAccount})
  .then(handleUpdateLicensedMessageResult);
}

function callUpdatelicensedArchitectMessage(message) {
    CBDContract.methods.setlicensedArchitectString(message, handleUpdatelicensedArchitectMessageResult);
}
function callCancel() {
    CBDContract.methods.recoverFunds().call()
    .then(logCallResult);
}

//////////////////////////////////Events Part of the interact page////////////////////////////////////////////////

function registerForNewEvents()
{
  // NOTE: Metamask doesn't support live events yet, see https://github.com/MetaMask/metamask-extension/issues/2601

  // web3.eth.getBlockNumber(function(err, blockNumber) {
  //   CBDContract.events.LicensedArchitectStatement({fromBlock:blockNumber}, function(err, event) {
  //     insertChat("Architect", event.returnValues[0], event.blockNumber);
  //   })

  //   CBDContract.events.applicantStatement({fromBlock:blockNumber}, function(err, event) {
  //     insertChat("applicant", event.returnValues[0], event.blockNumber);
  //   })
  // })
}

function insertAllInChat(eventArray){
  eventArray.forEach(function(eventObject){
    who = "Contract"
    text = eventObject.event;
    if (eventObject.event == "LicensedArchitectStatement") {
      who = "Architect"
      text = eventObject.returnValues[0]
    }
    else if (eventObject.event == "applicantStatement") {
      who = "applicant"
      text = eventObject.returnValues[0]
    }

    insertChat(who, text, eventObject.blockNumber);
  });
}

function getEventsAndParticipants(moduleParam, actionParam, additionalKeyValue){
  CBDContract.getPastEvents("allEvents", {fromBlock: 0, toBlock:"latest"})
  .then(function(events) {
    insertAllInChat(events);
  })
}

function insertChat(who, text, blockNumber){
  var control = "";
  if (who === "Architect"){
    control =
    '<li class="list-group-item list-group-item-success" style="width:100%">' +
      '<div class="row">' +
        '<div class="col-md-4">' +
          '<span>' + who + ': </span>' +
          '<span>' + text + '</span>' +
          '<p id="dt_' + blockNumber + '"><small>&nbsp;</small></p>' +
        '</div>' +
        '<div class="col-md-4"></div>' +
        '<div class="col-md-4"></div>' +
      '</div>' +
    '</li>';
  }
  else if(who === "applicant"){
    control =
      '<li class="list-group-item list-group-item-info" style="width:100%;">' +
        '<div class="row">' +
          '<div class="col-md-4"></div>' +
          '<div class="col-md-4"></div>' +
          '<div class="col-md-4">' +
            '<span>' + who + ': </span>' +
            '<span>' + text + '</span>' +
            '<p id="dt_' + blockNumber + '"><small>&nbsp;</small></p>' +
          '</div>' +
        '</div>' +
      '</li>';
  }
  else {
    control =
    '<li class="list-group-item list-group-item-info" style="width:100%;">' +
      '<div class="row">' +
        '<div class="col-md-4"></div>' +
        '<div class="col-md-4"></div>' +
        '<div class="col-md-4">' +
          '<span>' + text + '</span>' +
          '<p id="dt_' + blockNumber + '"><small>&nbsp;</small></p>' +
        '</div>' +
      '</div>' +
    '</li>';
  }
  $("ul").append(control);

  web3.eth.getBlock(blockNumber)
  .then(function(res) { 
    dt = new Date(res.timestamp * 1000).toLocaleString()
    $("#dt_" + blockNumber).text(dt)
  })
}