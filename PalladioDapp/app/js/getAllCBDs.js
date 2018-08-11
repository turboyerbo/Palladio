// TODO: Some sort of serious logging
function onError(err) {
  alert("Quick, Call batman! We have a: " + err);
  $('#onCreateCBDBtn')[0].disabled = false
}

function toEther(item) {
  return web3.utils.fromWei(Number(item), "ether")
}
function onGetFullState(state, address) {
  cbdObject = parseCBDState(state, address)
  buildCBDRow(cbdObject, CBDs.length);
  CBDs.push(cbdObject);  
}

function buildCBDRow(cbdObject, index){
  if(index !== 0) $("tbody").append($(".mainTableRow").first().clone());
  switch(cbdObject.state){
    case 0:
      $(`.state:eq(${index})`).parent().css("background-color", "white");
      break;
    case 1:
      $(`.state:eq(${index})`).parent().css("background-color", "white");
      break;
    case 2:
      $(`.state:eq(${index})`).parent().css("background-color", "grey");
      break;
  }
  $(`.state:eq(${index})`).text(CBD_STATES[cbdObject.state]);
  $(`.contractAddress:eq(${index})`).text("View Consultation");
  $(`.contractAddress:eq(${index})`).attr("href", `interact.html?contractAddress=${cbdObject.address}`);
 //  $(`.licensedArchitectAddress:eq(${index})`).html(`\n <a href='${window.etherscanURL}${cbdObject.licensedArchitect}'>${cbdObject.licensedArchitect}</a>`);
  // $(`.licensedArchitectAddress:eq(${index})`).text(cbdObject.licensedArchitect);
  if(cbdObject.associateArchitect !== "0x0000000000000000000000000000000000000000"){
    // $(`.associateArchitect:eq(${index})`).text("associateArchitect: \n" + );
  $(`.associateArchitect:eq(${index})`).html(`Associate: \n <a href='${window.etherscanURL}${cbdObject.associateArchitect}'>${cbdObject.associateArchitect}</a>`);
  }else{
  $(`.associateArchitect:eq(${index})`).html(`<a href='interact.html?contractAddress=${cbdObject.address}'> Contract Details </a>`);
  }
  $(`.balance:eq(${index})`).text(cbdObject.balance);
  $(`.commitThreshold:eq(${index})`).text(cbdObject.commitThreshold);
  $(`.fundsDeposited:eq(${index})`).text(cbdObject.amountDeposited);
  $(`.fundsReleased:eq(${index})`).text(cbdObject.amountReleased);
  $(`.defaultAction:eq(${index})`).text(cbdObject.defaultAction);
  $(`.autoreleaseInterval:eq(${index})`).text(cbdObject.autoreleaseInterval/60/60 + " hours");
  if(cbdObject.autoreleaseTime != 0){
    if(cbdObject.autoreleaseTimePassed){
      $(`.autoreleaseTime:eq(${index})`).text(new Date(cbdObject.autoreleaseTime * 1000).toLocaleString());
      $(`.autoreleaseTime:eq(${index})`).css("color","red");
    }
    else{
      getCurrentTime(function(currentTime) {
        $(`.autoreleaseTime:eq(${index})`).text(secondsToDhms(Number(cbdObject.autoreleaseTime - currentTime)));
      })
      $(`.autoreleaseTime:eq(${index})`).css("color","green");
    }
  }
  else{
    $(`.autoreleaseTime:eq(${index})`).text("- Upcoming -");
  }
  $(`.recordBook:eq(${index})`).text(cbdObject.recordBook);
  $(`.initialStatement:eq(${index})`).text(cbdObject.initialStatement);
}

function loadContract(contractIdx, nContracts)
{
  CBDContractFactory.methods.getCBDContract(contractIdx).call()
  .then(function(address) {
    CBDContract.options.address = address
    CBDContract.methods.getFullState().call()
    .then(function(state) {
      onGetFullState(state, address);
      nextContractIdx = contractIdx + 1;
      if (nextContractIdx < nContracts)
        loadContract(nextContractIdx, nContracts)
    }, onError)
  }, onError);
}

__loadManagerInstance.execWhenReady(function() {

  //get all newCBD events
  window.CBDs = [];

  // TODO: Figure out events
  //window.event = CBDFactory.contractInstance.NewCBD({}, {"fromBlock": CBDFactoryCreationBlock});//NewCBD is an event, not a method; it returns an event object.
  // window.recoverEvent = CBDFactory.contractInstance.FundsRecovered({}, {"fromBlock": 1558897});

  CBDContractFactory.methods.getCBDCount().call()
  .then(function(res){
    var nContracts = Number(res)
    for (var i = 0; i < nContracts; i++)
    {
      loadContract(i, nContracts)
    }
  }, onError)
});
