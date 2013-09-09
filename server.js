
var request = require('request');
var fs = require('fs');
var express = require('express');
var cluster = require('cluster');
var consolidate = require('consolidate');
var Handlebars = require('handlebars');
var mongo = require('mongoskin');
var db = mongo.db('localhost:27017/emailArch?auto_reconnect');

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

var partials = __dirname + '/templates/partials/';
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

   require('./api/v0').init(app);

//collection.remove();

    var imapProc = require('./imapArchiver');

//    setInterval(function(){
//        imapProc.getEmails(1);
//        imapProc.getEmails(2);
//    },12500);

app.get('/',function(req, res){

    getContextData(req,
        {}
        ,function(req){
            getTemplate('dashboard',req.contextData,function(templateHTML){
                res.send(templateHTML);
            });
        });

});


    app.get('/archAccounts',function(req, res){

        getContextData(req,
            {archAccounts:'http://localhost:1223/api/v0/archAccounts'}
            ,function(req){
                getTemplate('archiveAccounts',req.contextData,function(templateHTML){
                    res.send(templateHTML);
                });
        });

    });

    app.post('/archAccounts/add',function(req, res){

        var collection = db.collection('archiveAccounts');

        collection.insert({
            host:req.body.host,
            userName:req.body.userName,
            password:req.body.pwd,
            port:req.body.port,
            maxUID:0
        },function(err,docs){
            res.redirect('/archAccounts/');
        });
    });

    app.get('/archAccounts/remove/:id',function(req, res){

        var collection = db.collection('archiveAccounts');
        console.log("REMOVE ID:",req.params.id);
        collection.removeById(req.params.id
        ,function(err,count){
            res.redirect('/archAccounts/');
        });
    });

    // Setup 404 Route
    app.get('*', function(req, res) {
        res.send(404, 'File not found.');
    });

    var templateStore = {};

    var getTemplate = function(templateName,contextData,cb){

        if(templateStore[templateName]){
            cb(templateStore[templateName](contextData));
        }else{
            fs.readFile(__dirname  + '/templates/' + templateName + '.html',  'utf8',function(err, data) {
                if (err) {
                    throw err;
                }
                templateStore[templateName] = Handlebars.compile(data);
                cb(templateStore[templateName](contextData));
            });
        }

    }


var getContextData = function(req,apiList,cb){
    var cnt = 0;
    req.conextFetchCount = 0;

    //console.log('http://localhost:1221/api/v1/firms/' + req.session.domain + "?key=b4t123");
    //console.log('http://localhost:1221/api/v1/users/' + req.session.user + "?key=b4t123");

//    // Determine subdomain.
//    var hosts = req.host.split('.');
//    if (hosts.length === 3) {
//        req.firm = hosts[0];
//    }

//    var contextList = {
//        strings: 'http://localhost:1221/api/v0/i18n?lang=en',
//        company: 'http://localhost:1221/api/v0/company',
//        firm: 'http://localhost:1221/api/v1/firms/' + req.session.domain + "?key=b4t123",
//        user: 'http://localhost:1221/api/v1/users/' + req.session.user + "?key=b4t123"
//    }

    for(var i in apiList){
        cnt++;
        fetchCoreData(apiList[i],i,req,cb);
    }

    if(cnt === 0){
        req.contextData = req.contextData || {};
        cb(req);
    }

};

var fetchCoreData = function(url,name,req,cb){

    req.conextFetchCount++;

    request.get({uri:url}, function(err, r, body) {

        req.conextFetchCount--;
        req.contextData = req.contextData || {};
        if (!err) {
            req.contextData[name] = JSON.parse(body);
        }

        if(req.conextFetchCount === 0){
            cb(req);
        }

    });

};

// Start Server

app.listen(1223);
console.log('Listening on Port 1221.');

//}