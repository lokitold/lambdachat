'use strict';
console.log('Loading function');
var async = require('async');
var aws = require('aws-sdk');
aws.config.update({region:'us-west-2'});
var ddb = new aws.DynamoDB(
    {endpoint: "https://dynamodb.us-west-2.amazonaws.com/",
     params: {TableName: "lambdachat"}});
var s3 = new aws.S3();
// change bucket name to match your bucket name
var bucket = "lambda-chat2";
var keyname = "data.json";


function escapeHtml(text) {
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

module.exports.hello = (event, context, callback) => {
  console.log('Handle DynamoDB Streams event');
    //console.log(JSON.stringify(event, null, 2));
    var new_object = event.Records[0].dynamodb;
    var channel = "default";
    if ('channel' in new_object.NewImage) {
        channel = new_object.NewImage.channel.S;
    }
    console.log("channel = " + channel);


    async.waterfall([
        function getrecords(next) {
            var params = {
                "IndexName": "channel-timestamp-index",
                "KeyConditions": {
                    "channel": {
                        "AttributeValueList": [{
                            "S": channel
                        }],
                        "ComparisonOperator": "EQ"
                    }

                },
                "Limit": 20,
                "ScanIndexForward": false
            }
            console.log("Scanning the table");
            ddb.query(params, next);
        },
        function buildjson(response, next) {
            console.log("Building JSON file");
            console.log(JSON.stringify(response));
            var messageData = {
                messages: []
            };
            console.log(response.Items.length);
            for (var i = response.Items.length - 1; i >= 0; i--) {
                var ii = response.Items[i];
                var message = {};
                message['id'] = ii.message_id['S'];
                message['name'] = escapeHtml(ii.name['S']);
                message['message'] = escapeHtml(ii.message['S']);
                message['channel'] = ii.channel['S'];
                messageData.messages.push(message);
            }
            next(null, JSON.stringify(messageData));
        },
        function savetos3(jsonstring, next) {
            console.log(bucket);
            s3.putObject({
                Bucket: bucket,
                Key: keyname,
                Body: jsonstring
                }, next);
        }
    ], function (err) {
        if (err) {
            console.log('got an error');
            console.log(err, err.stack);
        } else {
            console.log('Saved Data to S3');
        }
        context.done(err, '');
    });
};
