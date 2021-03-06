'use strict';
var http = require('http');
var express = require('express');
var mysql = require('mysql');
var bodyParser = require('body-parser');
var jama = require('jama');                 //used for SVD calculation
var mysql_sync = require('sync-mysql');     //used for synchronous for-loop sql queries

//Semantic Specific
function TFIDF(Nij, Nstarj, D, Di) { return ((Nij / Nstarj) * Math.log(D / Di)); }
function Words(text) {
    console.log("Here is the text: " + text);
    allwords = text.toLowerCase()
    allwords = allwords.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    allwords = allwords.replace(/\s{2,}/g, " ");
    allwords = allwords.split(" ");
    console.log(allwords);
    return allwords;
}

function Unique_Words(text) {
    var unique_words = [];
    allwords = Words(text);
    for (word in allwords) {
        if (unique_words.includes(allwords[word])) {
            console.log(allwords[word] + " already exists in map");
        }
        else {
            console.log(allwords[word] + " does not exist, adding");
            unique_words.push(allwords[word]);
        }
    }
    console.log(unique_words);
    return unique_words;
}

function Unique_Words_Occurances(text) {
    var unique_words_occurances = new Map();
    allwords = Words(text);
    for (word in allwords) {
        if (unique_words_occurances.has(word)) {
            console.log(allwords[word] + " already exists in map");
            var occurances_current = unique_words.get(word);
            unique_words_occurances.set(word, (occurances_current + 1));
        }
        else { unique_words_occurances.set(word, 1); }
    }
    console.log(unique_words_occurances);
    return unique_words_occurances;
}

function makeSavepointName(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < length; i++) { text += possible.charAt(Math.floor(Math.random() * possible.length)); }
    return text;
}

function HandleError(error, savepoint_name) {
    if (error) { con_sync.query("ROLLBACK TO " + savepoint_name) }
    else { con_sync.query("COMMIT"); }
}
//

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extend: true }));

var port = 3000;

let con = mysql.createConnection({
    
});

con.connect(function (err) {
    if (err) throw err;
    console.log('Async MySQL connected');
});

var con_sync = new mysql_sync({
    
});

app.get('/text', function (req, res) { res.sendFile(__dirname + '/publish.html'); })

//cannot use app.get or app.post as the following needs to: get data from req, do GET requests, do POST requests
app.all('/publishDiscussion', function (req, res) {
    var savepoint_name = "publishDiscussion" + makeSavepointName(10);
    con_sync.query("SAVEPOINT " + savepoint_name);      //set database savepoint
    var error = false;

    //data
    var userPseudo = req.query.user_id;
    var title = req.query.title;
    var text = req.query.text;
    var unique_words_with_occurances = Unique_Words_Occurances(text);

    //Insert discussion
    con.query('INSERT INTO `Discussion`(user_id,titre,texte) values(?,?,?)', [req.query.user_id, req.query.title, req.query.root], function (error, results, fields) {
        if (errorCP) {
            console.log("Error: " + errorCP.message);
        }
        else {
            //insert words
            for (var word in unique_words_with_occurances) {
                try {
                    con_sync.query('INSERT INTO `Mot-Discussion`(id_discussion, mot_id, occurances) VALUES(?,?,?)', [discussion_id, word_id, occurances]);
                }
                catch (e) {
                    //undo recent inserts in all tables
                    //undo everything in database snapshot
                }
            }
        }
    });

    //Handle error by either rolling back to savepoint or commiting savepoint
    HandleError(error, savepoint_name);
});

app.all('/publishComment', function (req, res) {
    var savepoint_name = "publishDiscussion" + makeSavepointName(10);
    con_sync.query("SAVEPOINT " + savepoint_name);      //set database savepoint
    var error = false;

    ///Get comment attributes and insert them
    var user_id = req.query.pseudo;                                             //get user id
    var discussion_id = req.query.id_discussion;                                //get discussion id
    var comment_text = req.query.text;                                          //get text
    var unique_words = Unique_Words(comment_text);                              //get unique words
    var unique_words_with_occurances = Unique_Words_Occurances(comment_text);   //get unique words and their occurances

    try { con_sync.query('INSERT INTO Commentaire(user_id, text, discussion_id) VALUES(?,?,?)', [user_id, comment_text, discussion_id]); }
    catch (except) { console.log("Unexpected error!  " + except + " " + except.message) }

    ///Insert words into Mot
    for (word in unique_words) {
        try { con_sync.query('INSERT INTO Mot(mod) VALUES(?)', [word]); }
        catch (except) {
            if (except.message = "ERR_DUP_ENTRY") {
                console.log("The word already exists, continuing...")
                continue
            }
            else { console.log("Unexpected error!    " + except + " " + except.message) }
        }
    }

    ///Insert word links into Mot-Discussion, with occurances
    var query = "BEGIN TRAN; INSERT INTO `Mot-Discussion` (id_discussion, mot_id, occurances, poid_svd) VALUES "
    for (word in unique_words) {    //add elements to query
        var word_id = Number(con_sync.query('SELECT mot_id FROM Mot where mot=?', word)); //get id of word
        query += "('" + Number(discussion_id) + "', '" + Number(word_id) + "', '" + Number(occurances) + "', '0'),";    //insert word-discussion relation
    }
    query += " ON DUPLICATE KEY UPDATE occurances = occurances + VALUES(occurances); END TRAN;"   //if entry exists, add occurances
    try { con_sync.query(query); }
    catch (e) { console.log("Error inserting into `Mot-Discussion` !"); }

    ///Semantic Analysis
    var number_of_words = Number(con_sync.query('SELECT COUNT(*) FROM Mot'));                   //get number of words
    var counter_word = 0;
    var number_of_discussions = Number(con_sync.query('SELECT COUNT(*) FROM Discussion'));      //get number of discussions
    var counter_discussion = 0;
    occurance_matrix = new Jama.matrix(number_of_words, number_of_discussions, 0);              //initialize new matrix

    //for each word, get all of the occurrances from Mot-Discussion
    for (counter_word = 0; counter_word <= number_of_words; counter_word++) {
        counter_word = 0;
        for (counter_discussion; counter_discussion <= number_of_discussions; counter_discussion = 0) {
            var occurances = Number(con_sync.query('SELECT occurances FROM `Mot-Discussion` WHERE mot_id=?,id_discussion=?', []))
            occurance_matrix.set(counter_word, counter_discussion, occurances);
        }
    }

    counter_discussion = 0; counter_word = 0;                                                   //set counters to zero    
    var svdWeights = occurance_matrix.svd().getU();                                             //calculate SVD of occurance matrix

    //update poid_svd values in Mot-Discussion table
    for (counter_word = 0; counter_word <= number_of_words; counter_word++) {
        counter_word = 0;
        for (counter_discussion; counter_discussion <= number_of_discussions; counter_discussion = 0) {
            con_sync('UPDATE `Mot-Discussion` SET poid_svd=? WHERE id_discussion=?,mot_id=?', [svdWeights.get(counter_word, counter_discussion), counter_discussion, counter_word]);
        }
    }

    ///Handle error with some inserts by deleting EVERY recent insert
    HandleError(error, savepoint_name);
});

app.all('/searchDiscussion', function (req, res) {
    var tags = req.query.tags;
    var number_of_discussions = con_sync.query('SELECT COUNT(*) FROM Discussion');      //gets the number of discussions
    total_similarity_matrix = new Jama.matrix(tags.length, number_of_discussions);      //variable stores the first 100 results
    for (var tag in tags) {
        //NEED TO REDO QUERY NEED JOINS n shit
        var discussion = con_sync.query('SELECT discussion_id, poid_svd FROM Discussion,`Mot-Discussion`,Mot WHERE mot=? ORDER BY poid_svd desc LIMIT 30', tag);
        total_similarity_matrix.set();
    }

    var discussion_highest_relation = new Array(number_of_discussions);    //stores the sum of the svd weights for supplied tags for each discussion
    discussion_highest_relation.fill(0);
    for (var i = 0; i <= number_of_discussions; i++) {
        for (var j = 0; j <= tags.length; j++) {
            discussion_highest_relation[i] += total_similarity_matrix.get(i, j);
        }
    }
    //...
});

app.listen(port, function () {
    console.log('LSAv3 listening on port ' + port)

    var array = new Array(10).fill(0);
    for (var i = 0; i < 10; i++) {
        console.log(array[i]);
    }

    var a = [[1, 2, 3], [3, 2, 1]];

    var a_matrix = new jama.Matrix(a);
    console.log("Matrix A: " + a_matrix.getArray());
    console.log("Matrix A SVD U: " + a_matrix.svd().getU().getArray());

    var matrix = new jama.Matrix(3, 3, 0);
    console.log("Matrix: " + matrix.getArray());
});
