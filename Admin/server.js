var http = require('http'),
    url = require('url'),
    fs = require('fs');
var config = {};

config.root = '/var/www/admin/data';
config.port = 1337;

http.createServer(function(req, res) {
    var filename = config.root + url.parse(req.url).pathname;

    fs.exists(filename, function(exists) {
        var fileStream;
        if (!exists) {
            console.log("not exists: " + filename);
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.write('404 Not Found\n');
            res.end();
            return;
        }
        res.setHeader('Access-Control-Allow-Origin','*');
        res.writeHead(200, 'application/json');

        fileStream = fs.createReadStream(filename);
        fileStream.pipe(res);

    });
}).listen(config.port);
