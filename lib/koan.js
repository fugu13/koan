var util = require('util');
var https = require('https');
var querystring = require('querystring');


var transfer = function(recipient, donor){
    var keys = Object.keys(donor);
    for (var ii = 0, len = keys.length; ii < len; ++ii) {
        var key = keys[ii];
        recipient[key] = donor[key];
    }
    return recipient;
};


var parentGetter = function(attributeName, hiddenAttributeName) {
    return function() {
        if(!hiddenAttributeName) {
            hiddenAttributeName = "_" + attributeName;
        }
        var parentAttribute = this.parent ? this.parent[attributeName] : null;
        return this[hiddenAttributeName] || parentAttribute;
    }
};
var setter = function(hiddenAttributeName) {
    return function(value) {
        this[hiddenAttributeName] = value;
    }
};


var ZenLocation = function(parent, location) {
    this.parent = parent;
    this.location = location;
}


var parentProperties = function() {
    var properties = {};
    for(var ii = 0, len = arguments.length; ii < len; ++ii) {
        var name = arguments[ii];
        properties[name] = {
            get: parentGetter(name),
            set: setter("_" + name)
        };
    }
    return properties;
};

var properties = parentProperties('apiKey', 'test', 'host', 'port', 'headers');
properties.location = {
    get: function() {
        if(this.parent) {
            return this.parent.location + this._location;
        } else {
            return this._location;
        }
    },
    set: setter("_location")
};
properties.baseOptions = {
    get: function() {
        return {
            host: this.host,
            port: this.port,
            path: this.location
        };
    }
};
Object.defineProperties(ZenLocation.prototype, properties);

ZenLocation.prototype.enrich = function(data) {
    return data;
};

ZenLocation.prototype.request = function(options, callback) {
    //TODO: actually check what the encoding of the response is, by checking
    //the bytes, per http://www.ietf.org/rfc/rfc4627
    
    //TODO: take whatever headers are specified, if any, and add in the base
    //headers
    var received = '';
    var requester = this;
    return https.request(options, function(response) {
        response.setEncoding('utf8');
        response.on('data', function(chunk) {
            received += chunk;
        });
        response.on('end', function() {
            var json = JSON.parse(received);
            if(json.errors) {
                callback(new Error(json.errors.join(' ')));
            } else {
                callback(null, requester.enrich(json));
            }
        });
        //TODO: figure out how to work with these. Either use events myself
        //or wipe out the callback when appropriate
        response.on('close', function(err) {
            callback(err);
        });
    });
}

ZenLocation.prototype.post = function(path, data, callback) {
    if(!callback) {
        callback = data;
        data = {};
    }
    var content = JSON.stringify(data);
    var headers = {
        'Content-Length': content.length
    }; //TODO: consider making a chained headers property instead.
    headers = transfer(headers, this.headers);
    var options = this.baseOptions;
    options.method = 'POST';
    options.headers = headers;
    options.path += path;
    var request = this.request(options, callback);
    request.write(content);
    request.end();
};


ZenLocation.prototype.get = function(path, data, callback) {
    if(!callback) {
        callback = data;
        data = {};
    }
    var query = querystring.stringify(data);
    var options = this.baseOptions;
    options.path += path + '?' + query;
    options.method = 'GET';
    options.headers = this.headers;
    var request = this.request(options, callback);
    request.end();
};

var Job = function(parent, location) {
    Job.super_.call(this, parent, location);
}

util.inherits(Job, ZenLocation);

Job.prototype.create = function(url_or_options, callback) {
    var options;
    if(typeof url_or_options == 'string') {
        options = {
            'input': url_or_options
        }
    } else {
        options = url_or_options;
    }
    options = transfer(options, {
        'api_key': this.apiKey,
        'test': this.test ? true : false,
    });
    this.post('', options, callback);
};

Job.prototype.enrich = function(data) {
    for(var index = 0, len = data.outputs.length; index < len; ++index) {
        var rawOutput = data.outputs[index];
        data.outputs[index] = transfer(
            new Output(this, rawOutput.id),
            rawOutput
        );
    }
    return data;
};

var Output = function(parent, location) {
    Output.super_.call(this, parent, location);
}

util.inherits(Output, ZenLocation);

Output.prototype.progress = function(callback) {
    this.get('/progress', {
        'api_key': this.apiKey
    }, callback);
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
    this.host = 'app.zencoder.com';
    this.port = 443;
    this.headers = { //JSON only
        'Content-Type': 'application/json',
        'Accepts': 'application/json'
    }
    
    this.location = '/api/v2/'; //for now v2 only
    
    
    
    this.job = new Job(this, "jobs/");
};

util.inherits(Client, ZenLocation);

Client.prototype.output = function(id) {
    return new Output(this.job, id);
};
