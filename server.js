
var request = require('request');
var fs = require('fs');
var express = require('express');
var cluster = require('cluster');
var Imap = require('imap');
var inspect = require('util').inspect;
var MailParser = require("mailparser").MailParser;
var numCPUs = 50;

var mongo = require('mongoskin');
var db = mongo.db('localhost:27017/emailArch?auto_reconnect');
var collection = db.collection('emails');


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

setInterval(function(){
        getEmails(1);
        getEmails(2);

    },2500);


    function openInbox(imap,cb) {
        imap.openBox('INBOX', true, cb);
    }

    function getEmails(archiveAccountId){
        var emails = [];

        isArchiveInProc(archiveAccountId,function(inProcFlag){

            //get out if we are already processing this archive
            if(inProcFlag){
                console.log("Already running archive: " + archiveAccountId);
                return;
            }

            setArchiveInProcFlag(archiveAccountId,true);

            db.collection('archiveAccounts').findOne({_id:archiveAccountId},function(err,archAccount){

                console.log(archAccount.userName,archAccount.password,archAccount.host,archAccount.port);

                var imap = new Imap({
                    user: archAccount.userName,
                    password: archAccount.password,
                    host: archAccount.host,
                    port: archAccount.port,
                    tls: true,
                    tlsOptions: { rejectUnauthorized: false }
                });

                imap.once('ready', function() {
                    var buffer = '';

                    openInbox(imap,function(err, box) {
                        console.log(err);
                        if (err) throw err;
                        var startUID,topUID;

                        if(!archAccount.maxUID)archAccount.maxUID = 1;

                        topUID = Math.min(box.uidnext,(archAccount.maxUID < 1 ? 1 : archAccount.maxUID+50) );
                        startUID = ((archAccount.maxUID < 1 ? 1 : archAccount.maxUID));

                        console.log(startUID + ':' + topUID);

                        imap.search([ 'ALL', ['UID', startUID + ':' + topUID ]], function(err, results) {

                            if(results && results.length > 0){

                                console.log(err);

                                if (err) throw err;

                                var f = imap.fetch(results, { bodies: '' });
                                f.on('message', function(msg, seqno) {
                                    var props = {};

                                    var prefix = '(#' + seqno + ') ';
                                    msg.once('body', function(stream, info) {

                                        buffer = '';

                                        stream.on('data', function(chunk) {
                                            buffer += chunk.toString('utf8');
                                        });

                                        stream.once('end', function() {
                                            stream.removeAllListeners();
                                        });

                                    });

                                    msg.once('attributes', function(attrs) {
                                        props = attrs;
                                        //console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
                                    });

                                    msg.once('end', function() {
                                        emails.push({archiveAccountId:archiveAccountId,emailProps:props,emailSeq:seqno,emailBody:buffer});
                                    });

                                });

                                f.once('error', function(err) {
                                    console.log('Fetch error: ' + err);
                                    imap.end();
                                });

                                f.once('end', function() {
                                    console.log('Done fetching all messages!');
                                    imap.end();

                                    console.log(emails);

                                    updateMaxUidFromEmails(archiveAccountId,emails);
                                    parseEmail(emails,0);

                                });

                            }else{

                                imap.end();

                                if(archAccount.maxUID < box.uidnext){
                                    console.log('UID GAP!!!, setting new max id');
                                    setMaxUid(1,archAccount.maxUID+50);
                                }else{
                                    console.log('Imap Account Up To Date');
                                }

                            }

                        });
                    });
                });

                imap.once('error', function(err) {
                    imap.end();
                    console.log(err);
                });

                imap.once('end', function() {
                    console.log('Connection ended');
                    setArchiveInProcFlag(archiveAccountId,false);
                });

                imap.connect();

            });

        });

    }

    function updateMaxUidFromEmails(archiveAccountID,emails){
        var max = 0;
        for(var x=0;x<emails.length;x++){
            max = Math.max(emails[x].emailProps.uid,max);
        }

        setMaxUid(archiveAccountID,max+1);

    }

    function setMaxUid(archiveAccountID,newUID){
        console.log("Updating maxUID: " + newUID, archiveAccountID );
        db.collection('archiveAccounts').update({_id:archiveAccountID},{$set:{maxUID:newUID}})
    }

    function setArchiveInProcFlag(archiveAccountID,inFlag){

        db.collection('archiveAccounts').update({_id:archiveAccountID},{$set:{inProcFlag:inFlag,inProcDate:(inFlag?(new Date()):null)}});

    }

    function isArchiveInProc(archiveAccountID,cb){

        db.collection('archiveAccounts').findOne({_id:archiveAccountID},
            function(err,item){
                console.log(archiveAccountID , item.inProcFlag);
                cb(item.inProcFlag);
            }
        );

    }

    function parseEmail(emails,index){

        var mailparser = new MailParser();

        if(index < emails.length){

            mailparser.once("end", function(mail_object){
                //console.log("From:", mail_object.from); //[{address:'sender@example.com',name:'Sender Name'}]

                if(mail_object.attachments && mail_object.attachments.length > 0 ){

                    //console.log("Attachments: " + mail_object.attachments.length)
                }

                mail_object.archiveAccountId = emails[index].archiveAccountId;
                mail_object._rawBody = emails[index].emailBody;
                mail_object._emailSeq = emails[index].emailSeq;
                mail_object._emailProps = emails[index].emailProps;
                collection.insert(mail_object);

                parseEmail(emails,index+1);

            });

            mailparser.write(emails[index].emailBody);
            mailparser.end();

        }
    }


    // Setup 404 Route

    app.get('*', function(req, res) {
        res.send(404, 'File not found.');
    });

    // Start Server

    app.listen(1221);
    console.log('Listening on Port 1221.');

//}