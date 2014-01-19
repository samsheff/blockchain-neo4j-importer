var http = require('https');

var n = 1;
var startingUrl = "https://blockchain.info/rawblock/" + n;

var neo4j = require('neo4j');
var db = new neo4j.GraphDatabase('http://localhost:7474');

var crawlBlockchain = function (url) {
    http.get(url, function(res) {
        var body = '';

        res.on('data', function(chunk) {
            body += chunk;
        });

        res.on('end', function() {
            var json = JSON.parse(body);
            createBlock(json);
        });	    
    });
};

crawlBlockchain(startingUrl);

function createBlock (json) {
    var node = db.createNode(JSON.flatten(json));
    node.save(function (err, node) {        
        if (n > 1) {
            if (err) {
                console.error('Error saving new node to database:', err);
            } else {
                console.log('Node saved to database with id:', node.id);
            }
           var oldBlockId = node.id - 1;               
           db.getNodeById(oldBlockId, function (err, oldBlock) {
                node.createRelationshipFrom(oldBlock, "Block", {}, function (err, relationship) {
                   console.log(relationship.toString());
                   n = n + 1;
                   startingUrl = "https://blockchain.info/rawblock/" + n;            
                   crawlBlockchain(startingUrl); 
	            });
            });
        } else {
            saveNode(node);
            n = n + 1;
            startingUrl = "https://blockchain.info/rawblock/" + n;            
            crawlBlockchain(startingUrl);
        };
    });
};

// Shortcut to the save function
var saveNode = function(node) {
    node.save(function (err, node) {    
        if (err) {
            console.error('Error saving new node to database:', err);
        } else {
            console.log('Node saved to database with id:', node.id);
        }
    })};

JSON.flatten = function(data) {
    var result = {};
    function recurse (cur, prop) {
        if (Object(cur) !== cur) {
            result[prop] = cur;
        } else if (Array.isArray(cur)) {
             for(var i=0, l=cur.length; i<l; i++)
                 recurse(cur[i], prop + "[" + i + "]");
            if (l == 0)
                result[prop] = [];
        } else {
            var isEmpty = true;
            for (var p in cur) {
                isEmpty = false;
                recurse(cur[p], prop ? prop+"."+p : p);
            }
            if (isEmpty && prop)
                result[prop] = '';
        }
    }
    recurse(data, "");
    return result;
};
