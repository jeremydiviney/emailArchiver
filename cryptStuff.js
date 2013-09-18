var crypto = require("crypto");

var cryptoKey = '87r*g23UN7fs$A-A&^3nb';

exports.encryptData = function(plainData){

    var cipher = crypto.createCipher('aes256', cryptoKey);
    return cipher.update(plainData, 'binary', 'hex') + cipher.final('hex');

};

exports.decryptData = function(enctryptedData){

    var decipher = crypto.createDecipher('aes256', cryptoKey);
    return decipher.update(enctryptedData, 'hex', 'binary') +  decipher.final('binary');

} ;
