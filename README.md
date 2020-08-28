# Projet-Transversal-I
Place to put code &amp; stuff

The code on this repo has the start of an LSA algorithm in NodeJS. However it is honetly quite shit, as all the data is stored in an SQL database. This means that when adding content, that the recalculation of word scores in quite time consuming. Using something like Redis may have been better.

Final solution was to just use ElasticSearch, which is infinitely better and quite an amazing tool regardless.

The code for PT1 is on this other repo: https://github.com/RizzoLuca/HubbleProjectTransversal1
