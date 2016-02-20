'use strict'

var sha1 = require('sha1')
  , md5 = require('md5')
  , exec = require('child_process').exec;

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

	var date = new Date();
	var nonce = md5(Math.random());
	var nonce_ts = date.toISOString();
	nonce_ts = nonce_ts.replace(/(\.\d\d\dZ)/ ,'Z');

	var digest = (new Buffer(sha1(nonce + nonce_ts + this.sharedSecret)).toString('base64'));
	
	var cmd = 'curl -H \'X-WSSE: UsernameToken Username="'+this.userName+'", PasswordDigest="'+digest+'", Nonce="'+nonce+'", Created="'+nonce_ts+'"\' --data \''+JSON.stringify(data)+'\' https://api.omniture.com/admin/1.4/rest/?method='+endpoint;

	exec(cmd, function(error, stdout, stderr) {

		if (!error) {
		
			var response = JSON.parse(stdout);

			if ( response.error ) {
		
				callback(false,response);
		
			} else {
		
				callback(true,response);
		
			}
		
		} else {

			callback(false,{ error: 'curl_command', error_description: 'Error executing CURL command.'});
		
		}
	});	
}

module.exports = OmnitureAPI