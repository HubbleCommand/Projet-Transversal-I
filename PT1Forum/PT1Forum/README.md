# PT1Forum
*Semantics Code*
This folder contains most of the semantic analysis code used in the project.

Semantic analysis is done when publishing comments and discussions.

It uses the LSA/LSI algorithm, meaning it uses the U matrix of the SVD decomposition. This decomposition is applied to a Discussion-to-'Key Word count' matrix, that is recuperated from a database.

**Library Dependencies for Semantic Analysis**

[Sync-MySQL](https://www.npmjs.com/package/sync-sql) : A library that can do synchrounous MySQL queries. This is used to make synchronous queries, making the code a little more readable. However after the switch to transaction-based sql queries for the numerous inserts of words and word-to-discussion-links, it is no longer necessary.

[Jama](https://www.npmjs.com/package/jama): A math library for Matrices. It does all the heavy lifting

**General Library Dependencies**

[express](https://www.npmjs.com/package/express) : For routing.
[http](https://www.npmjs.com/package/http) : I honestly forget why I use this.
[mysql](https://www.npmjs.com/search?q=mysql) : To perform asynchronous sql queries.
[body-parser](https://www.npmjs.com/package/body-parser) : To easily get request parameters.
