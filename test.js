var vows = require('vows');
var assert = require('assert');
var Koan = require('./lib/koan');

if(!process.env.ZENCODER_API_KEY) {
    console.log("To run tests, set the ZENCODER_API_KEY environment variable.");
    process.exit(1);
}

//TODO: test two Koan objects do not interfere with each other

vows.describe("Koan").addBatch({
    'A client': {
        topic: Koan(process.env.ZENCODER_API_KEY),
        'creating a job with just a URL': {
            topic: function(zen) {
                //TODO: figure out why nesting topics isn't working
                console.log(zen);
                zen.job.create(
                    'https://s3.amazonaws.com/sbox-random/testmovie.mov',
                    this.callback
                );
            },
            'then asking for job details': {
                topic: function(error, response) {
                    response.outputs[0].progress(this.callback);
                },
                
                'should return a status with an id': function(error, status) {
                    assert.isNull(error);
                    assert.isString(status.id);
                }
            },
            'then asking for details by id': {
                topic: function(error, response) {
                    zen.output(response.outputs[0].id).progress(this.callback);
                },
                
                'should return a status with an id': function(error, status) {
                    assert.isNull(error);
                    assert.isString(status.id);
                }
            }
        }
    }
}).export(module);
