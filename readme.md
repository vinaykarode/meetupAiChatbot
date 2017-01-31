## Run server locally


1. install localtunnel

	`npm install -g localtunnel`
2. install nodemon to restart server automatically

	`npm install -g nodemon`
3. install required node_modules

	`npm install`
4. run the server using 

	`nodemon index.js`
5. run tunnel

	`lt --port 5000 --subdomain meetupaibot`




## update config.js

6. change `FB_PAGE_TOKEN, FB_VERIFY_TOKEN, API_AI_CLIENT_ACCESS_TOKEN, FB_APP_SECRET` accordingly