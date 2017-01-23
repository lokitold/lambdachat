'use strict';
console.log('Loading event');
var aws = require('aws-sdk');
aws.config.update({region:'us-west-2'});
var ddb = new aws.DynamoDB(
    {endpoint: 'https://dynamodb.us-west-2.amazonaws.com/',
     params: {TableName: 'lambdachat'}});

module.exports.hello = (event, context, callback) => {
  var message_id = event.Records[0].Sns.MessageId;
  var timestamp = event.Records[0].Sns.Timestamp;
  var payload = JSON.parse(event.Records[0].Sns.Message);
  var channel = 'default';
  if ("channel" in payload) {
      channel = payload.channel;
  }
  var name = payload.name;
  var message = payload.message;
  var LambdaReceiveTime = new Date().toString();
  var itemParams = {Item: {message_id: {S: message_id},
                           timestamp: {S: timestamp},
                           channel: {S: channel},
                           name: {S: name},
                           message: {S: message}}};
  ddb.putItem(itemParams, function(err, data) {
    console.log(data);
    console.log(err);
      context.done(err,'');
  });

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // callback(null, { message: 'Go Serverless v1.0! Your function executed successfully!', event });
};
