const http = require("http");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, 'credentialsDontPost/.env') }) 
const fs = require("fs");
const express = require("express"); /* Accessing express module */
const app = express(); /* app is a request handler function */
const bodyParser = require("body-parser"); 
const fetch = require("node-fetch");
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
const { MongoClient, ServerApiVersion } = require('mongodb');

let totalPokemon = 1015;

let args = process.argv;
let portNumber;
if(args[2]){
	portNumber = args[2];
}else{
	portNumber = 5000;
}
const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;

const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};
const uri = `mongodb+srv://${userName}:${password}@cluster0.w2moajl.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


app.use(bodyParser.urlencoded({extended:false}));

app.get("/", (request, response) => {
	response.render('index.ejs');
});

app.get("/start", (request, response) => {
	response.render('start.ejs');
});

app.post("/start", async(request, response) => {
	try{
		await client.connect();
		const { name, age, hometown, trainerinfo } = request.body;
		let app = {name: name, age: age, hometown: hometown, extrainfo: trainerinfo, pokemonSearches: 0};

		await insertTrainer(client, databaseAndCollection, app);

		const finishedVars = {
			name: name,
			age: age,
			hometown: hometown,
			trainerinfo: trainerinfo,
		};
		response.render('processStart.ejs', finishedVars);
		response.end();

	} catch(e){
		response.end(e.message || e.toString());
	} finally{
		await client.close();
	}
});

app.get("/generate", (request, response) => {
	response.render('generate.ejs');
});


app.post("/generate", async(request, response) => {
	try{
		await client.connect();
		const { name } = request.body;

		let filter = {name: name};
		const res = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .findOne(filter);

		if (!res) {
			console.log(`No account was found with this name`);
		}
		
		await increaseByOne(client, databaseAndCollection, name);

		let promise = getPokemon(random(1, totalPokemon));
		promise.then(
			(result) => {
				const finishedVars = {
					name: res.name,
					pokemon: result
				};
				response.render('processGenerate.ejs', finishedVars);
				response.end();
			},
			(error) => {
				console.log(error);
			}
		);
		
	} catch(e){
		response.end(e.message || e.toString());
	} finally{
		await client.close();
	}
});
function getPokemon(id){
	let promise = new Promise(function (resolve, reject) {
		fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
		.then(response => response.json())
		.then(function(data){
			if(data.name){
				resolve(data.name);
			}else{
				reject("Failure");
			}
		});
	});
	return promise;
}






app.get("/stats", (request, response) => {
	response.render('stats.ejs');
});

app.post("/stats", async(request, response) => {
	try{
		await client.connect();
		const { name } = request.body;

		let filter = {name: name};
		const res = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .findOne(filter);

		if (!res) {
			console.log(`No account was found with this name`);
		}

		const finishedVars = {
			name: name,
			statTotal: res.pokemonSearches
		};
		response.render('processStats.ejs', finishedVars);
		response.end();
	} catch(e){
		response.end(e.message || e.toString());
	} finally{
		await client.close();
	}
});

function random(min, max) { // min and max included 
	return Math.floor(Math.random() * (max - min + 1) + min)
}


app.listen(portNumber);
process.stdin.setEncoding("utf8"); /* encoding */
process.stdin.on('readable', () => {  /* on equivalent to addEventListener */
	let dataInput;
	while((dataInput = process.stdin.read()) !== null) {
		if (dataInput !== null) {
			let command = dataInput.trim();
			if (command === "stop") {
				console.log("Shutting down the server");
				process.exit(0);  /* exiting */
			}else {
				/* After invalid command, we cannot type anything else */
				console.log(`Invalid command: ${command}`);
			}
		}
		process.stdout.write("Type stop to shutdown the server: ");
	}
});

async function insertTrainer(client, databaseAndCollection, newApp) {
    await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newApp);
}

async function increaseByOne(client, databaseAndCollection, name){
	await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).updateOne({"name": name}, {$inc: {pokemonSearches: 1}})
}

console.log(`To access server: http://localhost:${portNumber}`);
process.stdout.write("Type stop to shutdown the server: ");
