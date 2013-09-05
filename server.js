
var request = require('request');
var fs = require('fs');
var express = require('express');
var cluster = require('cluster');
var consolidate = require('consolidate');
var Handlebars = require('handlebars');

var numCPUs = 50;


var app = express();

// Configure Server Variables
app.engine('html', consolidate.handlebars);
app.set('view engine', 'html');
app.set('views', __dirname + '/public/templates');

// Configure Environmental Variables

app.use(express.compress());
app.use(express.bodyParser({
    keepExtensions: true,
    limit: 10000000, // 10M limit.
    defer: true
}));
app.use(express.cookieParser());
app.use(express.static(__dirname + '/public'));

var partials = __dirname + '\\templates\\partials\\';
fs.readdirSync(partials).forEach(function(file) {
    var source = fs.readFileSync(partials + file, 'utf8');
    var partial = /(.+)\.html/.exec(file).pop();
    Handlebars.registerPartial(partial, source);
});

// Initialize Server and Session Storage

//if (cluster.isMaster) {
//
//    for (var i = 0; i < numCPUs; i++) {
//        cluster.fork();
//    }
//
//
//}else{


    var app = express();
    var MongoStore = require('connect-mongo')(express);

    app.use(express.compress());
    app.use(express.bodyParser({
        keepExtensions: true,
        limit: 10000000, // 10M limit.
        defer: true
    }));

    app.use(express.cookieParser());
    app.use(express.static(__dirname + '/public'));
    //app.use(express.session({
    //    secret: 'zIxlVlz01WU6bmNyys5F',
    //    store: new MongoStore({
    //        db: 'client-portal'
    //    })
    //}));

    require('./api/v0');

//collection.remove();

    var imapProc = require('./imapArchiver');

//    setInterval(function(){
//        imapProc.getEmails(1);
//        imapProc.getEmails(2);
//    },12500);

    app.get('/archAccounts/add',function(req, res){
        res.send(200);
    });

    app.post('/archAccounts/add',function(req, res){
        res.send(200);
    });

    // Setup 404 Route
    app.get('*', function(req, res) {
        res.send(404, 'File not found.');
    });

    // Start Server

    app.listen(1223);
    console.log('Listening on Port 1221.');

//}