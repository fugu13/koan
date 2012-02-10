var util = require('util');


var transfer = function(recipient, donor){
  var keys = Object.keys(donor);
  for (var ii = 0, len = keys.length; ii < len; ++ii) {
    var key = keys[ii];
    recipient[key] = donor[key]
  }
  return recipient;
};

var ZenLocation = function(parent) {
    console.log("zen location");
    this.parent = parent;
}

var parentGetter = function(attributeName, hiddenAttributeName) {
    return function() {
        if(!hiddenAttributeName) {
            hiddenAttributeName = "_" + attributeName;
        }
        return this[hiddenAttributeName] || this.parent[attributeName];
    }
}
var setter = function(hiddenAttributeName) {
    return function(value) {
        this[hiddenAttributeName] = value;
    }
}

Object.defineProperties(ZenLocation.prototype, {
    'apiKey': {
        get: parentGetter("apiKey"),
        set: setter("_apiKey")
    },
    'test': {
        get: parentGetter("test"),
        set: setter("_test")
    }
});


var Job = function(parent) {
    console.log("beginning job");
    Job.super_.call(this, parent);
    console.log("constructed parent");
}

util.inherits(Job, ZenLocation);

Job.prototype.create = function(url_or_options, callback) {
    console.log("starting to create");
    var options;
    if(typeof url_or_options == 'string') {
        options = {
            'input': url_or_options
        }
    } else {
        options = url_or_options;
    }
    transfer(options, {
        'api_key': this.apiKey,
        'test': this.test ? true : false,
    });
    console.log(options);
    callback(true);
};


var Client = module.exports = function(apiKey, test) {
    if(apiKey) {
        this.apiKey = apiKey;
    } else if(process.env.ZENCODER_API_KEY) {
        this.apiKey = process.env.ZENCODER_API_KEY;
    } else {
        throw new Error('Zencoder API key required');
    }
    this.test = test;
    this.job = new Job(this);
    console.log("job key", this.job.apiKey);
    console.log("hooked up job");
};

util.inherits(Client, ZenLocation);
