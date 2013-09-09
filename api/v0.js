var request = require('request');
var fs = require('fs');
var express = require('express');
var mongo = require('mongoskin');
var db = mongo.db('localhost:27017/emailArch?auto_reconnect');
var archiveAccounts = db.collection('archiveAccounts');
var apiVersionPrefix = "v0";

exports.init = function(app){

    app.get( '/api/' + apiVersionPrefix + '/archAccounts',getArchiveAccounts);

}

var getArchiveAccounts = function(req,res){

    var query = {};
    if(req.params.id)query._id = req.params.id;

    archiveAccounts.find({}).toArray(function(err,items){
        //console.log(items);
        res.json(items);
    });

}
