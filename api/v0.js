var request = require('request');
var fs = require('fs');
var express = require('express');
var mongo = require('mongoskin');
var db = mongo.db('localhost:27017/emailArch?auto_reconnect');
var archiveAccountsCollection = db.collection('archiveAccounts');
var emailsCollection = db.collection('emails');
var apiVersionPrefix = "v0";

var BSON = mongo.BSONPure;

exports.init = function(app){

    app.get( '/api/' + apiVersionPrefix + '/archAccounts',getArchiveAccounts);

    app.get( '/api/' + apiVersionPrefix + '/archAccounts/:id',getArchiveAccounts);

    app.get( '/api/' + apiVersionPrefix + '/archAccounts/:id/search',searchArchive);
}

var getArchiveAccounts = function(req,res){

    var query = {accountId:BSON.ObjectID(req.session.user)};
    if(req.params.id)query = {_id: new BSON.ObjectID(req.params.id)};

    console.log(query);

    if(query._id){
        archiveAccountsCollection.findOne(query,function(err,items){
            //console.log(items);
            res.json(items);
        });
    }else{
        archiveAccountsCollection.find(query).toArray(function(err,items){
            //console.log(items);
            res.json(items);
        });
    }

}

var searchArchive = function(req,res){

    var query = {archiveAccountId: new BSON.ObjectID(req.params.id),
            $or:[
                {"headers.from":{$regex: ".*" + req.query.searchtxt +  ".*",$options:'i'}},
                {"headers.subject":{$regex:  ".*" + req.query.searchtxt +  ".*",$options:'i'}}//,
                //{"headers.from":{$regex: req.query.searchtxt,$options:'i'}}
            ]
    };

    console.log(query);

    emailsCollection.find(query,{headers:1,_emailProps:1},{sort:{"_emailProps.date":-1}}).toArray(function(err,items){
        //console.log(items);
        console.log("Search Done:",query,err);
        res.json(items);
    });

}
