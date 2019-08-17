// https://github.com/ethereum/wiki/wiki/JavaScript-API#contract-methods
var env = {
  prod: {
    getInfoByEmailApi: 'https://www.triip.me/api/dapp_browser/info',
    tiimContractAddress: '0x4f7239c38d73a6cba675a3023cf84b304f6daef6',
    topUpContractAddress: '0x689d961b4025c92201a837b2c175e3f16bed38a6'
  },
  stag: {
    getInfoByEmailApi: 'https://staging.triip.me/api/dapp_browser/info',
    tiimContractAddress: '0x9e2b6a4b95a02afa43e59963c062b8daa07dc20a',
    topUpContractAddress: '0x05066b36e7a93322c34affa06c3822cac7321b8d'
  },
};

var config = {
  api: {
    getInfoByEmail: { url: env.prod.getInfoByEmailApi }
  },
  gasLimit: 2100000,
  gasPrice: 300000000,
  tiimContract: {
    address: env.prod.tiimContractAddress,
    abi: erc20ABI
  },
  topUpContract: {
    address: env.prod.topUpContractAddress,
    abi: topUpTiimABI
  }
};

$( document ).ready(function() {
  var envVal = location.href.getValueByKey('env');
  if (location.href.getValueByKey('env') == 'stag') {
    config.api.getInfoByEmail.url = env[envVal].getInfoByEmailApi;
    config.tiimContract.address = env[envVal].tiimContractAddress;
    config.topUpContract.address = env[envVal].topUpContractAddress;
  }
  console.log(config);

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
  var minimumVal = 10;
  var totalAmount = 0;

  emailEl.val(localStorage.getItem("userEmail"));
  emailEl.focus();

  $('#clearEmailBtn').on('click', function(){
    emailEl.val('').focus();
  });

  $('.topUpAmountBtn').on('click', function(){
    var val = $(this).val();
    var amount = val == "" ? minimumVal : parseInt((totalAmount * (parseFloat(val) / 100.0)) + 0.5);
    if(amount < minimumVal) {
      amount = minimumVal;
    }
    $(topUpAmountEl).val(amount);
    $(topUpAmountEl).trigger('change');
  });

  $('#validateEmailBtn').on('click', function(){
    var $this = $(this);
    validateEmailResultSectionEl.html('');
    $this.attr('disabled', 'disabled').text('Processing...');

    var email = emailEl.val();

    $.ajax({
      type: "POST",
      url: config.api.getInfoByEmail.url,
      data: { email: email },
      success: function(resp){
        validateEmailSectionEl.hide();
        topUpSectionEl.show();

        userWalletAddress = resp.data.wallet_address;
        localStorage.setItem("userEmail", email);

        web3.eth.getBalance(web3.eth.defaultAccount, function(error, b) {
          totalAmount = web3.toBigNumber(b).dividedBy(1e+18).toNumber()
          yourTomoBalanceEl.text(totalAmount.format(2, 3, ',', '.'));
        });

        tiimContract = web3.eth.contract(config.tiimContract.abi).at(config.tiimContract.address);
        tiimContract.balanceOf(userWalletAddress, function(error, b){
          userTiimBalanceEL.text(web3.toBigNumber(b).dividedBy(1e+18).toNumber().format(2, 3, ',', '.'));
        });

        tiimContract.balanceOf(web3.eth.defaultAccount, function(error, b){
          yourTiimBalanceEl.text(web3.toBigNumber(b).dividedBy(1e+18).toNumber().format(2, 3, ',', '.'));
        });

        var topupContract = web3.eth.contract(config.topUpContract.abi).at(config.topUpContract.address);
        topupContract.rate(function(error, b){
          var rate = web3.toBigNumber(b).toNumber();
          rateEl.text(rate.format(2, 3, ',', '.'));
          tiimAmountEl.attr('rate', rate);

          topupContract.minimum(function(error, b){
            minimumVal = web3.toBigNumber(b).dividedBy(1e+18).toNumber();
            minimumEl.text(minimumVal.format(2, 3, ',', '.'));
            // topUpAmountEl.val(minimumVal);
            // topUpAmountEl.trigger('change');
            topUpBtnEl.attr('disabled', false);
          });
        });
        $this.attr('disabled', false).text('Submit');
      },
      error: function(xhr, _){
        $this.attr('disabled', false).text('Submit');
        validateEmailResultSectionEl.html(xhr.responseJSON.message);
      },
      dataType: 'json'
    });
  });

  topUpAmountEl.on('change', function(){
    var rate = parseFloat(tiimAmountEl.attr('rate'));
    var val = parseFloat($(this).val());
    var tiimAmount  = rate * val;
    tiimAmountEl.text(isNaN(tiimAmount) ? 0 : tiimAmount.format(2, 3, ',', '.'));
  });

  function topUpError(error){
    topUpBtnEl.attr('disabled', false).text('Submit');
    topUpResultSectionEl.html(error.message ? error.message : error);
  }

  topUpBtnEl.on('click', function(){
    topUpResultSectionEl.html('');
    topUpBtnEl.attr('disabled', 'disabled').text('Processing...');

    if(userWalletAddress == ''){
      topUpError('Invalid user wallet address');
      return;
    }

    if(tiimContract == null) {
      topUpError('Something went wrong');
      return
    }

    var topUpVal = parseFloat(topUpAmountEl.val());
    if(isNaN(topUpVal) || topUpVal < minimumVal) {
      topUpError('You dont have enough TOMO');
      return
    }

    var topupContract = web3.eth.contract(config.topUpContract.abi).at(config.topUpContract.address);
    var topUpAmount = web3.toBigNumber(topUpVal).mul(1e+18).toNumber();

    web3.eth.sendTransaction({
      from: web3.eth.defaultAccount,
      to: config.topUpContract.address,
      gasLimit: config.gasLimit,
      gasPrice: config.gasPrice,
      value: topUpAmount,
      data: topupContract.purchase.getData(userWalletAddress)
    }, function (error, hash) {
      if (error) {
        topUpError(error);
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

Number.prototype.format = function(n, x, s, c) {
  var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\D' : '$') + ')',
      num = this.toFixed(Math.max(0, ~~n));

  return (c ? num.replace('.', c) : num).replace(new RegExp(re, 'g'), '$&' + (s || ','));
};

String.prototype.getValueByKey = function (k) {
    var p = new RegExp('\\b' + k + '\\b', 'gi');
    return this.search(p) != -1 ? decodeURIComponent(this.substr(this.search(p) + k.length + 1).substr(0, this.substr(this.search(p) + k.length + 1).search(/(&|;|$)/))) : "";
};
