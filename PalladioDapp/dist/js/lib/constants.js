const CBD_STATES = {
  0: 'Open',
  1: 'Committed',
  2: 'Completed'
}

function secondsToDhms(d) {
	d = Number(d);
  var days = Math.floor(d / 86400);
	var h = Math.floor(d % 86400 / 3600);
	var m = Math.floor(d % 3600 / 60);
	var s = Math.floor(d % 3600 % 60);
  return ((days > 0 ? days + " days " : "") + (h > 0 ? h + " h " + (m < 10 ? "0" : "") : "") + m +" min" + " " + (s < 10 ? "0" : "") + s + " sec");
}

function getUrlParameter(sParam) {
    var sPageURL = decodeURIComponent(window.location.search.substring(1)),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : sParameterName[1];
        }
    }
};

function hexToAscii(str1){
//hexToAscii(resultParsed.status).replace(/(<([^>]+)>)/ig,"");
	var hex  = str1.toString();
	var str = '';
	for (var n = 0; n < hex.length; n += 2) {
		str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
	}
	return str;
}

function logCallResult(err, res) {
    if (err) {
        console.log("Error calling CBD method: " + err.message);
    }
    else {
        return res;
    }
}

// Validate account is palladio account
// TODO: This! (and use it!)
function validatePalladioAccount(account)
{
    return web3.utils.isAddress(account);
}

// Validate the input account is valid
// as an account. TODO: Check balance
function validateAccount(account)
{
    return web3.utils.isAddress(account);
}

// Get the currently selected account from
// input select DOM element
function getSelectedAccount(selectId)
{
    var select = $(selectId)[0]
    return select.options[select.selectedIndex].text
}

// Given the ID of a HTML select element,
// populate with accounts available on browser
function populateSelectWithAccounts(selectId)
{
    // Hook the Web3 post-load event.  This is maybe
    // not a great idea, as we shouldn't rely on internal
    // library implementations, but I can't find a solid
    // API-exposed method of executing once everything 
    // is guaranteed to be loaded.
    __loadManagerInstance.execWhenReady(function() {
        web3.eth.getAccounts(function(err, accounts) {
            var accountSelect = $(selectId)[0];
            for (var idx in accounts) {
                acc = accounts[idx]
                option = document.createElement( 'option' );
                option.text = acc;
                accountSelect.add( option );
            }
        });
    });
}

function toEther(item) {
    return web3.utils.fromWei(Number(item), "ether")
}

function getCurrentTime(fn) {
    web3.eth.getBlock("latest",
        function(err,res){
            if (err) {
                console.log("Error calling CBD method: " + err.message);
            }
            else{
                fn(res.timestamp);
            }
    })
}

function parseCBDState(state, address)
{
    //(licensedPlanner, recordBook, description, state, associateArchitect, this.balance, serviceDeposit, amountDeposited, amountReleased, autoreleaseInterval, autoreleaseTime);
    var cbdObject = {};
    cbdObject['address'] = address;
    cbdObject['licensedPlanner'] = state[0].toString();
    cbdObject['recordBook'] = state[1].toString();
    cbdObject['initialStatement'] = state[2].toString();
    cbdObject['state'] = Number(state[3]);
    cbdObject['associateArchitect'] = state[4].toString();
    cbdObject['balance'] = toEther(state[5]);
    cbdObject['amountDeposited'] = toEther(state[6]);
  
    cbdObject['amountReleased'] = toEther(state[7]);
    cbdObject['autoreleaseInterval'] = Number(state[8]);
    cbdObject['autoreleaseTime'] = Number(state[9]);
  
    var currentTime = (new Date).getTime() / 1000;
    cbdObject['autoreleaseTimePassed'] = (currentTime >= Number(state[10]));
    return cbdObject
}