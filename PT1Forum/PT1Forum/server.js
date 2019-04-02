'use strict';
var http = require('http');
var express = require('express');
var mysql = require('mysql');
var bodyParser = require('body-parser');
var jama = require('jama');                 //used for SVD calculation
var mysql_sync = require('sync-mysql');     //used for synchronous for-loop sql queries

//Semantic Specific
function TFIDF(Nij, Nstarj, D, Di) {return ((Nij / Nstarj) * Math.log(D / Di));}
function Words(text) {
    console.log("Here is the text: " + text);
    allwords = text.toLowerCase()
    allwords = allwords.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    allwords = allwords.replace(/\s{2,}/g, " ");
    allwords = allwords.split(" ");
    console.log(allwords);
    return allwords;}

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
    return unique_words;}

function Unique_Words_Occurances(text) {
    var unique_words_occurances = new Map();
    allwords = Words(text);
    for (word in allwords) {
        if (unique_words_occurances.has(word)) {
            console.log(allwords[word] + " already exists in map");
            var occurances_current = unique_words.get(word);
            unique_words_occurances.set(word, (occurances_current + 1));
        }
        else {
            unique_words_occurances.set(word, 1);
        }
    }
    console.log(unique_words_occurances);
    return unique_words_occurances;}
//

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extend: true }));

var port = 3000;

let con = mysql.createConnection({
    host: "10.194.69.15",
    user: "A8",
    password: "KoXeOJz0KiV4lXit",
    database: "A8"});

con.connect(function (err) {
    if (err) throw err;
    console.log('Async MySQL connected');});

var con_sync = new mysql_sync({
    host: "10.194.69.15",
    user: "A8",
    password: "KoXeOJz0KiV4lXit",
    database: "A8"});

app.get('/text', function (req, res) {res.sendFile(__dirname + '/publish.html');})

//cannot use app.get or app.post as the following needs to:
    //get data from req, do GET requests, do POST requests
app.all('/publishDiscussion', function (req, res) {
    //get database snapshot
    var userPseudo  = req.query.user_id;
    var title       = req.query.title;
    var text = req.query.text;
    var unique_words_with_occurances = Unique_Words_Occurances(text);
    

    //Insert comment
    con.query('INSERT INTO `Discussion`(user_id,titre,texte) values(?,?,?)', [req.query.user_id, req.query.title, req.query.root], function (error, results, fields) {
        if (errorCP) {
            console.log("Error: " + errorCP.message);
        }
        else {
            //insert words
            foreach(word in unique_words_with_occurances) {
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
});

app.all('/publishComment', function (req, res) {
///Get comment attributes and insert them
    var user_id = req.query.pseudo;                                             //get user id
    var discussion_id = req.query.id_discussion;                                //get discussion id
    var comment_text = req.query.text;                                          //get text
    var unique_words = Unique_Words(comment_text);                              //get unique words
    var unique_words_woth_occurances = Unique_Words_Occurances(comment_text);   //get unique words and their occurances
    
    var current_timestamp = Number(con_sync.query("SELECT CURRENT_TIMESTAMP AS 'Current timestamp'"));              //timestamp to delete all inserts if one fails
    try {
        con_sync.query('INSERT INTO Commentaire(pseudo, text, ...) VALUES(?,?,?)', [user_id, comment_text, ...]);   //insert comment
    }
    catch (except) {
        console.log("Unexpected error!  " + except + " " + except.message)
    }
    
///Insert words into Mot
    for (word in unique_words) {
        try {con_sync.query('INSERT INTO Mot(mod) VALUES(?)', [word]);}
        catch (except) {
            if (except.message = "ERR_DUP_ENTRY") {
                console.log("The word already exists, continuing...")
                continue}
            else {console.log("Unexpected error!    " + except + " " + except.message)      }}}

///Insert word links into Mot-Discussion, with occurances
    for (word in unique_words) {
        try {
            var word_id = Number(con_sync.query('SELECT mot_id FROM Mot where mot=?', word)); //get id of word
            con_sync.query('INSERT INTO `Mot-Discussion`(id_discussion, mot_id, occurances) VALUES(?,?,?)', [discussion_id, word_id, occurances]);
        }
        catch (e) {
            if (e.message = "ERR_DUP_ENTRY") {
                console.log("This link between word and discussion exists already, updating value and continuing");
                try {
                    var occurances_existing = Number(con_sync.query('SELECT occurances FROM `Mot-Discussion` WHERE', []));

                }
                catch (e) {

                }
            }
        }
    }

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


});

app.all('/searchDiscussion', function (req, res) {
    //one key word
    number_of_results = req.query.number;
    weight = req.query.similarity;
    tag = req.query.tag;
    //asc_or_desc_weight = req.query.asc_or_desc;
    con.query('SELECT discussion_id FROM Discussion,`Mot-Discussion` WHERE ORDER BY poid_svd desc LIMIT 30')


    //multiple key words
    matrix_index_to_id_array = [];
    total_similarity_matrix = new Jama.matrix();
    tags = req.query.tags;
    for (var tag in tags) {
        //NEED TO REDO QUERY NEED JOINS n shit
        var discussion = con.query('SELECT discussion_id, poid_svd FROM Discussion,`Mot-Discussion`,Mot WHERE mot=? ORDER BY poid_svd desc LIMIT 30', tag);
        total
    }



});

app.all('/publishComment', function (req, res) {
    console.log("Body: " + JSON.stringify(req.body));


///Algo
    //get discussion id of comment
    //get comment text
    

    //extract comment text
    text = req.query.text;
    console.log("Here is the text: " + text);
    allwords = text.toLowerCase()
    allwords = allwords.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    allwords = allwords.replace(/\s{2,}/g, " ");
    allwords = allwords.split(" ");
    console.log(allwords);
    var uniquewords = [];

    for (word in allwords) {
        if (uniquewords.includes(allwords[word])) {
            console.log(allwords[word] + " already exists in map");
        }
        else {
            console.log(allwords[word] + " does not exist, adding");
            uniquewords.push(allwords[word]);
        }
    }
    console.log(uniquewords);

    ///NEED NESTED QUERIES AS THEY ARE OTHERWISE ASYNCHRONOUS
    //need to INSERT the comment (userid, texte, date)
    con.query('INSERT INTO `Discussion-Racine`(user_id,titre,texte) values(?,?,?)', [req.query.user_id, req.query.title, req.query.root], function (errorCP, resultsCP, fieldsCP) {
        if (errorCP) {
            console.log("Error: " + errorCP.message);
        }
        else {
            //need to INSERT the words (mot)
            for (word in uniquewords) {
                //Synchronous Query
                console.log("Word: " + uniquewords[word]);
                var value = [String(uniquewords[word])];
                console.log("Word: " + value);
                var can_continue = true;
                try {
                    con_sync.query('INSERT INTO `Mot` (mot) values(?)', value)
                }
                catch (err) {
                    console.log("Error inserting word: " + err.message);
                    can_continue = false;
                }
                //need to INSERT foreign keys (mot-commentaire)
                if (can_continue) {
                    try {
                        con_sync.query('INSERT INTO `Mot-Discussion` (mot) values(?) SELECT SCOPE_IDENTITY()', value);
                    }
                    catch (err) {
                        console.log("Error inserting word-root: " + err.message);
                    }
                }
            }

            //V2 for calculating LSA/LSI
            var m = con_sync.query('SELECT COUNT(*) FROM Discussion');  //find number of discussions M
            var n = con_sync.query('SELECT COUNT(*) FROM Mot');         //find number of words N
            var occurance_matrix = new jama.Matrix(m, n, 0);              //create M * N jama.Matrix
            //then can use this below, and use Matrix.set(i,j, val) to update Matrix

            con.query('SELECT * FROM Mot-Discussion', (errorMDD, resultsMDD) => {
                if (errorMDD) { }
                else {
                    //optimized construct matrix beforehand with Jama
                    //for every element in sql response, update value in matrix
                    for (var index = 0; index < resultsMDD.length; index++) {
                        occurance_matrix.set(
                            //is +1 needed on indexes?
                            //nope! index starts at 0
                            resultsMDD[index].comment_id,
                            resultsMDD[index].mot_id,
                            resultsMDD[index].occurances);
                    }

                    //pre-weigh occurances done here with TF-IDF
                    //tfidf = ;
                    //Algo for doing TFIDF
                    var wighted_occurance_matrix = new jama.Matrix(m, n, 0);
                    for (var i = 0; i < occurance_matrix.length; i++) {
                        for (var j = 0; i < occurance_matrix[i].length; i++) {

                            var Nij = occurance_matrix.get(i, j);

                            //count number of words -> non-zero entries
                            for (var q = 0; q <= occurance_matrix.getRowDimension(); i++) {

                            }

                            //calculate TFIDF here with method
                            var Nstarj = occurance_matrix;
                            var D;
                            var Di;
                            var tfidf = TFIDF(Nij, Nstarj, D, Di);
                        }
                    }

                    //Calculate SVD
                    var lsi = occurance_matrix.svd();
                    var svd = lsi.getU();

                    //Need to do a synchronous update to all 
                    //values of the Weight parameter in Mot-Discussion
                    var discussions_to_update = svd.getRowDimension();
                    var number_of_words = svd.getColumnDimension();
                    for (var i = 0; i < discussions_to_update; i++) {
                        for (var j = 0; j < number_of_words; j++) {
                            try {
                                con_sync('UPDATE Mot-Discussion SET weight=? WHERE discussion_id=?, mot_id=?', [svd.get(i, j), i, j])
                            }
                            catch (err) {
                                console.log("Error updating weight for Word: " + j + ", and for Discussion: " + i)
                            }
                        }
                    }
                }
            });

        }   //end of root comment IF
    });     //end insert root comment
});         //end of comment publish

app.listen(port, function () {
    console.log('LSAv3 listening on port ' + port)

    var a = [[1, 2, 3],[3, 2, 1]];

    var a_matrix = new jama.Matrix(a);
    console.log("Matrix A: " + a_matrix.getArray());
    console.log("Matrix A SVD U: " + a_matrix.svd().getU().getArray());

    var matrix = new jama.Matrix(3, 3, 0);
    console.log("Matrix: " + matrix.getArray());
});
