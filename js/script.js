// stag topUpContract: 0x05066b36e7a93322c34affa06c3822cac7321b8d
// stag tiimContract: 0x9e2b6a4b95a02afa43e59963c062b8daa07dc20a
// stag enpoint: https://staging.triip.me/api/dapp_browser/info

// https://github.com/ethereum/wiki/wiki/JavaScript-API#contract-methods
var config = {
  api: {
    getInfoByEmail: { url: 'https://www.triip.me/api/dapp_browser/info' }
  },
  gasLimit: 2100000,
  gasPrice: 300000000,
  tiimContract: {
    address: '0x4f7239c38d73a6cba675a3023cf84b304f6daef6',
    abi: erc20ABI
  },
  topUpContract: {
    address: '0x689d961b4025c92201a837b2c175e3f16bed38a6',
    abi: topUpTiimABI
  }
}

$( document ).ready(function() {
  var tiimContract = null;
  var emailEl = $('#email');
  var validateEmailSectionEl = $('#validateEmailSection');
  var validateEmailResultSectionEl = $('#validateEmailResultSection');
  var topUpSectionEl = $('#topUpSection');
  var topUpResultSectionEl = $('#topUpResultSection');
  var userWalletAddress = '';
  var yourTomoBalanceEl = $("#yourBalance");
  var yourTiimBalanceEl = $("#yourTIIMBalance");
  var userTiimBalanceEL = $("#userTIIMBalance");
  var rateEl = $('#rate');
  var minimumEl = $('#minimum');
  var topUpAmountEl = $('#topUpAmount');
  var tiimAmountEl = $('#tiimAmount');
  var topUpBtnEl = $('#topUpBtn');
  var successSectionEl = $('#successSection');
  var txUrlEl = $('#txUrl');

  $('#validateEmailBtn').on('click', function(){
    validateEmailResultSectionEl.html('');
    var email = emailEl.val();

    $.ajax({
      type: "POST",
      url: config.api.getInfoByEmail.url,
      data: { email: email },
      success: function(resp){
        validateEmailSectionEl.hide();
        topUpSectionEl.show();

        userWalletAddress = resp.data.wallet_address;

        web3.eth.getBalance(web3.eth.defaultAccount, function(error, b) {
          yourTomoBalanceEl.text(web3.toBigNumber(b).dividedBy(1e+18).toString());
        });

        tiimContract = web3.eth.contract(config.tiimContract.abi).at(config.tiimContract.address);
        tiimContract.balanceOf(userWalletAddress, function(error, b){
          userTiimBalanceEL.text(web3.toBigNumber(b).dividedBy(1e+18).toString());
        });

        tiimContract.balanceOf(web3.eth.defaultAccount, function(error, b){
          yourTiimBalanceEl.text(web3.toBigNumber(b).dividedBy(1e+18).toString());
        });

        var topupContract = web3.eth.contract(config.topUpContract.abi).at(config.topUpContract.address);
        topupContract.rate(function(error, b){
          var rate = web3.toBigNumber(b).toString();
          rateEl.text(rate);
          tiimAmountEl.attr('rate', rate);

          topupContract.minimum(function(error, b){
            var val = web3.toBigNumber(b).dividedBy(1e+18).toString();
            minimumEl.text(val);
            // topUpAmountEl.val(val);
            topUpAmountEl.trigger('change');
            topUpBtnEl.attr('disabled', false);
          });
        });

        topUpAmount.focus();
      },
      error: function(xhr, _){
        validateEmailResultSectionEl.html(xhr.responseJSON.message);
      },
      dataType: 'json'
    });
  });

  topUpAmountEl.on('change', function(){
    var rate = parseFloat(tiimAmountEl.attr('rate'));
    var val = parseFloat($(this).val());
    var tiimAmount  = rate * val;
    tiimAmountEl.text(isNaN(tiimAmount) ? 0 : tiimAmount);
  });

  topUpBtnEl.on('click', function(){
    topUpResultSectionEl.html('');
    topUpBtnEl.attr('disabled', 'disabled').text('Processing...');

    if(userWalletAddress == ''){
      return;
    }

    if(tiimContract == null) {
      return
    }

    var amount = web3.toBigNumber(1.5).mul(1e+18).toNumber();
    var topUpAmount = web3.toBigNumber(parseFloat(topUpAmountEl.val())).mul(1e+18).toNumber();

    var topupContract = web3.eth.contract(config.topUpContract.abi).at(config.topUpContract.address);

    web3.eth.sendTransaction({
      from: web3.eth.defaultAccount,
      to: config.topUpContract.address,
      gasLimit: config.gasLimit,
      gasPrice: config.gasPrice,
      value: topUpAmount,
      data: topupContract.purchase.getData(userWalletAddress)
    }, function (error, hash) {
      if (error) {
        topUpBtnEl.attr('disabled', false).text('Submit');
        topUpResultSectionEl.html(error.message ? error.message : error);
        return;
      }

      var intv = setInterval(function(){
        web3.eth.getTransactionReceipt(hash, function(error, ret) {
          if (ret && !error) {
            clearInterval(intv);
            // console.log(hash, ret);

            topUpSectionEl.hide();
            successSectionEl.show();
            txUrlEl.attr('href', 'https://scan.tomochain.com/txs/' + hash);
            // confirm send
          }
        });
      }, 3000);
    });
  });
});

