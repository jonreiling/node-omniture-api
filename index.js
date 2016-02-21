'use strict'

var sha1 = require('sha1')
  , md5 = require('md5')
  , exec = require('child_process').exec
  , request = require('request')
  , util = require('util');

function OmnitureAPI( userName, sharedSecret ) {
	this.userName = userName;
	this.sharedSecret = sharedSecret;
}

OmnitureAPI.prototype.queueAndFetchReport = function(requestData,callback) {

	var scope = this;

	this.makeRequest('Report.Queue',requestData,function(success,reportIdData) {
		if ( success ) {

			//Requires at least a small delay before making the subsequent request.
			setTimeout(function() {

				scope.fetchReport(reportIdData.reportID,function(success,reportData) {
					callback(success,reportData);
				});

			},500);

		} else {
			callback(false,reportIdData);
		}
	});
}

OmnitureAPI.prototype.fetchReport = function(reportId,callback) {

	var scope = this;

	this.makeRequest('Report.Get',{"reportID":reportId},function(success,reportData) {

		if (success) {

			callback(true,reportData);

		} else {

			if ( reportData.error == 'report_not_ready' ) {

				setTimeout(function() {
					scope.fetchReport(reportId,callback);
				}, 2000);

			} else {
				callback(false,reportData);

			}
		}
	});

}

OmnitureAPI.prototype.makeRequest = function(endpoint,data,callback) {

	//Create info used for header authentication.
	var date = new Date();
	var nonce = md5(Math.random());
	var nonce_ts = date.toISOString().replace(/(\.\d\d\dZ)/ ,'Z');;
	var digest = (new Buffer(sha1(nonce + nonce_ts + this.sharedSecret)).toString('base64'));
	
	var requestOptions = {
		url: 'https://api.omniture.com/admin/1.4/rest/?method='+endpoint,
		method: 'POST',
		//Headers required a bit of a hack. Special thanks to https://github.com/imartingraham/nomniture/blob/master/lib/client.js
		headers: {
		        "X-WSSE": "UsernameToken Username=\""+this.userName+"\", "+
									"PasswordDigest=\""+digest+"\", "+
									"Nonce=\""+nonce+"\", "+
									"Created=\""+nonce_ts+"\""
		},
		form:data
	}

	request(requestOptions, function(error,response,body) {

  	  if (!error) {
  	  	callback((response.statusCode==200) ,JSON.parse(body));
  	  } else {
  	  	callback(false,error);
  	  }

	});
}

module.exports = OmnitureAPI