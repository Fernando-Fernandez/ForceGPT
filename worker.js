const { connectQueue } = require('./redis-config');
const { QueryProcessor } = require("./task/query-processor");
const { initializeSalesforceConnection } = require("./salesforce/salesforce");
const fs = require('fs');
const {db} = require("./db");

const queueName = 'request-queue';
const queue = connectQueue(queueName);

console.log('Queue connected: ' +queueName);

const { ChatOpenAI } = require("langchain/chat_models/openai");
const model = new ChatOpenAI({ modelName: "gpt-3.5-turbo", openAIApiKey: process.env.OPENAI_API_KEY, temperature: 0.9 });

console.log('model configured!');

queue.process(
    (job, done) => {
        console.log('Message: ' +JSON.stringify(job.data));
        jobHandler(job, done);
    }
);

// TO DO: Fix redis job remaining in queue issue
async function jobHandler(job, db) {
    //const jsonObj = JSON.parse(fs.readFileSync(`${process.cwd()}/request-store.json`, 'utf8'));
   try {
    console.log('2');
    console.log(job);
        const requestData = db.get(job.data.userId);
        console.log(requestData);
        if (requestData) {
            const conn = initializeSalesforceConnection(requestData.instanceUrl, requestData.sessionId);
            await new QueryProcessor(job.data.userId, model, db)
                                    .setComponentType(requestData.component)
                                    .setConnection(conn)
                                    .setQuery(requestData.text)
                                    .process();
            console.log(`--done--`);
        }
   } catch (e) {
        console.log(e);
    }finally {
        //done();
   }
}

module.exports = {
    jobHandler
}